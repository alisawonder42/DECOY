import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  ".git",
  "android",
  "coverage",
  ".vite",
]);

const FORBIDDEN = [
  /OPENAI_API_KEY\s*[:=]\s*['"]?sk-/,
  /\bsk-[A-Za-z0-9]{10,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+['"]/,
  /SERVICE_ROLE\s*[:=]\s*['"][^'"]+['"]/,
];

const CLIENT_ROOTS = ["apps/visitor-web/src", "apps/tablet/src", "apps/visitor-web/dist", "apps/tablet/dist"];

function walk(dir: string, files: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return files;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.(ts|tsx|js|jsx|map|html|json)$/.test(entry)) files.push(path);
  }
  return files;
}

let failed = false;
for (const root of CLIENT_ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const text = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) {
        console.error(`Forbidden secret pattern in ${file}`);
        failed = true;
      }
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("No privileged secrets found in client sources/builds.");
