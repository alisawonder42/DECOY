import { ApiError, jsonError, jsonOk } from "./errors.ts";
import { corsHeaders, isAllowedVisitorOrigin, tabletCorsHeaders } from "./cors.ts";
import { logSafe } from "./log.ts";

export async function handleVisitor(
  req: Request,
  fn: (req: Request, headers: Headers) => Promise<Response>,
): Promise<Response> {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return jsonError("INVALID_REQUEST", 405, headers);
  }

  if (origin && !isAllowedVisitorOrigin(origin)) {
    return jsonError("INVALID_REQUEST", 403, headers);
  }

  try {
    return await fn(req, headers);
  } catch (error) {
    return handleCaught(error, headers);
  }
}

export async function handleTablet(
  req: Request,
  fn: (req: Request, headers: Headers) => Promise<Response>,
): Promise<Response> {
  const headers = tabletCorsHeaders();
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return jsonError("INVALID_REQUEST", 405, headers);
  }
  try {
    return await fn(req, headers);
  } catch (error) {
    return handleCaught(error, headers);
  }
}

function handleCaught(error: unknown, headers: Headers): Response {
  if (error instanceof ApiError) {
    return jsonError(error.code, error.status, headers);
  }
  if (error instanceof Error) {
    switch (error.message) {
      case "NOT_AUTHENTICATED":
        return jsonError("NOT_AUTHENTICATED", 401, headers);
      case "TABLET_UNAUTHORIZED":
        return jsonError("TABLET_UNAUTHORIZED", 401, headers);
      case "TABLET_DISABLED":
        return jsonError("TABLET_DISABLED", 403, headers);
      default:
        logSafe("unhandled function error");
        return jsonError("INTERNAL_ERROR", 500, headers);
    }
  }
  logSafe("unknown function error");
  return jsonError("INTERNAL_ERROR", 500, headers);
}

export { jsonError, jsonOk };
