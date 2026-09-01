function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return hex(digest);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export type TabletRecord = {
  id: string;
  token_hash: string;
  enabled: boolean;
  last_seen_at: string | null;
  last_displayed_at: string | null;
  current_submission_id: string | null;
  app_version: string | null;
};

export async function authenticateTablet(
  req: Request,
  admin: ReturnType<typeof import("npm:@supabase/supabase-js@2").createClient>,
): Promise<TabletRecord> {
  const tabletId = req.headers.get("X-Tablet-ID") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!tabletId || !token) {
    throw new Error("TABLET_UNAUTHORIZED");
  }

  const { data, error } = await admin
    .from("tablets")
    .select(
      "id, token_hash, enabled, last_seen_at, last_displayed_at, current_submission_id, app_version",
    )
    .eq("id", tabletId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("TABLET_UNAUTHORIZED");
  }

  const presented = await sha256Hex(token);
  if (!timingSafeEqual(presented, data.token_hash)) {
    throw new Error("TABLET_UNAUTHORIZED");
  }

  if (!data.enabled) {
    throw new Error("TABLET_DISABLED");
  }

  return data as TabletRecord;
}
