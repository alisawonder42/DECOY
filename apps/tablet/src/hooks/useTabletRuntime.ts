import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TabletClaimResult } from "@installation/shared";
import {
  claimJob,
  downloadImage,
  fetchTabletState,
  generateJob,
  markDisplayed,
  sendHeartbeat,
  TabletApiError,
} from "../lib/api.ts";
import { APP_VERSION } from "../lib/config.ts";
import {
  clearCachedArtwork,
  readCachedArtwork,
  readProvisioning,
  writeCachedArtwork,
  writeProvisioning,
  type Provisioning,
} from "../lib/credentials.ts";
import { enterExhibitionDisplayMode } from "../lib/display-mode.ts";
import { deleteImageFile, persistImage } from "../lib/image-cache.ts";
import { subscribeQueueSignals } from "../lib/realtime.ts";

export type InternalState =
  | "BOOTING"
  | "IDLE"
  | "CLAIMING"
  | "GENERATING"
  | "DOWNLOADING"
  | "OFFLINE";

export type DisplayFrame = {
  submissionId: string;
  uri: string;
};

export function useTabletRuntime() {
  const [provisioning, setProvisioning] = useState<Provisioning | null>(null);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<DisplayFrame | null>(null);
  const [incoming, setIncoming] = useState<DisplayFrame | null>(null);
  const [internalState, setInternalState] = useState<InternalState>("BOOTING");
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDisplayTime, setLastDisplayTime] = useState<string | null>(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [pinChallenge, setPinChallenge] = useState(false);

  const busy = useRef(false);
  const currentRef = useRef<DisplayFrame | null>(null);
  const provisioningRef = useRef<Provisioning | null>(null);
  const internalRef = useRef<InternalState>("BOOTING");
  const backoffMs = useRef(1000);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tapTimes = useRef<number[]>([]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    provisioningRef.current = provisioning;
  }, [provisioning]);

  useEffect(() => {
    internalRef.current = internalState;
  }, [internalState]);

  const rememberError = useCallback((code: string) => {
    setLastError(code);
  }, []);

  const showArtwork = useCallback(async (submissionId: string, uri: string) => {
    const previous = currentRef.current;
    setIncoming({ submissionId, uri });
    await wait(1600);
    setCurrent({ submissionId, uri });
    setIncoming(null);
    await writeCachedArtwork(submissionId, uri);
    setLastDisplayTime(new Date().toISOString());
    if (previous && previous.submissionId !== submissionId) {
      void deleteImageFile(previous.submissionId);
    }
  }, []);

  const displayRemote = useCallback(
    async (creds: Provisioning, submissionId: string, signedImageUrl: string) => {
      setInternalState("DOWNLOADING");
      const blob = await downloadImage(signedImageUrl);
      const uri = await persistImage(submissionId, blob);
      await preload(uri);
      await showArtwork(submissionId, uri);
      await markDisplayed(creds.tabletId, creds.deviceToken, submissionId);
    },
    [showArtwork],
  );

  const handleAction = useCallback(
    async (creds: Provisioning, action: TabletClaimResult) => {
      if (action.action === "none") return;
      if (action.action === "generate") {
        if (currentRef.current?.submissionId === action.submissionId) return;
        setInternalState("GENERATING");
        try {
          const generated = await generateJob(
            creds.tabletId,
            creds.deviceToken,
            action.submissionId,
          );
          if (generated.action === "display") {
            await displayRemote(creds, generated.submissionId, generated.signedImageUrl);
          }
        } catch (error) {
          if (error instanceof TabletApiError && error.code === "GENERATION_PACING") {
            rememberError("GENERATION_PACING");
            return;
          }
          throw error;
        }
        return;
      }
      if (currentRef.current?.submissionId === action.submissionId) {
        await markDisplayed(creds.tabletId, creds.deviceToken, action.submissionId);
        return;
      }
      await displayRemote(creds, action.submissionId, action.signedImageUrl);
    },
    [displayRemote, rememberError],
  );

  const connect = useCallback(async () => {
    const creds = provisioningRef.current;
    if (!creds || busy.current) return;
    busy.current = true;
    setInternalState((prev) => (prev === "BOOTING" ? "BOOTING" : "CLAIMING"));
    try {
      await sendHeartbeat(creds.tabletId, creds.deviceToken, APP_VERSION);
      setLastHeartbeat(new Date().toISOString());
      const state = await fetchTabletState(creds.tabletId, creds.deviceToken);
      setBackendStatus("online");
      backoffMs.current = 1000;
      if (
        state.currentSubmissionId &&
        state.signedCurrentImageUrl &&
        state.currentSubmissionId !== currentRef.current?.submissionId
      ) {
        await displayRemote(creds, state.currentSubmissionId, state.signedCurrentImageUrl);
      }
      await handleAction(creds, state.pending);
      const claimed = await claimJob(creds.tabletId, creds.deviceToken);
      await handleAction(creds, claimed);
      setInternalState("IDLE");
      setRealtimeStatus("subscribed");
    } catch (error) {
      const code = error instanceof TabletApiError ? error.code : "NETWORK_ERROR";
      rememberError(code);
      setBackendStatus("offline");
      setInternalState("OFFLINE");
      setRealtimeStatus("disconnected");
    } finally {
      busy.current = false;
    }
  }, [displayRemote, handleAction, rememberError]);

  const claimNow = useCallback(async () => {
    const creds = provisioningRef.current;
    if (!creds || busy.current) return;
    busy.current = true;
    setInternalState("CLAIMING");
    try {
      const claimed = await claimJob(creds.tabletId, creds.deviceToken);
      setBackendStatus("online");
      await handleAction(creds, claimed);
      setInternalState("IDLE");
    } catch (error) {
      const apiError = error instanceof TabletApiError ? error : null;
      rememberError(apiError?.code ?? "NETWORK_ERROR");
      if (apiError?.code === "GENERATION_PACING" && apiError.retryAfterSeconds) {
        setInternalState("IDLE");
        window.setTimeout(() => {
          void claimNow();
        }, apiError.retryAfterSeconds * 1000);
      } else {
        setBackendStatus("offline");
        setInternalState("OFFLINE");
      }
    } finally {
      busy.current = false;
    }
  }, [handleAction, rememberError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await enterExhibitionDisplayMode();
      const cached = await readCachedArtwork();
      if (cached && !cancelled) {
        setCurrent(cached);
      }
      const existing = await readProvisioning();
      if (!cancelled) {
        setProvisioning(existing);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !provisioning) return;

    void connect();

    const heartbeatTimer = window.setInterval(() => {
      const creds = provisioningRef.current;
      if (!creds) return;
      void sendHeartbeat(creds.tabletId, creds.deviceToken, APP_VERSION)
        .then(() => {
          setLastHeartbeat(new Date().toISOString());
          setBackendStatus("online");
          if (internalRef.current === "OFFLINE") void connect();
        })
        .catch(() => {
          setBackendStatus("offline");
          setInternalState("OFFLINE");
        });
    }, 30_000);

    const claimTimer = window.setInterval(() => {
      if (!busy.current) void claimNow();
    }, 20_000);

    const onSignal = () => {
      window.setTimeout(() => {
        void claimNow();
      }, Math.floor(Math.random() * 500));
    };
    channelRef.current = subscribeQueueSignals(onSignal);

    const reconnectTimer = window.setInterval(() => {
      if (provisioningRef.current && !busy.current && internalRef.current === "OFFLINE") {
        void connect();
        backoffMs.current = Math.min(30_000, backoffMs.current * 2);
      }
    }, 4_000);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(claimTimer);
      window.clearInterval(reconnectTimer);
      void channelRef.current?.unsubscribe();
    };
  }, [claimNow, connect, provisioning, ready]);

  const saveProvisioning = useCallback(async (value: Provisioning) => {
    await writeProvisioning(value);
    setProvisioning(value);
  }, []);

  const clearCache = useCallback(async () => {
    if (currentRef.current) {
      await deleteImageFile(currentRef.current.submissionId);
    }
    await clearCachedArtwork();
    setCurrent(null);
    setIncoming(null);
  }, []);

  const restartState = useCallback(() => {
    setInternalState("BOOTING");
    void connect();
  }, [connect]);

  const registerCornerTap = useCallback(() => {
    const now = Date.now();
    tapTimes.current = [...tapTimes.current.filter((time) => now - time < 5000), now];
    if (tapTimes.current.length >= 7) {
      tapTimes.current = [];
      setPinChallenge(true);
    }
  }, []);

  return {
    ready,
    provisioning,
    saveProvisioning,
    current,
    incoming,
    internalState,
    backendStatus,
    realtimeStatus,
    lastHeartbeat,
    lastError,
    lastDisplayTime,
    maintenanceOpen,
    setMaintenanceOpen,
    pinChallenge,
    setPinChallenge,
    registerCornerTap,
    reconnect: connect,
    refreshState: connect,
    clearCache,
    restartState,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function preload(uri: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("decode"));
    image.src = uri;
  });
}
