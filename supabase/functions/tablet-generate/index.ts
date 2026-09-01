import { handleTablet, jsonOk } from "../_shared/http.ts";
import { ApiError, mapRpcError } from "../_shared/errors.ts";
import { envNumber } from "../_shared/env.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { authenticateTablet } from "../_shared/tablet-auth.ts";
import { buildImagePrompt } from "../_shared/prompt.ts";
import { generateArtwork } from "../_shared/openai.ts";
import { logSafe } from "../_shared/log.ts";

function storagePath(submissionId: string, extension: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `generated/${year}/${month}/${submissionId}.${extension}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve((req) =>
  handleTablet(req, async (incoming, headers) => {
    const admin = serviceClient();
    const tablet = await authenticateTablet(incoming, admin);
    const body = (await incoming.json().catch(() => null)) as { submissionId?: unknown } | null;
    if (!body || typeof body.submissionId !== "string") {
      throw new ApiError("INVALID_REQUEST", 400);
    }

    const slot = await admin.rpc("try_acquire_generation_slot", {
      p_interval_seconds: envNumber("GENERATION_MIN_INTERVAL_SECONDS", 13),
    });
    if (slot.error) {
      throw new ApiError("INTERNAL_ERROR", 500);
    }
    const gate = slot.data as { allowed?: boolean; retryAfterSeconds?: number };
    if (!gate?.allowed) {
      return jsonOk(
        {
          error: { code: "GENERATION_PACING" },
          retryAfterSeconds: gate?.retryAfterSeconds ?? 8,
        },
        headers,
        429,
      );
    }

    const started = await admin.rpc("begin_generation", {
      p_tablet_id: tablet.id,
      p_submission_id: body.submissionId,
    });
    if (started.error) {
      throw mapRpcError(started.error.message);
    }

    const description = started.data as string;
    const prompt = buildImagePrompt(description);
    logSafe("generation attempt", {
      tabletId: tablet.id,
      submissionId: body.submissionId,
    });

    const maxAttempts = envNumber("MAX_GENERATION_ATTEMPTS", 3);
    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const image = await generateArtwork({
          prompt,
          submissionId: body.submissionId,
        });
        const path = storagePath(body.submissionId, image.extension);
        const upload = await admin.storage.from("generated-artworks").upload(path, image.bytes, {
          contentType: image.contentType,
          upsert: true,
        });
        if (upload.error) {
          throw new ApiError("STORAGE_UPLOAD_FAILED", 500);
        }

        const completed = await admin.rpc("complete_generation", {
          p_tablet_id: tablet.id,
          p_submission_id: body.submissionId,
          p_image_path: path,
          p_ready_display_lease_minutes: envNumber("READY_DISPLAY_LEASE_MINUTES", 2),
        });
        if (completed.error) {
          throw mapRpcError(completed.error.message);
        }

        const signed = await admin.storage.from("generated-artworks").createSignedUrl(path, 60 * 10);
        if (signed.error || !signed.data?.signedUrl) {
          throw new ApiError("STORAGE_UPLOAD_FAILED", 500);
        }

        logSafe("generation complete", {
          tabletId: tablet.id,
          submissionId: body.submissionId,
        });
        return jsonOk(
          {
            action: "display",
            submissionId: body.submissionId,
            signedImageUrl: signed.data.signedUrl,
          },
          headers,
        );
      } catch (error) {
        if (error instanceof ApiError && error.code === "GENERATION_PACING") {
          const retryAfter =
            (error as ApiError & { retryAfterSeconds?: number }).retryAfterSeconds ?? 13;
          logSafe("generation attempt returned 429", {
            tabletId: tablet.id,
            submissionId: body.submissionId,
          });
          return jsonOk(
            { error: { code: "GENERATION_PACING" }, retryAfterSeconds: retryAfter },
            headers,
            429,
          );
        }
        if (error instanceof ApiError && error.code === "CONTENT_REJECTED") {
          await admin.rpc("fail_generation", {
            p_tablet_id: tablet.id,
            p_submission_id: body.submissionId,
            p_error_code: "CONTENT_REJECTED",
            p_max_generation_attempts: maxAttempts,
            p_retryable: false,
          });
          logSafe("generation content rejected", {
            tabletId: tablet.id,
            submissionId: body.submissionId,
          });
          throw error;
        }
        lastError = error instanceof ApiError ? error : new ApiError("GENERATION_FAILED", 502);
        const backoff = Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
        await sleep(backoff);
      }
    }

    await admin.rpc("fail_generation", {
      p_tablet_id: tablet.id,
      p_submission_id: body.submissionId,
      p_error_code: lastError?.code ?? "GENERATION_FAILED",
      p_max_generation_attempts: maxAttempts,
      p_retryable: true,
    });
    throw lastError ?? new ApiError("GENERATION_FAILED", 502);
  }),
);
