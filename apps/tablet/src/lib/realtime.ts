import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { QUEUE_SIGNALS_TABLE } from "@installation/shared";
import { publishableKey, supabaseUrl } from "./config.ts";

let client: SupabaseClient | null = null;

export function getRealtimeClient(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl(), publishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function subscribeQueueSignals(onSignal: () => void): RealtimeChannel {
  const channel = getRealtimeClient()
    .channel("queue-signals")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: QUEUE_SIGNALS_TABLE },
      () => {
        onSignal();
      },
    )
    .subscribe();
  return channel;
}
