import {
  normalizeDescription,
  unicodeLength,
  verifyLocationReading,
  type LocationConfig,
  type LocationInput,
  type ParticipantStatus,
} from "@installation/shared";
import { InstallationStore } from "./store.ts";
import { EngineError, startOfUtcDay, type Submission } from "./types.ts";

export function participantStatus(
  store: InstallationStore,
  participantId: string,
): ParticipantStatus {
  const session = store.ensureParticipant(participantId);
  const termsAccepted = session.termsAcceptedAt !== null;
  const termsVersionCurrent =
    termsAccepted && session.termsVersion === store.config.termsVersion;
  const locationVerified = session.locationVerifiedAt !== null;
  const locationVerificationExpired =
    locationVerified &&
    store.now.getTime() - session.locationVerifiedAt!.getTime() >
      store.config.locationTtlMinutes * 60_000;

  return {
    submitted: session.submittedAt !== null || session.submissionId !== null,
    termsAccepted,
    termsVersionCurrent,
    locationVerified: locationVerified && !locationVerificationExpired,
    locationVerificationExpired,
  };
}

export function verifyLocation(
  store: InstallationStore,
  participantId: string,
  input: LocationInput,
  locationConfig: LocationConfig,
  termsAccepted: boolean,
  termsVersion: string,
): { verified: true } {
  const session = store.ensureParticipant(participantId);

  if (!termsAccepted) {
    throw new EngineError("TERMS_NOT_ACCEPTED");
  }
  if (termsVersion !== store.config.termsVersion) {
    throw new EngineError("TERMS_VERSION_MISMATCH");
  }

  const decision = verifyLocationReading(input, locationConfig);
  if (!decision.ok) {
    throw new EngineError(decision.code);
  }

  if (
    session.termsVersion !== termsVersion ||
    session.termsAcceptedAt === null
  ) {
    session.termsVersion = termsVersion;
    session.termsAcceptedAt = store.now;
  }
  session.locationVerifiedAt = store.now;
  return { verified: true };
}

export async function createSubmissionOnce(
  store: InstallationStore,
  participantId: string,
  description: string,
): Promise<{ submitted: true; submissionId: string }> {
  return store.withParticipantLock(participantId, () =>
    createSubmissionOnceLocked(store, participantId, description),
  );
}

function createSubmissionOnceLocked(
  store: InstallationStore,
  participantId: string,
  description: string,
): { submitted: true; submissionId: string } {
  const session = store.ensureParticipant(participantId);
  const normalized = normalizeDescription(description);

  if (session.submittedAt !== null || session.submissionId !== null) {
    throw new EngineError("ALREADY_SUBMITTED");
  }

  if (
    session.termsAcceptedAt === null ||
    session.termsVersion !== store.config.termsVersion
  ) {
    throw new EngineError("TERMS_NOT_ACCEPTED");
  }

  if (session.locationVerifiedAt === null) {
    throw new EngineError("LOCATION_NOT_VERIFIED");
  }

  const ageMs = store.now.getTime() - session.locationVerifiedAt.getTime();
  if (ageMs > store.config.locationTtlMinutes * 60_000) {
    throw new EngineError("LOCATION_EXPIRED");
  }

  const length = unicodeLength(normalized);
  if (length < store.config.minDescriptionLength) {
    throw new EngineError("DESCRIPTION_TOO_SHORT");
  }
  if (length > store.config.maxDescriptionLength) {
    throw new EngineError("DESCRIPTION_TOO_LONG");
  }

  const dayStart = startOfUtcDay(store.now);
  let daily = 0;
  for (const submission of store.submissions.values()) {
    if (submission.createdAt >= dayStart && submission.status !== "failed") {
      daily += 1;
    }
  }
  if (daily >= store.config.maxDailySubmissions) {
    throw new EngineError("DAILY_CAPACITY_REACHED");
  }

  const id = store.nextId("sub");
  const row: Submission = {
    id,
    participantId,
    description: normalized,
    status: "queued",
    assignedTabletId: null,
    claimedAt: null,
    leaseExpiresAt: null,
    generationStartedAt: null,
    generatedAt: null,
    displayedAt: null,
    imagePath: null,
    generationAttempts: 0,
    lastErrorCode: null,
    createdAt: store.now,
  };

  store.submissions.set(id, row);
  session.submittedAt = store.now;
  session.submissionId = id;
  store.queueSignals.push({
    id: store.queueSignals.length + 1,
    createdAt: store.now,
  });

  return { submitted: true, submissionId: id };
}
