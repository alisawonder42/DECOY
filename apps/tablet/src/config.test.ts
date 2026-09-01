import { describe, expect, it } from "vitest";
import { isKnownTabletId } from "./lib/config.ts";

describe("tablet ids", () => {
  it("accepts the nine installation tablets only", () => {
    expect(isKnownTabletId("tablet-01")).toBe(true);
    expect(isKnownTabletId("tablet-09")).toBe(true);
    expect(isKnownTabletId("tablet-10")).toBe(false);
  });
});
