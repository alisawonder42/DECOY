import { handleVisitor, jsonOk } from "../_shared/http.ts";
import { ApiError, mapRpcError } from "../_shared/errors.ts";
import { envNumber, envString } from "../_shared/env.ts";
import { logSafe } from "../_shared/log.ts";
import { requireAnonymousUser, serviceClient } from "../_shared/supabase.ts";

Deno.serve((req) =>
  handleVisitor(req, async (incoming, headers) => {
    let participantId: string;
    try {
      participantId = await requireAnonymousUser(incoming);
    } catch {
      throw new ApiError("NOT_AUTHENTICATED", 401);
    }

    const body = (await incoming.json().catch(() => null)) as {
      description?: unknown;
    } | null;
    if (!body || typeof body.description !== "string") {
      throw new ApiError("INVALID_REQUEST", 400);
    }

    const admin = serviceClient();
    const { data, error } = await admin.rpc("create_submission_once", {
      p_participant_id: participantId,
      p_description: body.description,
      p_terms_version: envString("TERMS_VERSION", "1.0"),
      p_location_ttl_minutes: envNumber("LOCATION_VERIFICATION_TTL_MINUTES", 60),
      p_max_daily: envNumber("MAX_DAILY_SUBMISSIONS", 200),
      p_min_length: 20,
      p_max_length: 2000,
    });

    if (error) {
      throw mapRpcError(error.message);
    }

    logSafe("submission created", { submissionId: String(data) });
    return jsonOk({ submitted: true, submissionId: data }, headers);
  }),
);
