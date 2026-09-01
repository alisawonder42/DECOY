import { handleVisitor, jsonOk } from "../_shared/http.ts";
import { ApiError } from "../_shared/errors.ts";
import { envNumber, envString } from "../_shared/env.ts";
import { requireAnonymousUser, serviceClient } from "../_shared/supabase.ts";

Deno.serve((req) =>
  handleVisitor(req, async (incoming, headers) => {
    let participantId: string;
    try {
      participantId = await requireAnonymousUser(incoming);
    } catch {
      throw new ApiError("NOT_AUTHENTICATED", 401);
    }

    const admin = serviceClient();
    await admin.from("participant_sessions").upsert(
      { participant_id: participantId },
      { onConflict: "participant_id", ignoreDuplicates: true },
    );

    const { data, error } = await admin
      .from("participant_sessions")
      .select("terms_version, terms_accepted_at, location_verified_at, submitted_at, submission_id")
      .eq("participant_id", participantId)
      .maybeSingle();

    if (error) {
      throw new ApiError("INTERNAL_ERROR", 500);
    }

    const termsVersion = envString("TERMS_VERSION", "1.0");
    const ttlMinutes = envNumber("LOCATION_VERIFICATION_TTL_MINUTES", 60);
    const termsAccepted = Boolean(data?.terms_accepted_at);
    const termsVersionCurrent = termsAccepted && data?.terms_version === termsVersion;
    const locationVerifiedAt = data?.location_verified_at
      ? new Date(data.location_verified_at)
      : null;
    const expired =
      locationVerifiedAt !== null &&
      Date.now() - locationVerifiedAt.getTime() > ttlMinutes * 60_000;

    return jsonOk(
      {
        submitted: Boolean(data?.submitted_at || data?.submission_id),
        termsAccepted,
        termsVersionCurrent,
        locationVerified: locationVerifiedAt !== null && !expired,
        locationVerificationExpired: expired,
      },
      headers,
    );
  }),
);
