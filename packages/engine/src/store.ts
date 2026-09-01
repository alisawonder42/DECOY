import {
  DEFAULT_GENERATION_LEASE_MINUTES,
  DEFAULT_GENERATION_MIN_INTERVAL_SECONDS,
  DEFAULT_LOCATION_VERIFICATION_TTL_MINUTES,
  DEFAULT_MAX_DAILY_SUBMISSIONS,
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_READY_DISPLAY_LEASE_MINUTES,
  DEFAULT_TABLET_ONLINE_THRESHOLD_SECONDS,
  DEFAULT_TERMS_VERSION,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  TABLET_IDS,
} from "@installation/shared";
import type {
  EngineConfig,
  GenerationControl,
  ParticipantSession,
  QueueSignal,
  Submission,
  Tablet,
} from "./types.ts";

export class InstallationStore {
  readonly participants = new Map<string, ParticipantSession>();
  readonly submissions = new Map<string, Submission>();
  readonly tablets = new Map<string, Tablet>();
  readonly queueSignals: QueueSignal[] = [];
  generationControl: GenerationControl = {
    id: 1,
    nextAllowedAt: new Date(0),
  };
  now: Date;
  config: EngineConfig;
  private participantQueues = new Map<string, Promise<unknown>>();
  private globalMutex: Promise<unknown> = Promise.resolve();

  constructor(now: Date = new Date(), config: Partial<EngineConfig> = {}) {
    this.now = now;
    this.config = {
      termsVersion: DEFAULT_TERMS_VERSION,
      locationTtlMinutes: DEFAULT_LOCATION_VERIFICATION_TTL_MINUTES,
      maxDailySubmissions: DEFAULT_MAX_DAILY_SUBMISSIONS,
      minDescriptionLength: DESCRIPTION_MIN_LENGTH,
      maxDescriptionLength: DESCRIPTION_MAX_LENGTH,
      maxGenerationAttempts: DEFAULT_MAX_GENERATION_ATTEMPTS,
      generationLeaseMinutes: DEFAULT_GENERATION_LEASE_MINUTES,
      readyDisplayLeaseMinutes: DEFAULT_READY_DISPLAY_LEASE_MINUTES,
      generationMinIntervalSeconds: DEFAULT_GENERATION_MIN_INTERVAL_SECONDS,
      tabletOnlineThresholdSeconds: DEFAULT_TABLET_ONLINE_THRESHOLD_SECONDS,
      ...config,
    };
  }

  seedDefaultTablets(online = true): void {
    for (const id of TABLET_IDS) {
      this.tablets.set(id, {
        id,
        tokenHash: `hash-${id}`,
        enabled: true,
        lastSeenAt: online ? this.now : null,
        lastDisplayedAt: null,
        currentSubmissionId: null,
        appVersion: "0.1.0",
        createdAt: this.now,
      });
    }
  }

  ensureParticipant(participantId: string): ParticipantSession {
    const existing = this.participants.get(participantId);
    if (existing) return existing;
    const created: ParticipantSession = {
      participantId,
      createdAt: this.now,
      termsVersion: null,
      termsAcceptedAt: null,
      locationVerifiedAt: null,
      submittedAt: null,
      submissionId: null,
    };
    this.participants.set(participantId, created);
    return created;
  }

  withParticipantLock<T>(
    participantId: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const previous = this.participantQueues.get(participantId) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    this.participantQueues.set(
      participantId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  withGlobalLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.globalMutex.then(fn, fn);
    this.globalMutex = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  nextId(prefix: string): string {
    return `${prefix}-${this.submissions.size + 1}-${this.now.getTime()}`;
  }
}
