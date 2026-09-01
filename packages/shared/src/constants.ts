export const TABLET_IDS = [
  "tablet-01",
  "tablet-02",
  "tablet-03",
  "tablet-04",
  "tablet-05",
  "tablet-06",
  "tablet-07",
  "tablet-08",
  "tablet-09",
] as const;

export type TabletId = (typeof TABLET_IDS)[number];

export const DESCRIPTION_MIN_LENGTH = 20;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const DEFAULT_GALLERY_RADIUS_METERS = 200;
export const DEFAULT_MAX_LOCATION_ACCURACY_METERS = 500;
export const DEFAULT_LOCATION_VERIFICATION_TTL_MINUTES = 60;
export const DEFAULT_MAX_DAILY_SUBMISSIONS = 200;
export const DEFAULT_MAX_GENERATION_ATTEMPTS = 3;
export const DEFAULT_GENERATION_LEASE_MINUTES = 5;
export const DEFAULT_READY_DISPLAY_LEASE_MINUTES = 2;
export const DEFAULT_GENERATION_MIN_INTERVAL_SECONDS = 13;
export const DEFAULT_TABLET_ONLINE_THRESHOLD_SECONDS = 90;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
export const DEFAULT_CLAIM_FALLBACK_INTERVAL_MS = 20_000;
export const DEFAULT_CROSSFADE_MS = 1500;
export const DEFAULT_TERMS_VERSION = "1.0";

export const EARTH_RADIUS_METERS = 6_371_000;

export const STORAGE_BUCKET = "generated-artworks";

export const QUEUE_SIGNALS_TABLE = "queue_signals";

export const LOCAL_COMPLETION_MARKER = "installation_completed";

export function isTabletId(value: string): value is TabletId {
  return (TABLET_IDS as readonly string[]).includes(value);
}
