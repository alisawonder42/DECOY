import { DESCRIPTION_MAX_LENGTH, DESCRIPTION_MIN_LENGTH } from "./constants.ts";

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function normalizeDescription(value: string): string {
  return value.trim();
}

export function validateDescription(
  value: string,
): "ok" | "too_short" | "too_long" {
  const length = unicodeLength(normalizeDescription(value));
  if (length < DESCRIPTION_MIN_LENGTH) return "too_short";
  if (length > DESCRIPTION_MAX_LENGTH) return "too_long";
  return "ok";
}
