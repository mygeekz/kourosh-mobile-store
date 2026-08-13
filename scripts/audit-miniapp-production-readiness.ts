import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { evaluateTelegramReadinessProfile } from "../server/connectivity/telegramReadinessProfiles";

type Level = "PASS" | "WARN" | "FAIL";
type Result = { level: Level; check: string; detail: string };
const root = process.cwd();
const results: Result[] = [];
const add = (level: Level, check: string, detail: string) => results.push({ level, check, detail });
const exists = (relative: string) => fs.existsSync(path.join(root, relative));
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

const loadReadOnlySettings = (): Record<string, string> => {
  const candidates = [process.env.KOUROSH_DB_PATH, path.join(root, "server/kourosh_inventory.db")].filter(Boolean) as string[];
  const dbPath = candidates.find((candidate) => fs.existsSync(path.resolve(candidate)));
  if (!dbPath) return {};
  try {
    const db = new DatabaseSync(path.resolve(dbPath), { readOnly: true });
    const rows = db.prepare(`SELECT key,value FROM settings WHERE key IN (
      'miniapp_public_access_mode',
      'telegram_public_access_mode',
      'telegram_miniapp_public_url',
      'relay_provider',
      'telegram_bot_username',
      'kourosh_cloud_provisioned',
      'kourosh_cloud_assigned_public_url'
    )`).all() as Array<{ key: string; value: string }>;
    db.close();
    return Object.fromEntries(rows.map((row) => [String(row.key), String(row.value || "")]));
  } catch {
    add("WARN", "settings database", "Production settings database could not be read in read-only mode.");
    return {};
  }
};

for (const file of [
  "scripts/serve-miniapp-gateway.mjs",
  "vite.miniapp.config.ts",
  "vite.shared.config.ts",
  "miniapp.html",
  "server/miniapp/miniAppSession.ts",
]) add(exists(file) ? "PASS" : "FAIL", `file ${file}`, exists(file) ? "present" : "missing");

if (exists("scripts/serve-miniapp-gateway.mjs")) {
  const gateway = read("scripts/serve-miniapp-gateway.mjs");
  add(gateway.includes('KOUROSH_MINIAPP_GATEWAY_HOST || "127.0.0.1"') ? "PASS" : "FAIL", "gateway bind", "default must be 127.0.0.1:4180 boundary");
  add(gateway.includes('path.join(rootDir, "dist-miniapp")') ? "PASS" : "FAIL", "static root", "dist-miniapp only");
  add(gateway.includes('pathname === "/api/miniapp/auth"') && gateway.includes('pathname.startsWith("/api/miniapp/staff/")') ? "PASS" : "FAIL", "API allowlist", "explicit Mini App method/path rules");
  add(!/proxy[^\n]{0,80}pathname\.startsWith\(["']\/api\//i.test(gateway) ? "PASS" : "FAIL", "no full API proxy", "no wildcard /api/* proxy rule");
  add(!gateway.includes('"/uploads"') ? "PASS" : "FAIL", "uploads boundary", "/uploads is not public");
}

if (exists("server/bootstrap/serverLifecycle.ts")) {
  const lifecycle = read("server/bootstrap/serverLifecycle.ts");
  add(lifecycle.includes('KOUROSH_API_BIND_HOST || "127.0.0.1"') ? "PASS" : "FAIL", "backend bind", "127.0.0.1 default; backend ownership remains port 3001");
}

if (exists("vite.miniapp.config.ts")) {
  const config = read("vite.miniapp.config.ts");
  add(config.includes("publicDir: false") && config.includes('outDir: "dist-miniapp"') ? "PASS" : "FAIL", "Mini App build isolation", "no Dashboard public directory or output");
  add(config.includes("sourcemap: false") ? "PASS" : "WARN", "source maps", "production source maps disabled");
}

const dbSettings = loadReadOnlySettings();
const settings = {
  miniapp_public_access_mode: process.env.KOUROSH_MINIAPP_PUBLIC_ACCESS_MODE || dbSettings.miniapp_public_access_mode,
  telegram_public_access_mode: process.env.KOUROSH_TELEGRAM_PUBLIC_ACCESS_MODE || dbSettings.telegram_public_access_mode,
  relay_provider: process.env.KOUROSH_RELAY_PROVIDER || dbSettings.relay_provider,
  telegram_miniapp_public_url: process.env.KOUROSH_TELEGRAM_MINIAPP_PUBLIC_URL || dbSettings.telegram_miniapp_public_url,
  telegram_bot_username: process.env.KOUROSH_TELEGRAM_BOT_USERNAME || dbSettings.telegram_bot_username,
  kourosh_cloud_provisioned: process.env.KOUROSH_CLOUD_PROVISIONED || dbSettings.kourosh_cloud_provisioned,
  kourosh_cloud_assigned_public_url: process.env.KOUROSH_CLOUD_ASSIGNED_PUBLIC_URL || dbSettings.kourosh_cloud_assigned_public_url,
};
const profile = evaluateTelegramReadinessProfile(settings, process.env.KOUROSH_MINIAPP_PUBLIC_HOST, "production");
add("PASS", "public access profile", `${profile.mode} (${profile.profileStatus})`);

if (profile.mode === "disabled") {
  add("PASS", "public hostname", "NOT_REQUIRED — Mini App deliberately disabled.");
  add("PASS", "gateway readiness", "NOT_REQUIRED — Bot-only operation does not require a public gateway.");
  add("PASS", "BotFather Main Mini App", "NOT_REQUIRED while Mini App is disabled.");
} else if (profile.mode === "relay") {
  add(profile.operational ? "PASS" : "WARN", "relay provisioning", profile.operational ? "Selected Relay Provider public access is operational." : profile.profileStatus);
  add("PASS", "store public hostname", "NOT_REQUIRED — Relay mode does not require a store-owned domain.");
  add("PASS", "store public gateway", "NOT_REQUIRED — Relay Provider owns public ingress while Local Gateway remains loopback-only.");
} else {
  add(profile.requirements.publicUrl.ok ? "PASS" : "FAIL", "public URL", profile.requirements.publicUrl.code);
  add(profile.requirements.gateway.ok ? "PASS" : "FAIL", "gateway public host", profile.requirements.gateway.code);
  add(profile.requirements.hostConsistency.ok ? "PASS" : "FAIL", "public host consistency", profile.requirements.hostConsistency.code);
  add(profile.endpointIsCanonical ? "PASS" : "FAIL", "public endpoint", profile.endpointIsCanonical ? "canonical root/miniapp.html endpoint" : "URL must use / or /miniapp.html without query or fragment");
  add(profile.requirements.botUsername.ok ? "PASS" : "FAIL", "bot username", profile.requirements.botUsername.code);
  add(Boolean(profile.miniAppUrl) ? "PASS" : "FAIL", "Mini App URL resolver", "Self-Hosted/Tunnel use only the explicit public Mini App URL; no Local/app_base_url fallback.");
  add("WARN", "BotFather Main Mini App", "MANUAL_CHECK_REQUIRED; local code cannot prove BotFather configuration.");
}

const instances = Math.max(1, Number(process.env.KOUROSH_BACKEND_INSTANCE_COUNT || 1));
add(instances === 1 ? "PASS" : "FAIL", "single backend instance", instances === 1 ? "memory sessions target one backend instance" : "memory session store cannot serve multiple backend instances");
add(process.env.KOUROSH_MINIAPP_MEMORY_SESSIONS_ACK === "1" ? "PASS" : "WARN", "memory session acknowledgement", "sessions are revoked by process restart; users must reopen the Mini App");

const frontendFiles = ["miniapp.html", ...fs.readdirSync(path.join(root, "miniapp"), { recursive: true }).filter((name) => /\.(?:ts|tsx|css)$/.test(String(name))).map((name) => path.join("miniapp", String(name)))];
const forbiddenFrontend = /(localhost:3001|127\.0\.0\.1:3001|192\.168\.\d{1,3}\.\d{1,3}|telegram_bot_token|bot\d+:[A-Za-z0-9_-]{20,})/i;
const leaked = frontendFiles.filter((file) => forbiddenFrontend.test(read(file)));
add(leaked.length === 0 ? "PASS" : "FAIL", "frontend network/secrets", leaked.length === 0 ? "no internal API host or Bot token marker" : "forbidden marker found in Mini App source");

if (exists("dist-miniapp")) {
  const forbiddenOutputs = ["index.html", "sw.js", "manifest.webmanifest"].filter((file) => exists(path.join("dist-miniapp", file)));
  add(forbiddenOutputs.length === 0 ? "PASS" : "FAIL", "built static isolation", forbiddenOutputs.length === 0 ? "Dashboard/PWA entry files absent" : "forbidden Dashboard/PWA output present");
  add(exists("dist-miniapp/miniapp.html") && exists("dist-miniapp/kourosh-logo.svg") ? "PASS" : "FAIL", "built Mini App shell", "entry and used logo asset present");
} else add("WARN", "built artifact", "dist-miniapp is absent; run npm run build:miniapp when dependencies are available.");

for (const result of results) console.log(`${result.level.padEnd(4)} ${result.check}: ${result.detail}`);
const summary = Object.fromEntries((["PASS", "WARN", "FAIL"] as Level[]).map((level) => [level, results.filter((result) => result.level === level).length]));
console.log(`SUMMARY PASS=${summary.PASS} WARN=${summary.WARN} FAIL=${summary.FAIL}`);
if (summary.FAIL > 0) process.exitCode = 1;
