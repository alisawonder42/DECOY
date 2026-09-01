import { TABLET_IDS, type TabletId } from "@installation/shared";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.1.0";

export const IMAGE_FIT = import.meta.env.VITE_IMAGE_FIT === "contain" ? "contain" : "cover";

export function supabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || "";
}

export function publishableKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
}

export function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || `${supabaseUrl()}/functions/v1`;
}

export function isKnownTabletId(value: string): value is TabletId {
  return (TABLET_IDS as readonly string[]).includes(value);
}
