import { describe, expect, it } from "vitest";
import type { LocationConfig } from "@installation/shared";
import {
  createSubmissionOnce,
  EngineError,
  InstallationStore,
  participantStatus,
  verifyLocation,
} from "./index.ts";

const GALLERY: LocationConfig = {
  galleryLatitude: 44.8176,
  galleryLongitude: 20.4569,
  radiusMeters: 200,
  maxAccuracyMeters: 500,
};

const INSIDE = {
  latitude: 44.8176,
  longitude: 20.4569,
  accuracy: 15,
};

function readyParticipant(store: InstallationStore, id: string): void {
  verifyLocation(store, id, INSIDE, GALLERY, true, store.config.termsVersion);
}

describe("one-time submission", () => {
  it("allows a prepared participant to submit exactly once", async () => {
    const store = new InstallationStore();
    readyParticipant(store, "p1");
    const first = await createSubmissionOnce(
      store,
      "p1",
      "A detailed description of the painting before me.",
    );
    expect(first.submitted).toBe(true);
    expect(store.submissions.size).toBe(1);
    expect(store.queueSignals).toHaveLength(1);

    await expect(
      createSubmissionOnce(
        store,
        "p1",
        "A second detailed description of the same painting.",
      ),
    ).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });
    expect(store.submissions.size).toBe(1);

    const status = participantStatus(store, "p1");
    expect(status.submitted).toBe(true);
  });

  it("rejects a second concurrent submit and keeps a single row", async () => {
    const store = new InstallationStore();
    readyParticipant(store, "p-race");
    const description = "A detailed description of the painting before me.";
    const results = await Promise.allSettled([
      createSubmissionOnce(store, "p-race", description),
      createSubmissionOnce(store, "p-race", description),
    ]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(store.submissions.size).toBe(1);
    expect([...store.submissions.values()][0]?.participantId).toBe("p-race");
  });

  it("does not store coordinates on the participant session", () => {
    const store = new InstallationStore();
    readyParticipant(store, "p-geo");
    const session = store.participants.get("p-geo");
    expect(session).toBeTruthy();
    expect(session).not.toHaveProperty("latitude");
    expect(session).not.toHaveProperty("longitude");
    expect(session).not.toHaveProperty("accuracy");
    expect(Object.keys(session ?? {}).sort()).toEqual(
      [
        "createdAt",
        "locationVerifiedAt",
        "participantId",
        "submissionId",
        "submittedAt",
        "termsAcceptedAt",
        "termsVersion",
      ].sort(),
    );
  });

  it("requires recent location verification", async () => {
    const store = new InstallationStore(new Date("2026-03-01T12:00:00Z"));
    readyParticipant(store, "p-exp");
    store.now = new Date("2026-03-01T14:00:00Z");
    await expect(
      createSubmissionOnce(
        store,
        "p-exp",
        "A detailed description of the painting before me.",
      ),
    ).rejects.toBeInstanceOf(EngineError);
  });

  it("enforces daily capacity before creating a submission", async () => {
    const store = new InstallationStore(new Date(), { maxDailySubmissions: 1 });
    readyParticipant(store, "p-a");
    readyParticipant(store, "p-b");
    await createSubmissionOnce(
      store,
      "p-a",
      "A detailed description of the painting before me.",
    );
    await expect(
      createSubmissionOnce(
        store,
        "p-b",
        "Another detailed description of the painting before me.",
      ),
    ).rejects.toMatchObject({ code: "DAILY_CAPACITY_REACHED" });
    expect(store.submissions.size).toBe(1);
  });

  it("rejects descriptions that are too short or too long", async () => {
    const store = new InstallationStore();
    readyParticipant(store, "p-len");
    await expect(createSubmissionOnce(store, "p-len", "too short")).rejects.toMatchObject(
      { code: "DESCRIPTION_TOO_SHORT" },
    );
    await expect(
      createSubmissionOnce(store, "p-len", "x".repeat(2001)),
    ).rejects.toMatchObject({ code: "DESCRIPTION_TOO_LONG" });
  });
});
