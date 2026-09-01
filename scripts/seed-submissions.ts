import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const count = Number(process.argv[2] ?? "15");

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const termsVersion = process.env.TERMS_VERSION ?? "1.0";

console.log(`Creating ${count} fake queued submissions (developer only).`);

for (let i = 1; i <= count; i += 1) {
  const email = `dev-seed-${randomUUID()}@invalid.local`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { seed: true },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("Unable to create seed user");
  }
  const participantId = created.data.user.id;
  const recorded = await admin.rpc("record_location_verification", {
    p_participant_id: participantId,
    p_terms_version: termsVersion,
  });
  if (recorded.error) throw recorded.error;
  const submitted = await admin.rpc("create_submission_once", {
    p_participant_id: participantId,
    p_description: `Developer seed description number ${i}. A dark field, a pale figure, and an uncertain horizon.`,
    p_terms_version: termsVersion,
    p_location_ttl_minutes: 60,
    p_max_daily: 10_000,
    p_min_length: 20,
    p_max_length: 2000,
  });
  if (submitted.error) throw submitted.error;
  console.log(`queued ${submitted.data as string}`);
}
