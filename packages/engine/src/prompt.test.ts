import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("buildImagePrompt", () => {
  it("embeds the original description unchanged and does not translate it", () => {
    const source = readFileSync(
      join(repoRoot, "supabase/functions/_shared/prompt.ts"),
      "utf8",
    );
    expect(source).toContain("VIEWER DESCRIPTION:");
    expect(source).toContain("${description}");
    expect(source).toContain("You have no visual reference to it.");
    expect(source.toLowerCase()).not.toContain("translate the description");
  });
});

describe("logging helper", () => {
  it("omits coordinate and prompt keys", () => {
    const source = readFileSync(
      join(repoRoot, "supabase/functions/_shared/log.ts"),
      "utf8",
    );
    expect(source).toContain("lat");
    expect(source).toContain("prompt");
    expect(source).toContain("continue");
  });
});
