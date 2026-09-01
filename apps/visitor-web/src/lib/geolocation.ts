export type GeoFailure = "denied" | "unavailable";

export type GeoReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function requestLocation(): Promise<GeoReading> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("unavailable"), { kind: "unavailable" as const }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(Object.assign(new Error("denied"), { kind: "denied" as const }));
          return;
        }
        reject(Object.assign(new Error("unavailable"), { kind: "unavailable" as const }));
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      },
    );
  });
}
