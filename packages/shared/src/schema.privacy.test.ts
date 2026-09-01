import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  join(here, "../../../supabase/migrations/20260301000000_init.sql"),
  "utf8",
);

describe("schema privacy", () => {
  it("does not persist coordinate fields on participant_sessions", () => {
    const tableBlock = migration.match(
      /create table public\.participant_sessions \(([\s\S]*?)\);/,
    )?.[1];
    expect(tableBlock).toBeTruthy();
    expect(tableBlock).not.toMatch(/latitud/i);
    expect(tableBlock).not.toMatch(/longitud/i);
    expect(tableBlock).not.toMatch(/accuracy/i);
    expect(tableBlock).not.toMatch(/\bgps\b/i);
    expect(tableBlock).not.toMatch(/\bip\b/i);
    expect(tableBlock).not.toMatch(/fingerprint/i);
    expect(tableBlock).not.toMatch(/email/i);
  });

  it("stores only a hash of the tablet device token", () => {
    expect(migration).toMatch(/token_hash text not null/);
    expect(migration).not.toMatch(/device_token text/);
  });
});
