import { handleTablet, jsonOk } from "../_shared/http.ts";
import { ApiError, mapRpcError } from "../_shared/errors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { authenticateTablet } from "../_shared/tablet-auth.ts";
import { logSafe } from "../_shared/log.ts";

Deno.serve((req) =>
  handleTablet(req, async (incoming, headers) => {
    const admin = serviceClient();
    const tablet = await authenticateTablet(incoming, admin);
    const body = (await incoming.json().catch(() => null)) as { submissionId?: unknown } | null;
    if (!body || typeof body.submissionId !== "string") {
      throw new ApiError("INVALID_REQUEST", 400);
    }

    const { error } = await admin.rpc("mark_submission_displayed", {
      p_tablet_id: tablet.id,
      p_submission_id: body.submissionId,
    });
    if (error) {
      throw mapRpcError(error.message);
    }

    logSafe("tablet displayed", {
      tabletId: tablet.id,
      submissionId: body.submissionId,
    });
    return jsonOk({ ok: true }, headers);
  }),
);
