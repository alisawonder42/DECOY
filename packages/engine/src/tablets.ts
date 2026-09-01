import { minutesFrom, type ClaimResult, type Submission, type Tablet } from "./types.ts";
import type { InstallationStore } from "./store.ts";

const ACTIVE_JOB_STATUSES = new Set(["assigned", "generating", "ready"]);

export function recoverStaleLeases(store: InstallationStore): void {
  for (const submission of store.submissions.values()) {
    if (
      (submission.status === "assigned" || submission.status === "generating") &&
      submission.generatedAt === null &&
      submission.leaseExpiresAt !== null &&
      submission.leaseExpiresAt < store.now
    ) {
      if (submission.generationAttempts >= store.config.maxGenerationAttempts) {
        submission.status = "failed";
        submission.lastErrorCode = submission.lastErrorCode ?? "LEASE_EXPIRED";
      } else {
        submission.status = "queued";
      }
      submission.assignedTabletId = null;
      submission.claimedAt = null;
      submission.leaseExpiresAt = null;
    }

    if (
      submission.status === "ready" &&
      submission.leaseExpiresAt !== null &&
      submission.leaseExpiresAt < store.now
    ) {
      submission.assignedTabletId = null;
      submission.claimedAt = null;
      submission.leaseExpiresAt = null;
    }
  }
}

function isOnline(store: InstallationStore, tablet: Tablet): boolean {
  if (!tablet.enabled || tablet.lastSeenAt === null) return false;
  const thresholdMs = store.config.tabletOnlineThresholdSeconds * 1000;
  return store.now.getTime() - tablet.lastSeenAt.getTime() <= thresholdMs;
}

function hasActiveJob(store: InstallationStore, tabletId: string): boolean {
  for (const submission of store.submissions.values()) {
    if (submission.assignedTabletId !== tabletId) continue;
    if (!ACTIVE_JOB_STATUSES.has(submission.status)) continue;
    if (submission.leaseExpiresAt !== null && submission.leaseExpiresAt < store.now) {
      continue;
    }
    return true;
  }
  return false;
}

export function selectEligibleTabletId(store: InstallationStore): string | null {
  const candidates = [...store.tablets.values()].filter(
    (tablet) => isOnline(store, tablet) && !hasActiveJob(store, tablet.id),
  );

  candidates.sort((a, b) => {
    const aEmpty = a.lastDisplayedAt === null ? 0 : 1;
    const bEmpty = b.lastDisplayedAt === null ? 0 : 1;
    if (aEmpty !== bEmpty) return aEmpty - bEmpty;
    if (a.lastDisplayedAt && b.lastDisplayedAt) {
      const byTime = a.lastDisplayedAt.getTime() - b.lastDisplayedAt.getTime();
      if (byTime !== 0) return byTime;
    }
    return a.id.localeCompare(b.id);
  });

  return candidates[0]?.id ?? null;
}

export async function claimNextSubmission(
  store: InstallationStore,
  tabletId: string,
): Promise<ClaimResult> {
  return store.withGlobalLock(() => claimNextSubmissionLocked(store, tabletId));
}

function claimNextSubmissionLocked(
  store: InstallationStore,
  tabletId: string,
): ClaimResult {
  recoverStaleLeases(store);

  const tablet = store.tablets.get(tabletId);
  if (!tablet || !tablet.enabled) {
    return { action: "none" };
  }

  const eligible = selectEligibleTabletId(store);
  if (eligible !== tabletId) {
    return { action: "none" };
  }

  const ready = oldestReadyUnassigned(store);
  if (ready && ready.imagePath) {
    ready.assignedTabletId = tabletId;
    ready.claimedAt = store.now;
    ready.leaseExpiresAt = minutesFrom(
      store.now,
      store.config.readyDisplayLeaseMinutes,
    );
    return {
      action: "display",
      submissionId: ready.id,
      imagePath: ready.imagePath,
    };
  }

  const queued = oldestQueued(store);
  if (!queued) {
    return { action: "none" };
  }

  queued.status = "assigned";
  queued.assignedTabletId = tabletId;
  queued.claimedAt = store.now;
  queued.leaseExpiresAt = minutesFrom(
    store.now,
    store.config.generationLeaseMinutes,
  );
  return { action: "generate", submissionId: queued.id };
}

function oldestReadyUnassigned(store: InstallationStore): Submission | null {
  const rows = [...store.submissions.values()].filter(
    (row) =>
      row.status === "ready" &&
      row.assignedTabletId === null &&
      row.imagePath !== null,
  );
  rows.sort((a, b) => {
    const aGen = a.generatedAt?.getTime() ?? a.createdAt.getTime();
    const bGen = b.generatedAt?.getTime() ?? b.createdAt.getTime();
    if (aGen !== bGen) return aGen - bGen;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return rows[0] ?? null;
}

function oldestQueued(store: InstallationStore): Submission | null {
  const rows = [...store.submissions.values()].filter(
    (row) => row.status === "queued",
  );
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return rows[0] ?? null;
}

export function heartbeat(
  store: InstallationStore,
  tabletId: string,
  appVersion: string,
): void {
  const tablet = store.tablets.get(tabletId);
  if (!tablet || !tablet.enabled) {
    throw new Error("TABLET_DISABLED");
  }
  tablet.lastSeenAt = store.now;
  tablet.appVersion = appVersion;
}

export function beginGeneration(
  store: InstallationStore,
  tabletId: string,
  submissionId: string,
): string {
  const submission = store.submissions.get(submissionId);
  if (!submission || submission.assignedTabletId !== tabletId) {
    throw new Error("NOT_ASSIGNED");
  }
  if (submission.status !== "assigned" && submission.status !== "generating") {
    throw new Error("NOT_ASSIGNED");
  }
  if (submission.status === "assigned") {
    submission.generationAttempts += 1;
  }
  submission.status = "generating";
  submission.generationStartedAt = submission.generationStartedAt ?? store.now;
  return submission.description;
}

export function completeGeneration(
  store: InstallationStore,
  tabletId: string,
  submissionId: string,
  imagePath: string,
): void {
  const submission = store.submissions.get(submissionId);
  if (!submission || submission.assignedTabletId !== tabletId) {
    throw new Error("NOT_ASSIGNED");
  }
  submission.imagePath = imagePath;
  submission.generatedAt = store.now;
  submission.status = "ready";
  submission.lastErrorCode = null;
  submission.leaseExpiresAt = minutesFrom(
    store.now,
    store.config.readyDisplayLeaseMinutes,
  );
}

export function failGeneration(
  store: InstallationStore,
  tabletId: string,
  submissionId: string,
  errorCode: string,
  retryable: boolean,
): void {
  const submission = store.submissions.get(submissionId);
  if (!submission || submission.assignedTabletId !== tabletId) {
    throw new Error("NOT_ASSIGNED");
  }
  if (!retryable || submission.generationAttempts >= store.config.maxGenerationAttempts) {
    submission.status = "failed";
    submission.lastErrorCode = errorCode;
    submission.assignedTabletId = null;
    submission.claimedAt = null;
    submission.leaseExpiresAt = null;
    return;
  }
  submission.lastErrorCode = errorCode;
}

export function markDisplayed(
  store: InstallationStore,
  tabletId: string,
  submissionId: string,
): void {
  const tablet = store.tablets.get(tabletId);
  const submission = store.submissions.get(submissionId);
  if (!tablet || !submission) {
    throw new Error("NOT_ASSIGNED");
  }
  if (submission.status === "displayed" && tablet.currentSubmissionId === submissionId) {
    return;
  }
  if (submission.assignedTabletId !== tabletId || submission.status !== "ready") {
    throw new Error("NOT_READY");
  }
  submission.status = "displayed";
  submission.displayedAt = store.now;
  submission.leaseExpiresAt = null;
  tablet.currentSubmissionId = submissionId;
  tablet.lastDisplayedAt = store.now;
}

export function tryAcquireGenerationSlot(
  store: InstallationStore,
): { allowed: boolean; retryAfterSeconds: number } {
  if (store.generationControl.nextAllowedAt > store.now) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (store.generationControl.nextAllowedAt.getTime() - store.now.getTime()) /
          1000,
      ),
    );
    return { allowed: false, retryAfterSeconds };
  }
  store.generationControl.nextAllowedAt = new Date(
    store.now.getTime() + store.config.generationMinIntervalSeconds * 1000,
  );
  return { allowed: true, retryAfterSeconds: 0 };
}
