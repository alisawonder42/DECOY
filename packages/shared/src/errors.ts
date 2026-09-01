import type { SanitizedErrorCode } from "./types.ts";

export function errorBody(code: SanitizedErrorCode): { error: { code: SanitizedErrorCode } } {
  return { error: { code } };
}

export function isSanitizedErrorCode(value: string): value is SanitizedErrorCode {
  return SANITIZED_ERROR_CODES.has(value);
}

const SANITIZED_ERROR_CODES = new Set<string>([
  "NOT_AUTHENTICATED",
  "INVALID_REQUEST",
  "TERMS_NOT_ACCEPTED",
  "TERMS_VERSION_MISMATCH",
  "LOCATION_NOT_VERIFIED",
  "LOCATION_EXPIRED",
  "LOCATION_OUTSIDE_EXHIBITION",
  "LOCATION_INACCURATE",
  "LOCATION_UNAVAILABLE",
  "INVALID_COORDINATES",
  "ALREADY_SUBMITTED",
  "DESCRIPTION_TOO_SHORT",
  "DESCRIPTION_TOO_LONG",
  "DAILY_CAPACITY_REACHED",
  "TABLET_UNAUTHORIZED",
  "TABLET_DISABLED",
  "NOT_ASSIGNED",
  "NOT_READY",
  "NO_JOB",
  "GENERATION_PACING",
  "GENERATION_FAILED",
  "CONTENT_REJECTED",
  "OPENAI_NOT_CONFIGURED",
  "STORAGE_UPLOAD_FAILED",
  "LEASE_EXPIRED",
  "NETWORK_ERROR",
  "INTERNAL_ERROR",
]);
