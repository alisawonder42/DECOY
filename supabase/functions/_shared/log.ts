type LogValue = string | number | boolean | null;

/**
 * Production logs may include IDs and statuses only.
 * Never pass descriptions, coordinates, prompts, secrets, or image bytes.
 */
export function logSafe(message: string, meta: Record<string, LogValue> = {}): void {
  const payload: Record<string, LogValue> = { msg: message };
  for (const [key, value] of Object.entries(meta)) {
    const lowered = key.toLowerCase();
    if (
      lowered.includes("lat") ||
      lowered.includes("lon") ||
      lowered.includes("coord") ||
      lowered.includes("prompt") ||
      lowered.includes("description") ||
      lowered.includes("secret") ||
      lowered.includes("key") ||
      lowered.includes("token") ||
      lowered.includes("base64") ||
      lowered.includes("image")
    ) {
      continue;
    }
    payload[key] = value;
  }
  console.log(JSON.stringify(payload));
}
