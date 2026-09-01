const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

export type LocationDecision =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_COORDINATES" | "LOCATION_INACCURATE" | "LOCATION_OUTSIDE_EXHIBITION";
    };

export function verifyLocationReading(
  latitude: unknown,
  longitude: unknown,
  accuracy: unknown,
  config: {
    galleryLatitude: number;
    galleryLongitude: number;
    radiusMeters: number;
    maxAccuracyMeters: number;
  },
): LocationDecision {
  if (
    !isFiniteNumber(latitude) ||
    !isFiniteNumber(longitude) ||
    !isFiniteNumber(accuracy) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    accuracy < 0
  ) {
    return { ok: false, code: "INVALID_COORDINATES" };
  }

  if (accuracy > config.maxAccuracyMeters) {
    return { ok: false, code: "LOCATION_INACCURATE" };
  }

  const distance = haversineMeters(
    latitude,
    longitude,
    config.galleryLatitude,
    config.galleryLongitude,
  );

  if (distance > config.radiusMeters) {
    return { ok: false, code: "LOCATION_OUTSIDE_EXHIBITION" };
  }

  return { ok: true };
}
