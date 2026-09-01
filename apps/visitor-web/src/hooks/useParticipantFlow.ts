import { useCallback, useEffect, useRef, useState } from "react";
import { validateDescription } from "@installation/shared";
import { termsMeta } from "../copy/terms.ts";
import { fetchParticipantStatus, submitDescription, verifyLocation } from "../lib/api.ts";
import { requestLocation } from "../lib/geolocation.ts";
import { readLocalCompletion, writeLocalCompletion } from "../lib/storage.ts";
import { ensureAnonymousSession } from "../lib/supabase.ts";

export type FlowScreen =
  | "booting"
  | "intro"
  | "describe"
  | "complete"
  | "capacity"
  | "location-denied"
  | "location-outside"
  | "location-inaccurate";

type CodedError = { code?: string; kind?: string };

function goComplete(): void {
  window.history.replaceState(null, "", "/complete");
}

export function useParticipantFlow() {
  const [screen, setScreen] = useState<FlowScreen>("booting");
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [describeError, setDescribeError] = useState<"too_short" | "network" | null>(null);
  const submitting = useRef(false);

  const showComplete = useCallback(() => {
    writeLocalCompletion();
    goComplete();
    setScreen("complete");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonymousSession();
        const status = await fetchParticipantStatus();
        if (cancelled) return;
        if (status.submitted || readLocalCompletion()) {
          showComplete();
          return;
        }
        if (window.location.pathname === "/complete") {
          window.history.replaceState(null, "", "/");
        }
        if (status.termsAccepted && status.termsVersionCurrent) {
          setAccepted(true);
        }
        if (status.locationVerified && status.termsVersionCurrent) {
          setScreen("describe");
          return;
        }
        setScreen("intro");
      } catch {
        if (!cancelled) setScreen("intro");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showComplete]);

  const runLocation = useCallback(async () => {
    setPending(true);
    try {
      const reading = await requestLocation();
      await verifyLocation({
        ...reading,
        termsAccepted: true,
        termsVersion: termsMeta.termsVersion,
      });
      setScreen("describe");
    } catch (error) {
      const coded = error as CodedError;
      if (coded.kind === "denied" || coded.code === "denied") {
        setScreen("location-denied");
      } else if (coded.code === "LOCATION_OUTSIDE_EXHIBITION") {
        setScreen("location-outside");
      } else if (
        coded.code === "LOCATION_INACCURATE" ||
        coded.code === "INVALID_COORDINATES" ||
        coded.kind === "unavailable"
      ) {
        setScreen("location-inaccurate");
      } else {
        setScreen("location-inaccurate");
      }
    } finally {
      setPending(false);
    }
  }, []);

  const continueFromIntro = useCallback(async () => {
    if (!accepted || pending) return;
    await runLocation();
  }, [accepted, pending, runLocation]);

  const requestSubmit = useCallback(() => {
    const result = validateDescription(description);
    if (result === "too_short") {
      setDescribeError("too_short");
      return;
    }
    setDescribeError(null);
    setConfirmOpen(true);
  }, [description]);

  const confirmSubmit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      await submitDescription(description);
      setConfirmOpen(false);
      showComplete();
    } catch (error) {
      const code = (error as CodedError).code;
      if (code === "ALREADY_SUBMITTED") {
        setConfirmOpen(false);
        showComplete();
        return;
      }
      if (code === "DAILY_CAPACITY_REACHED") {
        setConfirmOpen(false);
        setScreen("capacity");
        return;
      }
      if (code === "DESCRIPTION_TOO_SHORT") {
        setDescribeError("too_short");
        setConfirmOpen(false);
        return;
      }
      setDescribeError("network");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }, [description, showComplete]);

  return {
    screen,
    accepted,
    setAccepted,
    termsOpen,
    setTermsOpen,
    confirmOpen,
    setConfirmOpen,
    description,
    setDescription,
    pending,
    describeError,
    continueFromIntro,
    requestSubmit,
    confirmSubmit,
    runLocation,
  };
}
