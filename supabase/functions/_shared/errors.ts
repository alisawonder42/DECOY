export type SanitizedErrorCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_REQUEST"
  | "TERMS_NOT_ACCEPTED"
  | "TERMS_VERSION_MISMATCH"
  | "LOCATION_NOT_VERIFIED"
  | "LOCATION_EXPIRED"
  | "LOCATION_OUTSIDE_EXHIBITION"
  | "LOCATION_INACCURATE"
  | "LOCATION_UNAVAILABLE"
  | "INVALID_COORDINATES"
  | "ALREADY_SUBMITTED"
  | "DESCRIPTION_TOO_SHORT"
  | "DESCRIPTION_TOO_LONG"
  | "DAILY_CAPACITY_REACHED"
  | "TABLET_UNAUTHORIZED"
  | "TABLET_DISABLED"
  | "NOT_ASSIGNED"
  | "NOT_READY"
  | "NO_JOB"
  | "GENERATION_PACING"
  | "GENERATION_FAILED"
  | "CONTENT_REJECTED"
  | "OPENAI_NOT_CONFIGURED"
  | "STORAGE_UPLOAD_FAILED"
  | "LEASE_EXPIRED"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly code: SanitizedErrorCode,
    readonly status = 400,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export function jsonError(code: SanitizedErrorCode, status: number, headers: Headers): Response {
  return new Response(JSON.stringify({ error: { code } }), { status, headers });
}

export function jsonOk(body: unknown, headers: Headers, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export function mapRpcError(message: string): ApiError {
  const code = message.trim();
  switch (code) {
    case "ALREADY_SUBMITTED":
      return new ApiError("ALREADY_SUBMITTED", 409);
    case "TERMS_NOT_ACCEPTED":
      return new ApiError("TERMS_NOT_ACCEPTED", 403);
    case "LOCATION_NOT_VERIFIED":
      return new ApiError("LOCATION_NOT_VERIFIED", 403);
    case "LOCATION_EXPIRED":
      return new ApiError("LOCATION_EXPIRED", 403);
    case "DESCRIPTION_TOO_SHORT":
      return new ApiError("DESCRIPTION_TOO_SHORT", 400);
    case "DESCRIPTION_TOO_LONG":
      return new ApiError("DESCRIPTION_TOO_LONG", 400);
    case "DAILY_CAPACITY_REACHED":
      return new ApiError("DAILY_CAPACITY_REACHED", 429);
    case "NOT_ASSIGNED":
      return new ApiError("NOT_ASSIGNED", 409);
    case "NOT_READY":
      return new ApiError("NOT_READY", 409);
    default:
      return new ApiError("INTERNAL_ERROR", 500);
  }
}
