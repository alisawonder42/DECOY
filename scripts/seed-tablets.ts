import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { TABLET_IDS } from "@installation/shared";

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Use a local privileged environment, never a client app.`);
  }
  return value;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Provisioning nine tablets. Plain tokens print once and are not written to git.");

for (const tabletId of TABLET_IDS) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await admin.from("tablets").upsert(
    { id: tabletId, token_hash: tokenHash, enabled: true },
    { onConflict: "id" },
  );
  if (error) throw error;
  console.log(`\n${tabletId}`);
  console.log(token);
}

console.log("\nEnter each token only on its physical tablet.");
