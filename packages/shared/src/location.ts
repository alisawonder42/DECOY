import { EARTH_RADIUS_METERS } from "./constants.ts";
import type { SanitizedErrorCode } from "./types.ts";

export type LocationInput = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type LocationConfig = {
  galleryLatitude: number;
  galleryLongitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number;
};

export type LocationDecision =
  | { ok: true }
  | { ok: false; code: Extract<SanitizedErrorCode, "INVALID_COORDINATES" | "LOCATION_INACCURATE" | "LOCATION_OUTSIDE_EXHIBITION"> };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidLatitude(value: number): boolean {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function isValidAccuracy(value: number): boolean {
  return isFiniteNumber(value) && value >= 0;
}

/**
 * Great-circle distance in metres (Haversine).
 * Callers must not log the input coordinates.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);
  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);
  const a =
    sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function verifyLocationReading(
  input: LocationInput,
  config: LocationConfig,
): LocationDecision {
  if (
    !isValidLatitude(input.latitude) ||
    !isValidLongitude(input.longitude) ||
    !isValidAccuracy(input.accuracy)
  ) {
    return { ok: false, code: "INVALID_COORDINATES" };
  }

  if (input.accuracy > config.maxAccuracyMeters) {
    return { ok: false, code: "LOCATION_INACCURATE" };
  }

  const distance = haversineMeters(
    input.latitude,
    input.longitude,
    config.galleryLatitude,
    config.galleryLongitude,
  );

  if (distance > config.radiusMeters) {
    return { ok: false, code: "LOCATION_OUTSIDE_EXHIBITION" };
  }

  return { ok: true };
}
