import { describe, expect, it } from "vitest";
import {
  haversineMeters,
  verifyLocationReading,
  type LocationConfig,
} from "./location.ts";

const GALLERY = {
  galleryLatitude: 44.8176,
  galleryLongitude: 20.4569,
  radiusMeters: 200,
  maxAccuracyMeters: 500,
} satisfies LocationConfig;

describe("haversineMeters", () => {
  it("returns ~0 at the gallery coordinates", () => {
    const distance = haversineMeters(
      GALLERY.galleryLatitude,
      GALLERY.galleryLongitude,
      GALLERY.galleryLatitude,
      GALLERY.galleryLongitude,
    );
    expect(distance).toBeLessThan(0.01);
  });

  it("measures a known ~111km north-south degree as roughly that distance", () => {
    const distance = haversineMeters(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });
});

describe("verifyLocationReading", () => {
  it("accepts a reading exactly at the gallery", () => {
    const result = verifyLocationReading(
      {
        latitude: GALLERY.galleryLatitude,
        longitude: GALLERY.galleryLongitude,
        accuracy: 20,
      },
      GALLERY,
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts a reading inside the radius", () => {
    const result = verifyLocationReading(
      {
        latitude: GALLERY.galleryLatitude + 0.0005,
        longitude: GALLERY.galleryLongitude,
        accuracy: 25,
      },
      GALLERY,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a reading outside the radius", () => {
    const result = verifyLocationReading(
      {
        latitude: GALLERY.galleryLatitude + 0.05,
        longitude: GALLERY.galleryLongitude,
        accuracy: 20,
      },
      GALLERY,
    );
    expect(result).toEqual({ ok: false, code: "LOCATION_OUTSIDE_EXHIBITION" });
  });

  it("rejects invalid latitude", () => {
    expect(
      verifyLocationReading(
        { latitude: 95, longitude: 20, accuracy: 10 },
        GALLERY,
      ),
    ).toEqual({ ok: false, code: "INVALID_COORDINATES" });
  });

  it("rejects invalid longitude", () => {
    expect(
      verifyLocationReading(
        { latitude: 44, longitude: 200, accuracy: 10 },
        GALLERY,
      ),
    ).toEqual({ ok: false, code: "INVALID_COORDINATES" });
  });

  it("rejects NaN coordinates", () => {
    expect(
      verifyLocationReading(
        { latitude: Number.NaN, longitude: 20, accuracy: 10 },
        GALLERY,
      ),
    ).toEqual({ ok: false, code: "INVALID_COORDINATES" });
    expect(
      verifyLocationReading(
        { latitude: 44, longitude: Number.NaN, accuracy: 10 },
        GALLERY,
      ),
    ).toEqual({ ok: false, code: "INVALID_COORDINATES" });
  });

  it("rejects infinite coordinates", () => {
    expect(
      verifyLocationReading(
        { latitude: Number.POSITIVE_INFINITY, longitude: 20, accuracy: 10 },
        GALLERY,
      ),
    ).toEqual({ ok: false, code: "INVALID_COORDINATES" });
  });

  it("rejects unacceptable accuracy", () => {
    const result = verifyLocationReading(
      {
        latitude: GALLERY.galleryLatitude,
        longitude: GALLERY.galleryLongitude,
        accuracy: 501,
      },
      GALLERY,
    );
    expect(result).toEqual({ ok: false, code: "LOCATION_INACCURATE" });
  });
});
