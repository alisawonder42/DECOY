import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { TABLET_IDS } from "@installation/shared";

const ROOT = process.cwd();
const STATE_PATH = join(ROOT, ".hosted-bootstrap.local.json");
const BOOTSTRAP_ENV_PATH = join(ROOT, ".env.bootstrap");
const TABLET_TOKENS_PATH = join(ROOT, ".tablet-tokens.local.json");
const SUPABASE_API = "https://api.supabase.com/v1";
const CF_API = "https://api.cloudflare.com/client/v4";

type State = {
  supabaseRef?: string;
  supabaseUrl?: string;
  publishableKey?: string;
  secretKey?: string;
  dbPassword?: string;
  orgId?: string;
  pagesProject?: string;
  pagesUrl?: string;
  customDomain?: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function optional(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function loadBootstrapEnv(): void {
  if (!existsSync(BOOTSTRAP_ENV_PATH)) return;
  for (const rawLine of readFileSync(BOOTSTRAP_ENV_PATH, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function sqlQuery(ref: string, query: string): Promise<{ ok: boolean; status: number; text: string }> {
  const response = await supabaseApi(`/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function schemaAlreadyApplied(ref: string): Promise<boolean> {
  const result = await sqlQuery(
    ref,
    "select tablename from pg_tables where schemaname = 'public' and tablename = 'submissions'",
  );
  return result.ok && /submissions/.test(result.text);
}

async function applySchema(ref: string, dbPassword?: string): Promise<void> {
  if (await schemaAlreadyApplied(ref)) {
    console.log("Database schema already present");
    return;
  }
  if (dbPassword) {
    try {
      await run(
        "supabase",
        ["link", "--project-ref", ref, "--yes", "--password", dbPassword],
        { SUPABASE_ACCESS_TOKEN: required("SUPABASE_ACCESS_TOKEN") },
      );
      await run("supabase", ["db", "push", "--yes"], {
        SUPABASE_ACCESS_TOKEN: required("SUPABASE_ACCESS_TOKEN"),
      });
      console.log("Schema pushed via Supabase CLI");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("CLI db push failed; applying migration via Management API");
      if (!/password authentication failed/i.test(message)) {
        console.log(message.split("\n")[0]);
      }
    }
  }
  const sql = readFileSync(join(ROOT, "supabase/migrations/20260301000000_init.sql"), "utf8");
  const applied = await sqlQuery(ref, sql);
  if (!applied.ok && !(await schemaAlreadyApplied(ref))) {
    throw new Error(`Could not apply schema (${applied.status}): ${applied.text.slice(0, 500)}`);
  }
  console.log("Database schema applied");
}

async function provisionTablets(url: string, serviceRoleKey: string): Promise<void> {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokens: Record<string, string> = existsSync(TABLET_TOKENS_PATH)
    ? (JSON.parse(readFileSync(TABLET_TOKENS_PATH, "utf8")) as Record<string, string>)
    : {};
  for (const tabletId of TABLET_IDS) {
    if (tokens[tabletId]) continue;
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error } = await admin.from("tablets").upsert(
      { id: tabletId, token_hash: tokenHash, enabled: true },
      { onConflict: "id" },
    );
    if (error) throw error;
    tokens[tabletId] = token;
  }
  writeFileSync(TABLET_TOKENS_PATH, JSON.stringify(tokens, null, 2) + "\n", { mode: 0o600 });
  console.log(`Tablet device tokens written to ${TABLET_TOKENS_PATH} (gitignored)`);
}

function loadState(): State {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, "utf8")) as State;
}

function saveState(state: State): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${args.join(" ")}\n${stderr || stdout}`));
    });
  });
}

async function supabaseApi(path: string, init: RequestInit = {}): Promise<Response> {
  const token = required("SUPABASE_ACCESS_TOKEN");
  return fetch(`${SUPABASE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function cloudflareApi(path: string, init: RequestInit = {}): Promise<Response> {
  const token = optional("CLOUDFLARE_API_TOKEN");
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN missing");
  }
  return fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function waitForProject(ref: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await supabaseApi(`/projects/${ref}`);
    const body = (await response.json()) as { status?: string };
    if (body.status === "ACTIVE_HEALTHY" || body.status === "ACTIVE") {
      return;
    }
    console.log(`Supabase project status: ${body.status ?? "unknown"}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error("Supabase project did not become active in time");
}

async function main(): Promise<void> {
  loadBootstrapEnv();
  const accessToken = required("SUPABASE_ACCESS_TOKEN");
  const state = loadState();
  const existingRef = optional("SUPABASE_PROJECT_REF") || "fjnuzhwefsdwnnovtjou";
  state.supabaseRef = existingRef;
  if (optional("SUPABASE_DB_PASSWORD")) {
    state.dbPassword = optional("SUPABASE_DB_PASSWORD");
  }
  saveState(state);

  const orgsResponse = await supabaseApi("/organizations");
  if (!orgsResponse.ok) {
    throw new Error(`Could not list Supabase organizations (${orgsResponse.status})`);
  }
  const orgs = (await orgsResponse.json()) as Array<{ id: string; name: string }>;
  if (orgs.length === 0) {
    throw new Error("This Supabase token has no organizations");
  }
  const orgId = optional("SUPABASE_ORG_ID") || state.orgId || orgs[0]!.id;
  state.orgId = orgId;
  saveState(state);
  console.log(`Using Supabase org ${orgId}`);

  const projectsResponse = await supabaseApi("/projects");
  const projects = (await projectsResponse.json()) as Array<{ id: string; name: string; ref?: string }>;
  const existing =
    projects.find((project) => project.id === existingRef) ??
    projects.find((project) => project.id === state.supabaseRef) ??
    projects.find((project) => /decoy/i.test(project.name));

  let ref = existing?.id ?? existing?.ref ?? existingRef;
  if (!ref) {
    const dbPassword = state.dbPassword || randomBytes(24).toString("base64url");
    state.dbPassword = dbPassword;
    saveState(state);
    console.log("Creating Supabase project decoy-installation in eu-central-1 (micro)");
    const created = await run("supabase", [
      "projects",
      "create",
      "decoy-installation",
      "--org-id",
      orgId,
      "--db-password",
      dbPassword,
      "--region",
      optional("SUPABASE_REGION") || "eu-central-1",
      "--size",
      "micro",
      "--yes",
    ], { SUPABASE_ACCESS_TOKEN: accessToken });
    const match = created.match(/supabase\.co|Project ref:\s*(\w+)/i);
    const listed = await supabaseApi("/projects");
    const after = (await listed.json()) as Array<{ id: string; name: string }>;
    const fresh = after.find((project) => project.name === "decoy-installation");
    ref = fresh?.id;
    if (!ref) {
      throw new Error(`Created project but could not read its ref.\n${created}\n${match?.[0] ?? ""}`);
    }
  }
  state.supabaseRef = ref;
  saveState(state);
  console.log(`Supabase project ${ref}`);
  await waitForProject(ref);

  const keysResponse = await supabaseApi(`/projects/${ref}/api-keys`);
  const keys = (await keysResponse.json()) as Array<{ name?: string; api_key?: string; type?: string }>;
  const publishable =
    keys.find((key) => key.name === "anon")?.api_key ??
    keys.find((key) => key.type === "publishable")?.api_key ??
    "";
  const secret =
    keys.find((key) => key.name === "service_role")?.api_key ??
    keys.find((key) => key.type === "secret" && !/·|\u00b7/.test(key.api_key ?? ""))?.api_key ??
    "";
  if (!publishable || !secret) {
    throw new Error("Could not read Supabase publishable/secret API keys");
  }
  state.publishableKey = publishable;
  state.secretKey = secret;
  state.supabaseUrl = `https://${ref}.supabase.co`;
  saveState(state);

  const authPatch = await supabaseApi(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      external_anonymous_users_enabled: true,
      disable_signup: true,
    }),
  });
  if (!authPatch.ok) {
    console.log("Auth config PATCH returned", authPatch.status, await authPatch.text());
  } else {
    console.log("Anonymous sign-ins enabled; email signup disabled");
  }

  await applySchema(ref, state.dbPassword);
  try {
    await run("supabase", ["config", "push", "--yes"], { SUPABASE_ACCESS_TOKEN: accessToken });
  } catch (error) {
    console.log("config push skipped:", error instanceof Error ? error.message.split("\n")[0] : error);
  }

  const visitorDomain = optional("VISITOR_CUSTOM_DOMAIN") || "decoyexhibit.download";
  const visitorOrigin = `https://${visitorDomain}`;
  const secretPairs = [
    `GALLERY_RADIUS_METERS=${optional("GALLERY_RADIUS_METERS") || "200"}`,
    `MAX_LOCATION_ACCURACY_METERS=${optional("MAX_LOCATION_ACCURACY_METERS") || "500"}`,
    `LOCATION_VERIFICATION_TTL_MINUTES=60`,
    `TERMS_VERSION=${optional("TERMS_VERSION") || "1.0"}`,
    `MAX_DAILY_SUBMISSIONS=200`,
    `MAX_GENERATION_ATTEMPTS=3`,
    `GENERATION_LEASE_MINUTES=5`,
    `READY_DISPLAY_LEASE_MINUTES=2`,
    `GENERATION_MIN_INTERVAL_SECONDS=13`,
    `TABLET_ONLINE_THRESHOLD_SECONDS=90`,
    `OPENAI_IMAGE_MODEL=gpt-image-2`,
    `OPENAI_IMAGE_QUALITY=${optional("OPENAI_IMAGE_QUALITY") || "low"}`,
    `OPENAI_IMAGE_SIZE=1024x1536`,
    `OPENAI_IMAGE_FORMAT=webp`,
    `MOCK_IMAGE_GENERATION=${optional("OPENAI_API_KEY") ? "false" : "true"}`,
    `DEV_SKIP_LOCATION_VERIFICATION=false`,
    `VISITOR_WEB_ORIGIN=${visitorOrigin}`,
    `DATA_RETENTION_DESCRIPTION=${optional("DATA_RETENTION_DESCRIPTION") || "This test installation keeps participation records until the exhibition ends, then deletes them."}`,
    `ARTIST_OR_ORGANIZER_NAME=${optional("ARTIST_OR_ORGANIZER_NAME") || "Test organizer"}`,
    `EXHIBITION_NAME=${optional("EXHIBITION_NAME") || "DECOY test"}`,
    `CONTACT_EMAIL=${optional("CONTACT_EMAIL") || "test@example.com"}`,
  ];
  if (optional("GALLERY_LATITUDE")) secretPairs.push(`GALLERY_LATITUDE=${optional("GALLERY_LATITUDE")}`);
  if (optional("GALLERY_LONGITUDE")) secretPairs.push(`GALLERY_LONGITUDE=${optional("GALLERY_LONGITUDE")}`);
  if (optional("OPENAI_API_KEY")) secretPairs.push(`OPENAI_API_KEY=${optional("OPENAI_API_KEY")}`);
  if (optional("CLOUDFLARE_AI_GATEWAY_TOKEN")) {
    secretPairs.push(`CLOUDFLARE_AI_GATEWAY_TOKEN=${optional("CLOUDFLARE_AI_GATEWAY_TOKEN")}`);
    secretPairs.push(
      `CLOUDFLARE_ACCOUNT_ID=${optional("CLOUDFLARE_ACCOUNT_ID") || "7ad3dd38c4ca3189d079fb7efdc775f7"}`,
    );
    secretPairs.push(`CLOUDFLARE_AI_GATEWAY_ID=${optional("CLOUDFLARE_AI_GATEWAY_ID") || "decoy"}`);
  }
  await run("supabase", ["secrets", "set", ...secretPairs, "--project-ref", ref], {
    SUPABASE_ACCESS_TOKEN: accessToken,
  });

  const functionNames = [
    "participant-status",
    "verify-location",
    "submit-description",
    "tablet-state",
    "tablet-heartbeat",
    "tablet-claim",
    "tablet-generate",
    "tablet-displayed",
  ];
  await run("supabase", ["functions", "deploy", ...functionNames, "--project-ref", ref, "--yes"], {
    SUPABASE_ACCESS_TOKEN: accessToken,
  });
  console.log("Edge Functions deployed");

  const visitorEnv = {
    VITE_SUPABASE_URL: state.supabaseUrl ?? "",
    VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
    VITE_ARTIST_OR_ORGANIZER_NAME: optional("ARTIST_OR_ORGANIZER_NAME") || "Test organizer",
    VITE_EXHIBITION_NAME: optional("EXHIBITION_NAME") || "DECOY test",
    VITE_CONTACT_EMAIL: optional("CONTACT_EMAIL") || "test@example.com",
    VITE_TERMS_VERSION: optional("TERMS_VERSION") || "1.0",
    VITE_DATA_RETENTION_DESCRIPTION:
      optional("DATA_RETENTION_DESCRIPTION") ||
      "This test installation keeps participation records until the exhibition ends, then deletes them.",
  };
  writeFileSync(
    join(ROOT, "apps/visitor-web/.env.production.local"),
    Object.entries(visitorEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );

  const tabletEnv = [
    `VITE_SUPABASE_URL=${state.supabaseUrl}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
    `VITE_API_BASE_URL=${state.supabaseUrl}/functions/v1`,
    `VITE_APP_VERSION=0.1.0`,
    `VITE_IMAGE_FIT=cover`,
  ].join("\n");
  writeFileSync(join(ROOT, "apps/tablet/.env.production.local"), tabletEnv + "\n", { mode: 0o600 });
  await provisionTablets(state.supabaseUrl ?? "", secret);

  if (!optional("CLOUDFLARE_API_TOKEN")) {
    console.log("\nSupabase bootstrap complete. Cloudflare token was not provided, so the visitor domain was not published.");
    console.log(`Intended visitor URL: ${visitorOrigin}`);
    console.log(`Supabase: ${state.supabaseUrl}`);
    console.log("Visitor and tablet production env files were written locally (gitignored).");
    if (!optional("GALLERY_LATITUDE") || !optional("GALLERY_LONGITUDE")) {
      console.log("Gallery coordinates were not set; location checks will fail until they are.");
    }
    if (!optional("OPENAI_API_KEY")) {
      console.log("OPENAI_API_KEY was not set; mock image generation remains enabled.");
    }
    return;
  }

  let accountId = optional("CLOUDFLARE_ACCOUNT_ID");
  if (!accountId) {
    const accounts = await cloudflareApi("/accounts");
    const body = (await accounts.json()) as { result?: Array<{ id: string; name: string }> };
    accountId = body.result?.[0]?.id ?? "";
  }
  if (!accountId) {
    throw new Error("Could not determine Cloudflare account id");
  }

  const pagesProject = optional("CLOUDFLARE_PAGES_PROJECT") || "decoy-visitor";
  state.pagesProject = pagesProject;
  const createProject = await cloudflareApi(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    body: JSON.stringify({
      name: pagesProject,
      production_branch: "main",
    }),
  });
  if (createProject.status !== 409 && !createProject.ok) {
    const text = await createProject.text();
    if (!/already exists|Duplicate/i.test(text)) {
      console.log("Pages project create:", createProject.status, text);
    }
  }

  await run("pnpm", ["--filter", "visitor-web", "build"], visitorEnv);
  const deployOut = await run(
    "npx",
    [
      "wrangler",
      "pages",
      "deploy",
      "apps/visitor-web/dist",
      "--project-name",
      pagesProject,
      "--branch",
      "main",
      "--commit-dirty",
      "true",
    ],
    {
      CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN"),
      CLOUDFLARE_ACCOUNT_ID: accountId,
    },
  );
  console.log(deployOut);
  const pagesUrlMatch = deployOut.match(/https:\/\/[a-z0-9.-]+\.pages\.dev/i);
  const pagesUrl = pagesUrlMatch?.[0] ?? `https://${pagesProject}.pages.dev`;
  state.pagesUrl = pagesUrl;
  saveState(state);

  const customDomain = visitorDomain;
  let publicOrigin = pagesUrl;
  if (customDomain) {
    const addDomain = await cloudflareApi(
      `/accounts/${accountId}/pages/projects/${pagesProject}/domains`,
      {
        method: "POST",
        body: JSON.stringify({ name: customDomain }),
      },
    );
    console.log("Custom domain attach:", addDomain.status, await addDomain.text());
    const zones = await cloudflareApi("/zones");
    const zoneBody = (await zones.json()) as { result?: Array<{ id: string; name: string }> };
    const zone = zoneBody.result?.find(
      (item) => customDomain === item.name || customDomain.endsWith(`.${item.name}`),
    );
    if (zone) {
      const isApex = customDomain === zone.name;
      if (isApex) {
        console.log(`Zone ${zone.name} is on this account; Pages will flatten the apex to the project.`);
      } else {
        await cloudflareApi(`/zones/${zone.id}/dns_records`, {
          method: "POST",
          body: JSON.stringify({
            type: "CNAME",
            name: customDomain,
            content: `${pagesProject}.pages.dev`,
            proxied: true,
          }),
        });
        console.log(`Created proxied CNAME ${customDomain} -> ${pagesProject}.pages.dev`);
      }
    } else {
      console.log("Custom domain is not in this Cloudflare account; DNS was not created automatically.");
    }
    publicOrigin = `https://${customDomain}`;
    state.customDomain = customDomain;
    saveState(state);
  }

  await run(
    "supabase",
    ["secrets", "set", `VISITOR_WEB_ORIGIN=${publicOrigin}`, "--project-ref", ref],
    { SUPABASE_ACCESS_TOKEN: accessToken },
  );

  console.log("\nHosted bootstrap complete.");
  console.log(`Visitor URL: ${publicOrigin}`);
  console.log(`Supabase: ${state.supabaseUrl}`);
  console.log("Local privileged details were written to .hosted-bootstrap.local.json (gitignored).");
  if (!optional("GALLERY_LATITUDE") || !optional("GALLERY_LONGITUDE")) {
    console.log("Gallery coordinates were not set; location checks will fail until they are.");
  }
  if (!optional("OPENAI_API_KEY")) {
    console.log("OPENAI_API_KEY was not set; mock image generation remains enabled.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
