import { handleTablet, jsonOk } from "../_shared/http.ts";
import { envNumber } from "../_shared/env.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { authenticateTablet } from "../_shared/tablet-auth.ts";
import { logSafe } from "../_shared/log.ts";
import { ApiError } from "../_shared/errors.ts";

async function signedUrl(
  admin: ReturnType<typeof serviceClient>,
  path: string,
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from("generated-artworks")
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

Deno.serve((req) =>
  handleTablet(req, async (incoming, headers) => {
    const admin = serviceClient();
    const tablet = await authenticateTablet(incoming, admin);

    const { data: pending } = await admin
      .from("submissions")
      .select("id, status, image_path")
      .eq("assigned_tablet_id", tablet.id)
      .in("status", ["assigned", "generating", "ready"])
      .maybeSingle();

    let pendingAction: Record<string, string> = { action: "none" };
    if (pending?.status === "ready" && pending.image_path) {
      const url = await signedUrl(admin, pending.image_path);
      if (!url) throw new ApiError("STORAGE_UPLOAD_FAILED", 500);
      pendingAction = {
        action: "display",
        submissionId: pending.id,
        signedImageUrl: url,
      };
    } else if (pending && (pending.status === "assigned" || pending.status === "generating")) {
      pendingAction = { action: "generate", submissionId: pending.id };
    }

    let signedCurrentImageUrl: string | null = null;
    if (tablet.current_submission_id) {
      const { data: current } = await admin
        .from("submissions")
        .select("image_path")
        .eq("id", tablet.current_submission_id)
        .maybeSingle();
      if (current?.image_path) {
        signedCurrentImageUrl = await signedUrl(admin, current.image_path);
      }
    }

    logSafe("tablet state", { tabletId: tablet.id });
    return jsonOk(
      {
        tabletId: tablet.id,
        enabled: tablet.enabled,
        currentSubmissionId: tablet.current_submission_id,
        signedCurrentImageUrl,
        pending: pendingAction,
        onlineThresholdSeconds: envNumber("TABLET_ONLINE_THRESHOLD_SECONDS", 90),
      },
      headers,
    );
  }),
);
