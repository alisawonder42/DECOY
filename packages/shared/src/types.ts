export type SubmissionStatus =
  | "queued"
  | "assigned"
  | "generating"
  | "ready"
  | "displayed"
  | "failed";

export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  "queued",
  "assigned",
  "generating",
  "ready",
  "displayed",
  "failed",
] as const;

export type SanitizedErrorCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_REQUEST"
  | "TERMS_NOT_ACCEPTED"
  | "TERMS_VERSION_MISMATCH"
  | "LOCATION_NOT_VERIFIED"
  | "LOCATION_EXPIRED"
  | "LOCATION_OUTSIDE_EXHIBITION"
  | "LOCATION_INACCURATE"
  | "LOCATION_UNAVAILABLE"
  | "INVALID_COORDINATES"
  | "ALREADY_SUBMITTED"
  | "DESCRIPTION_TOO_SHORT"
  | "DESCRIPTION_TOO_LONG"
  | "DAILY_CAPACITY_REACHED"
  | "TABLET_UNAUTHORIZED"
  | "TABLET_DISABLED"
  | "NOT_ASSIGNED"
  | "NOT_READY"
  | "NO_JOB"
  | "GENERATION_PACING"
  | "GENERATION_FAILED"
  | "CONTENT_REJECTED"
  | "OPENAI_NOT_CONFIGURED"
  | "STORAGE_UPLOAD_FAILED"
  | "LEASE_EXPIRED"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export type ParticipantStatus = {
  submitted: boolean;
  termsAccepted: boolean;
  termsVersionCurrent: boolean;
  locationVerified: boolean;
  locationVerificationExpired: boolean;
};

export type VerifyLocationRequest = {
  latitude: number;
  longitude: number;
  accuracy: number;
  termsAccepted: true;
  termsVersion: string;
};

export type VerifyLocationSuccess = {
  verified: true;
};

export type SubmitDescriptionRequest = {
  description: string;
};

export type SubmitDescriptionSuccess = {
  submitted: true;
  submissionId: string;
};

export type ApiErrorBody = {
  error: {
    code: SanitizedErrorCode;
  };
};

export type TabletGenerateAction = {
  action: "generate";
  submissionId: string;
};

export type TabletDisplayAction = {
  action: "display";
  submissionId: string;
  signedImageUrl: string;
};

export type TabletNoneAction = {
  action: "none";
};

export type TabletClaimResult =
  | TabletGenerateAction
  | TabletDisplayAction
  | TabletNoneAction;

export type TabletStateResponse = {
  tabletId: string;
  enabled: boolean;
  currentSubmissionId: string | null;
  signedCurrentImageUrl: string | null;
  pending: TabletClaimResult;
};

export type TabletHeartbeatRequest = {
  appVersion: string;
};

export type TabletDisplayedRequest = {
  submissionId: string;
};

export type BilingualCopy = {
  sr: string;
  en: string;
};
