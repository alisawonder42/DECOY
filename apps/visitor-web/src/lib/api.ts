import type {
  ApiErrorBody,
  ParticipantStatus,
  SanitizedErrorCode,
  SubmitDescriptionSuccess,
  VerifyLocationSuccess,
} from "@installation/shared";
import { getSupabase } from "./supabase.ts";

async function invoke<T>(name: string, body?: unknown): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) {
    const context = error as { context?: Response };
    if (context.context) {
      try {
        const parsed = (await context.context.json()) as ApiErrorBody;
        if (parsed?.error?.code) {
          throw Object.assign(new Error(parsed.error.code), {
            code: parsed.error.code as SanitizedErrorCode,
          });
        }
      } catch (inner) {
        if ((inner as { code?: string }).code) throw inner;
      }
    }
    throw Object.assign(new Error("NETWORK_ERROR"), { code: "NETWORK_ERROR" as const });
  }
  if (data && typeof data === "object" && "error" in data) {
    const parsed = data as ApiErrorBody;
    throw Object.assign(new Error(parsed.error.code), { code: parsed.error.code });
  }
  return data as T;
}

export function fetchParticipantStatus(): Promise<ParticipantStatus> {
  return invoke<ParticipantStatus>("participant-status");
}

export function verifyLocation(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  termsAccepted: true;
  termsVersion: string;
}): Promise<VerifyLocationSuccess> {
  return invoke<VerifyLocationSuccess>("verify-location", payload);
}

export function submitDescription(description: string): Promise<SubmitDescriptionSuccess> {
  return invoke<SubmitDescriptionSuccess>("submit-description", { description });
}
