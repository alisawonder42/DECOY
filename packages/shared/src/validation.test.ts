import { describe, expect, it } from "vitest";
import { DESCRIPTION_MAX_LENGTH } from "./constants.ts";
import { unicodeLength, validateDescription } from "./validation.ts";

describe("validateDescription", () => {
  it("rejects short descriptions after trim", () => {
    expect(validateDescription("   kratko   ")).toBe("too_short");
  });

  it("accepts 20 unicode characters", () => {
    expect(validateDescription("š".repeat(20))).toBe("ok");
  });

  it("rejects 2001 characters", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MAX_LENGTH + 1))).toBe(
      "too_long",
    );
  });

  it("accepts the 2000 character boundary", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MAX_LENGTH))).toBe("ok");
  });

  it("counts unicode code points, not UTF-16 units", () => {
    expect(unicodeLength("🙂".repeat(20))).toBe(20);
    expect(validateDescription("🙂".repeat(20))).toBe("ok");
  });
});
