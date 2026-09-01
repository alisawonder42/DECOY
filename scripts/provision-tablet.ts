import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isTabletId, TABLET_IDS } from "@installation/shared";

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Use a local privileged environment, never a client app.`);
  }
  return value;
}

function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function provisionOne(tabletId: string): Promise<string> {
  if (!isTabletId(tabletId) && !(TABLET_IDS as readonly string[]).includes(tabletId)) {
    throw new Error(`Unsupported tablet id: ${tabletId}`);
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await admin().from("tablets").upsert(
    {
      id: tabletId,
      token_hash: tokenHash,
      enabled: true,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return token;
}

const tabletId = process.argv[2];
if (!tabletId) {
  console.error("Usage: pnpm provision-tablet tablet-04");
  process.exit(1);
}

const token = await provisionOne(tabletId);
console.log(`Tablet: ${tabletId}`);
console.log("Plain device token (shown once, not stored in git):");
console.log(token);
console.log("Store this only on the physical tablet.");
