import { LOCAL_COMPLETION_MARKER } from "@installation/shared";

export function readLocalCompletion(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_COMPLETION_MARKER) === "true";
  } catch {
    return false;
  }
}

export function writeLocalCompletion(): void {
  try {
    window.localStorage.setItem(LOCAL_COMPLETION_MARKER, "true");
  } catch {
    // Ignore quota / private-mode failures; server status remains authoritative.
  }
}
