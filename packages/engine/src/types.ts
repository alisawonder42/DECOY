import type { SubmissionStatus } from "@installation/shared";

export type ParticipantSession = {
  participantId: string;
  createdAt: Date;
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
  locationVerifiedAt: Date | null;
  submittedAt: Date | null;
  submissionId: string | null;
};

export type Submission = {
  id: string;
  participantId: string;
  description: string;
  status: SubmissionStatus;
  assignedTabletId: string | null;
  claimedAt: Date | null;
  leaseExpiresAt: Date | null;
  generationStartedAt: Date | null;
  generatedAt: Date | null;
  displayedAt: Date | null;
  imagePath: string | null;
  generationAttempts: number;
  lastErrorCode: string | null;
  createdAt: Date;
};

export type Tablet = {
  id: string;
  tokenHash: string;
  enabled: boolean;
  lastSeenAt: Date | null;
  lastDisplayedAt: Date | null;
  currentSubmissionId: string | null;
  appVersion: string | null;
  createdAt: Date;
};

export type QueueSignal = {
  id: number;
  createdAt: Date;
};

export type GenerationControl = {
  id: 1;
  nextAllowedAt: Date;
};

export type EngineConfig = {
  termsVersion: string;
  locationTtlMinutes: number;
  maxDailySubmissions: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  maxGenerationAttempts: number;
  generationLeaseMinutes: number;
  readyDisplayLeaseMinutes: number;
  generationMinIntervalSeconds: number;
  tabletOnlineThresholdSeconds: number;
};

export type ClaimResult =
  | { action: "none" }
  | { action: "generate"; submissionId: string }
  | { action: "display"; submissionId: string; imagePath: string };

export class EngineError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "EngineError";
  }
}

export function minutesFrom(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

export function secondsFrom(now: Date, seconds: number): Date {
  return new Date(now.getTime() + seconds * 1_000);
}

export function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
