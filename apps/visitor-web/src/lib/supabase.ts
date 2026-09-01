import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export async function ensureAnonymousSession(): Promise<string> {
  const supabase = getSupabase();
  const existing = await supabase.auth.getSession();
  if (existing.data.session?.user.id) {
    return existing.data.session.user.id;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw error ?? new Error("NOT_AUTHENTICATED");
  }
  return data.user.id;
}
