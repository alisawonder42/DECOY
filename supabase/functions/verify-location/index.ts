import { handleVisitor, jsonOk } from "../_shared/http.ts";
import { ApiError } from "../_shared/errors.ts";
import { envBool, envNumber, envString } from "../_shared/env.ts";
import { verifyLocationReading } from "../_shared/location.ts";
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
      latitude?: unknown;
      longitude?: unknown;
      accuracy?: unknown;
      termsAccepted?: unknown;
      termsVersion?: unknown;
    } | null;

    if (!body || body.termsAccepted !== true || typeof body.termsVersion !== "string") {
      throw new ApiError("INVALID_REQUEST", 400);
    }

    const expectedTerms = envString("TERMS_VERSION", "1.0");
    if (body.termsVersion !== expectedTerms) {
      throw new ApiError("TERMS_VERSION_MISMATCH", 400);
    }

    if (!envBool("DEV_SKIP_LOCATION_VERIFICATION", false)) {
      const galleryLatitude = envNumber("GALLERY_LATITUDE", Number.NaN);
      const galleryLongitude = envNumber("GALLERY_LONGITUDE", Number.NaN);
      if (!Number.isFinite(galleryLatitude) || !Number.isFinite(galleryLongitude)) {
        throw new ApiError("INTERNAL_ERROR", 500);
      }
      const decision = verifyLocationReading(body.latitude, body.longitude, body.accuracy, {
        galleryLatitude,
        galleryLongitude,
        radiusMeters: envNumber("GALLERY_RADIUS_METERS", 200),
        maxAccuracyMeters: envNumber("MAX_LOCATION_ACCURACY_METERS", 500),
      });
      if (!decision.ok) {
        throw new ApiError(decision.code, 403);
      }
    }

    const admin = serviceClient();
    const { error } = await admin.rpc("record_location_verification", {
      p_participant_id: participantId,
      p_terms_version: expectedTerms,
    });
    if (error) {
      throw new ApiError("INTERNAL_ERROR", 500);
    }

    return jsonOk({ verified: true }, headers);
  }),
);
