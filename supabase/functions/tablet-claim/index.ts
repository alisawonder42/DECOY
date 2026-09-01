import { handleTablet, jsonOk } from "../_shared/http.ts";
import { envNumber } from "../_shared/env.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { authenticateTablet } from "../_shared/tablet-auth.ts";
import { logSafe } from "../_shared/log.ts";
import { ApiError } from "../_shared/errors.ts";

Deno.serve((req) =>
  handleTablet(req, async (incoming, headers) => {
    const admin = serviceClient();
    const tablet = await authenticateTablet(incoming, admin);

    const { data, error } = await admin.rpc("claim_next_submission", {
      p_tablet_id: tablet.id,
      p_online_threshold_seconds: envNumber("TABLET_ONLINE_THRESHOLD_SECONDS", 90),
      p_generation_lease_minutes: envNumber("GENERATION_LEASE_MINUTES", 5),
      p_ready_display_lease_minutes: envNumber("READY_DISPLAY_LEASE_MINUTES", 2),
      p_max_generation_attempts: envNumber("MAX_GENERATION_ATTEMPTS", 3),
    });

    if (error) {
      throw new ApiError("INTERNAL_ERROR", 500);
    }

    const result = data as {
      action?: string;
      submissionId?: string;
      imagePath?: string;
    };

    if (!result || result.action === "none") {
      return jsonOk({ action: "none" }, headers);
    }

    if (result.action === "display" && result.submissionId && result.imagePath) {
      const signed = await admin.storage
        .from("generated-artworks")
        .createSignedUrl(result.imagePath, 60 * 10);
      if (signed.error || !signed.data?.signedUrl) {
        throw new ApiError("STORAGE_UPLOAD_FAILED", 500);
      }
      logSafe("tablet claimed display", {
        tabletId: tablet.id,
        submissionId: result.submissionId,
      });
      return jsonOk(
        {
          action: "display",
          submissionId: result.submissionId,
          signedImageUrl: signed.data.signedUrl,
        },
        headers,
      );
    }

    logSafe("tablet claimed generate", {
      tabletId: tablet.id,
      submissionId: result.submissionId ?? null,
    });
    return jsonOk(
      {
        action: "generate",
        submissionId: result.submissionId,
      },
      headers,
    );
  }),
);
