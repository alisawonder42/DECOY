export function envString(name: string, fallback = ""): string {
  return Deno.env.get(name) ?? fallback;
}

export function envNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function envBool(name: string, fallback = false): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}
