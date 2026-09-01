import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copy } from "./copy/index.ts";
import { termsParagraphsEn, termsParagraphsSr } from "./copy/terms.ts";

describe("visitor copy", () => {
  it("keeps Serbian and English for every key", () => {
    for (const [key, pair] of Object.entries(copy)) {
      expect(pair.sr.trim().length, key).toBeGreaterThan(0);
      expect(pair.en.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("does not call the visitor text a prompt", () => {
    const blob = JSON.stringify(copy).toLowerCase();
    expect(blob.includes("prompt")).toBe(false);
  });

  it("covers required legal points in both languages", () => {
    const sr = termsParagraphsSr.join(" ").toLowerCase();
    const en = termsParagraphsEn.join(" ").toLowerCase();
    expect(sr).toContain("dobrovoljno");
    expect(en).toContain("voluntary");
    expect(en).toContain("latitude");
    expect(en).toContain("openai");
    expect(en).toContain("anonymous browser identity");
    expect(en).toContain("required before public launch");
  });
});

describe("frontend rendering safety", () => {
  it("does not use dangerouslySetInnerHTML", () => {
    const src = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    expect(src.includes("dangerouslySetInnerHTML")).toBe(false);
  });
});
