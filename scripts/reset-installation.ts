import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Resetting installation rows. Tablet identities are kept.");

const clearSessions = await admin
  .from("participant_sessions")
  .update({ submitted_at: null, submission_id: null })
  .not("participant_id", "is", null);
if (clearSessions.error) throw clearSessions.error;

const clearTablets = await admin
  .from("tablets")
  .update({
    current_submission_id: null,
    last_displayed_at: null,
  })
  .not("id", "is", null);
if (clearTablets.error) throw clearTablets.error;

const deleteSubs = await admin.from("submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (deleteSubs.error) throw deleteSubs.error;

const deleteSignals = await admin.from("queue_signals").delete().gte("id", 0);
if (deleteSignals.error) throw deleteSignals.error;

const pacing = await admin
  .from("generation_control")
  .update({ next_allowed_at: new Date(0).toISOString() })
  .eq("id", 1);
if (pacing.error) throw pacing.error;

console.log("Installation queue reset.");
