import { describe, expect, it } from "vitest";
import { TABLET_IDS } from "@installation/shared";
import {
  claimNextSubmission,
  completeGeneration,
  createSubmissionOnce,
  heartbeat,
  InstallationStore,
  markDisplayed,
  recoverStaleLeases,
  tryAcquireGenerationSlot,
  verifyLocation,
} from "./index.ts";
import type { LocationConfig } from "@installation/shared";

const GALLERY: LocationConfig = {
  galleryLatitude: 44.8176,
  galleryLongitude: 20.4569,
  radiusMeters: 200,
  maxAccuracyMeters: 500,
};

async function queuedSubmission(
  store: InstallationStore,
  participantId: string,
  index: number,
): Promise<string> {
  verifyLocation(
    store,
    participantId,
    { latitude: 44.8176, longitude: 20.4569, accuracy: 12 },
    GALLERY,
    true,
    store.config.termsVersion,
  );
  const result = await createSubmissionOnce(
    store,
    participantId,
    `A detailed description of the painting, submission number ${String(index).padStart(2, "0")}.`,
  );
  return result.submissionId;
}

function keepTabletsOnline(store: InstallationStore): void {
  for (const tabletId of TABLET_IDS) {
    const tablet = store.tablets.get(tabletId);
    if (tablet?.enabled) heartbeat(store, tabletId, "0.1.0");
  }
}

async function fillTablet(
  store: InstallationStore,
  tabletId: string,
): Promise<string> {
  const claim = await claimNextSubmission(store, tabletId);
  expect(claim.action).toBe("generate");
  if (claim.action !== "generate") throw new Error("expected generate");
  completeGeneration(
    store,
    tabletId,
    claim.submissionId,
    `generated/${claim.submissionId}.webp`,
  );
  markDisplayed(store, tabletId, claim.submissionId);
  return claim.submissionId;
}

describe("nine tablet distribution", () => {
  it("fills nine distinct tablets then replaces the oldest displayed", async () => {
    const store = new InstallationStore(new Date("2026-03-01T10:00:00Z"));
    store.seedDefaultTablets(true);

    for (let i = 1; i <= 9; i += 1) {
      await queuedSubmission(store, `visitor-${i}`, i);
    }

    const assigned = new Map<string, string>();
    for (const tabletId of TABLET_IDS) {
      keepTabletsOnline(store);
      const submissionId = await fillTablet(store, tabletId);
      assigned.set(tabletId, submissionId);
      store.now = new Date(store.now.getTime() + 60_000);
    }

    expect(new Set(assigned.values()).size).toBe(9);
    expect(store.submissions.size).toBe(9);

    const tenth = await queuedSubmission(store, "visitor-10", 10);
    const tenthClaim = await claimNextSubmission(store, "tablet-01");
    expect(tenthClaim).toMatchObject({ action: "generate", submissionId: tenth });

    const stolen = await claimNextSubmission(store, "tablet-09");
    expect(stolen.action).toBe("none");

    completeGeneration(store, "tablet-01", tenth, `generated/${tenth}.webp`);
    markDisplayed(store, "tablet-01", tenth);
    store.now = new Date(store.now.getTime() + 60_000);
    keepTabletsOnline(store);

    const eleventh = await queuedSubmission(store, "visitor-11", 11);
    const eleventhClaim = await claimNextSubmission(store, "tablet-02");
    expect(eleventhClaim).toMatchObject({
      action: "generate",
      submissionId: eleventh,
    });
  });

  it("does not let a fast tablet steal work when it is not eligible", async () => {
    const store = new InstallationStore();
    store.seedDefaultTablets(true);
    await queuedSubmission(store, "visitor-1", 1);

    const fast = await claimNextSubmission(store, "tablet-09");
    expect(fast.action).toBe("none");
    const rightful = await claimNextSubmission(store, "tablet-01");
    expect(rightful.action).toBe("generate");
  });

  it("skips a disabled or offline tablet", async () => {
    const store = new InstallationStore();
    store.seedDefaultTablets(true);
    const tablet01 = store.tablets.get("tablet-01");
    if (tablet01) tablet01.enabled = false;
    await queuedSubmission(store, "visitor-1", 1);

    expect((await claimNextSubmission(store, "tablet-01")).action).toBe("none");
    expect((await claimNextSubmission(store, "tablet-02")).action).toBe("generate");
  });

  it("requeues a stale generation lease and later reassigns a ready image without regenerating", async () => {
    const store = new InstallationStore(new Date("2026-03-01T10:00:00Z"), {
      generationLeaseMinutes: 5,
      readyDisplayLeaseMinutes: 2,
    });
    store.seedDefaultTablets(true);
    await queuedSubmission(store, "visitor-1", 1);

    const claim = await claimNextSubmission(store, "tablet-01");
    expect(claim.action).toBe("generate");
    if (claim.action !== "generate") throw new Error("expected generate");

    store.now = new Date(store.now.getTime() + 6 * 60_000);
    keepTabletsOnline(store);
    recoverStaleLeases(store);
    const row = store.submissions.get(claim.submissionId);
    expect(row?.status).toBe("queued");
    expect(row?.assignedTabletId).toBeNull();

    const again = await claimNextSubmission(store, "tablet-01");
    expect(again.action).toBe("generate");
    if (again.action !== "generate") throw new Error("expected generate");
    completeGeneration(
      store,
      "tablet-01",
      again.submissionId,
      `generated/${again.submissionId}.webp`,
    );

    store.now = new Date(store.now.getTime() + 3 * 60_000);
    keepTabletsOnline(store);
    recoverStaleLeases(store);
    const ready = store.submissions.get(again.submissionId);
    expect(ready?.status).toBe("ready");
    expect(ready?.assignedTabletId).toBeNull();
    expect(ready?.imagePath).toBeTruthy();

    const displayClaim = await claimNextSubmission(store, "tablet-01");
    expect(displayClaim).toMatchObject({
      action: "display",
      submissionId: again.submissionId,
    });
  });

  it("coordinates global generation pacing", () => {
    const store = new InstallationStore(new Date(), {
      generationMinIntervalSeconds: 13,
    });
    expect(tryAcquireGenerationSlot(store)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(tryAcquireGenerationSlot(store).allowed).toBe(false);
    store.now = new Date(store.now.getTime() + 13_000);
    expect(tryAcquireGenerationSlot(store).allowed).toBe(true);
  });

  it("updates heartbeat presence without exposing visitor data", () => {
    const store = new InstallationStore();
    store.seedDefaultTablets(false);
    heartbeat(store, "tablet-03", "0.1.0");
    expect(store.tablets.get("tablet-03")?.lastSeenAt).toEqual(store.now);
    expect(store.tablets.get("tablet-03")?.appVersion).toBe("0.1.0");
  });
});
