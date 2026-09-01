import type { TabletClaimResult, TabletStateResponse } from "@installation/shared";
import { apiBaseUrl, publishableKey } from "./config.ts";

export class TabletApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "TabletApiError";
  }
}

async function tabletFetch<T>(
  path: string,
  tabletId: string,
  deviceToken: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deviceToken}`,
      apikey: publishableKey(),
      "Content-Type": "application/json",
      "X-Tablet-ID": tabletId,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string }; retryAfterSeconds?: number }
    | null;

  if (!response.ok) {
    const code =
      json && typeof json === "object" && "error" in json ? json.error?.code : undefined;
    const retry =
      json && typeof json === "object" && "retryAfterSeconds" in json
        ? json.retryAfterSeconds
        : undefined;
    throw new TabletApiError(code ?? "NETWORK_ERROR", response.status, retry);
  }

  return json as T;
}

export function sendHeartbeat(tabletId: string, deviceToken: string, appVersion: string) {
  return tabletFetch<{ ok: true }>("tablet-heartbeat", tabletId, deviceToken, { appVersion });
}

export function fetchTabletState(tabletId: string, deviceToken: string) {
  return tabletFetch<TabletStateResponse>("tablet-state", tabletId, deviceToken, {});
}

export function claimJob(tabletId: string, deviceToken: string) {
  return tabletFetch<TabletClaimResult>("tablet-claim", tabletId, deviceToken, {});
}

export function generateJob(tabletId: string, deviceToken: string, submissionId: string) {
  return tabletFetch<TabletClaimResult>("tablet-generate", tabletId, deviceToken, {
    submissionId,
  });
}

export function markDisplayed(tabletId: string, deviceToken: string, submissionId: string) {
  return tabletFetch<{ ok: true }>("tablet-displayed", tabletId, deviceToken, { submissionId });
}

export async function downloadImage(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new TabletApiError("NETWORK_ERROR", response.status);
  }
  return response.blob();
}
