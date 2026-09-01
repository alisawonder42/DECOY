const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

export function isAllowedVisitorOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const configured = Deno.env.get("VISITOR_WEB_ORIGIN") ?? "";
  if (configured && origin === configured) return true;
  if (configured) {
    try {
      const url = new URL(configured);
      const host = url.hostname;
      const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
      if (origin === `${url.protocol}//${altHost}`) return true;
    } catch {
      // ignore malformed configured origin
    }
  }
  return LOCAL_ORIGINS.includes(origin);
}

export function corsHeaders(origin: string | null, extra: Record<string, string> = {}): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    ...extra,
  });
  if (origin && isAllowedVisitorOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  return headers;
}

export function tabletCorsHeaders(): Headers {
  return new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-tablet-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
}
