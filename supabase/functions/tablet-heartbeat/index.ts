import { handleTablet, jsonOk } from "../_shared/http.ts";
import { envNumber } from "../_shared/env.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { authenticateTablet } from "../_shared/tablet-auth.ts";
import { logSafe } from "../_shared/log.ts";

Deno.serve((req) =>
  handleTablet(req, async (incoming, headers) => {
    const admin = serviceClient();
    const tablet = await authenticateTablet(incoming, admin);
    const body = (await incoming.json().catch(() => ({}))) as { appVersion?: unknown };
    const appVersion = typeof body.appVersion === "string" ? body.appVersion : "unknown";

    const { error } = await admin
      .from("tablets")
      .update({
        last_seen_at: new Date().toISOString(),
        app_version: appVersion,
      })
      .eq("id", tablet.id);

    if (error) {
      throw error;
    }

    logSafe("tablet heartbeat", { tabletId: tablet.id });
    return jsonOk(
      {
        ok: true,
        onlineThresholdSeconds: envNumber("TABLET_ONLINE_THRESHOLD_SECONDS", 90),
      },
      headers,
    );
  }),
);
