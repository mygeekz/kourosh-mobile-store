import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => { console.error(`[v152-audit] FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`[v152-audit] PASS: ${message}`);
const assert = (condition, message) => condition ? pass(message) : fail(message);
const files = {
  connector: read("server/cloud/localCloudConnector.ts"),
  runtime: read("server/cloud/cloudConnectorRuntime.ts"),
  readiness: read("server/cloud/cloudConnectorReadiness.ts"),
  credentials: read("server/cloud/connectorCredentialStore.ts"),
  protocol: read("server/cloud/cloudRelayProtocol.ts"),
  tenantInterface: read("server/cloud/CloudTenantRegistry.ts"),
  registry: read("cloud/relay-server/tenantRegistry.mjs"),
  relay: read("cloud/relay-server/relayServer.mjs"),
  cloudTransport: read("server/telegram/CloudTelegramTransport.ts"),
  directTransport: read("server/telegram/DirectTelegramTransport.ts"),
  transportRuntime: read("server/telegram/telegramTransportRuntime.ts"),
  telegramFacade: read("server/telegramService.ts"),
  gateway: read("scripts/serve-miniapp-gateway.mjs"),
  gatewayPolicy: read("server/miniapp/miniAppGatewayPolicy.mjs"),
  settingsRoutes: read("server/routes/settings.routes.ts"),
  app: read("server/app.ts"),
  lifecycle: read("server/bootstrap/serverLifecycle.ts"),
  telegramPanel: read("pages/settings/SettingsTelegramPanel.tsx"),
};

assert(!/\.listen\s*\(|createServer\s*\(/.test(files.connector), "Local Cloud Connector owns zero inbound listeners");
assert(/url\.protocol === "wss:"/.test(files.connector) && /test|development/.test(files.connector) && /127\.0\.0\.1/.test(files.connector), "Connector enforces WSS outside explicit loopback development/test mode");
assert(/generateKeyPairSync\("ed25519"/.test(files.credentials) && /sign\(null/.test(files.credentials), "Connector authentication uses runtime Ed25519 signing material");
assert(/challengeId/.test(files.relay) && /nonce/.test(files.relay) && /challengeTtlMs/.test(files.relay) && /crypto\.verify/.test(files.relay), "Relay authentication is nonce/challenge based and signature verified");
assert(!/installationId\s*===?\s*[^\n]*(authenticated|authorized)/i.test(files.relay), "installation_id is not used as sole authentication proof");
assert(/new Map/.test(files.relay) && /pendingByTenant/.test(files.relay) && /pendingByTenant\.get\(installationId\)/.test(files.relay), "Pending correlation is tenant-scoped");
assert(/assignConnection/.test(files.relay) && /connector_replaced/.test(files.relay), "Authenticated duplicate-connection replacement policy is explicit");
assert(/telegramToken\s*=\s*null/.test(files.relay) && !/writeFile|appendFile|sqlite|database/i.test(files.relay), "Cloud Bot token is in-memory only and cleared on disconnect");
assert(/METHOD_PATTERN\s*=\s*\/\^\[A-Za-z\]/.test(files.relay) && /\/bot\$\{connection\.telegramToken\}\/\$\{method\}/.test(files.relay), "Cloud constructs Bot API target from a validated method, not a client URL");
assert(!files.cloudTransport.includes("api.telegram.org"), "CloudTelegramTransport contains no Telegram network endpoint");
assert(files.directTransport.includes("https://api.telegram.org"), "DirectTelegramTransport retains official Telegram endpoint");
assert(/getActiveTelegramTransport/.test(files.telegramFacade) && !/directTelegramTransport/.test(files.telegramFacade), "Telegram facade resolves active transport instead of hard-wiring Direct mode");
assert(/let mode: TelegramTransportMode = "direct"/.test(files.transportRuntime) && !/getSetting|database|settingsDb|SELECT/i.test(files.transportRuntime), "Telegram transport mode is runtime-cached with no per-call Settings DB query");
assert(!/fallback/i.test(files.transportRuntime) && /relayTelegramTransport/.test(files.transportRuntime), "Relay transport selection has no automatic Direct fallback");
assert(files.gateway.includes("miniAppGatewayPolicy.mjs") && files.relay.includes("miniAppGatewayPolicy.mjs"), "Self-hosted Gateway and Cloud Relay reuse one Mini App boundary policy");
assert(files.gatewayPolicy.includes('POST') && files.gatewayPolicy.includes('/api/miniapp/auth') && files.gatewayPolicy.includes('/api/miniapp/customer/') && !files.gatewayPolicy.includes('/api/*'), "Mini App policy is explicit and does not expose full /api wildcard");
assert(/127\.0\.0\.1:4180/.test(files.connector) && !/127\.0\.0\.1:3001/.test(files.connector), "Cloud Mini App forwarding targets the loopback Mini App Gateway, not full backend");
assert(/resolvePublicHost/.test(files.relay) && /host/.test(files.relay), "Public Mini App tenant routing is host-based");
assert(/maxPendingPerTenant/.test(files.protocol) && /wireMessageBytes/.test(files.protocol) && /telegramBinaryBytes/.test(files.protocol) && /heartbeatTimeoutMs/.test(files.protocol), "Protocol defines bounded messages, pending requests and heartbeat timeout");
assert(/expiresAt/.test(files.protocol) && /UNSUPPORTED_PROTOCOL_VERSION/.test(files.protocol) && /UNKNOWN_MESSAGE_TYPE/.test(files.protocol), "Protocol rejects expired, unknown-version and unknown-type envelopes");
assert(/CloudTenantRegistry/.test(files.tenantInterface) && /getCredential/.test(files.tenantInterface) && /resolvePublicHost/.test(files.tenantInterface), "CloudTenantRegistry provisioning seam is explicit");
assert(/MemoryCloudTenantRegistry/.test(files.registry) && !/sqlite|postgres|mysql|redis|mongodb/i.test(files.registry), "v152 tenant registry is in-memory only with no production persistence claim");
assert(/RELAY_NOT_READY/.test(files.settingsRoutes) && /validateRelayTelegramOperational/.test(files.settingsRoutes), "Relay Telegram mode save is readiness-gated");
assert(/RELAY_MINIAPP_NOT_READY/.test(files.settingsRoutes) && /validateRelayMiniAppOperational/.test(files.settingsRoutes), "Relay Mini App save is readiness-gated");
assert(!/cloud\/relay-server/.test(files.app), "Store application startup does not start the Cloud Relay server");
assert(/(?:Cloud|Relay) Connector initialization failed; Local Kourosh will continue/.test(files.lifecycle) && /app\.listen/.test(files.lifecycle), "Cloud connector initialization failure cannot block Local Kourosh listener startup");
assert(!files.telegramPanel.includes("آماده‌سازی اتصال ابری"), "Production Settings UI does not expose a fake provisioning button before Phase 11 control plane");
assert(/kourosh_cloud_telegram_relay_healthy/.test(files.readiness) && /kourosh_cloud_miniapp_relay_healthy/.test(files.readiness), "Canonical Cloud readiness distinguishes provisioning, connection and relay health");

const runtimeRoots = ["server", "cloud"];
const sourceFiles = [];
for (const base of runtimeRoots) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "tests") walk(full); continue; }
      if (/\.(?:ts|tsx|mjs|js)$/.test(entry.name)) sourceFiles.push(full);
    }
  };
  walk(path.join(root, base));
}
const telegramEndpointOwners = sourceFiles.filter((file) => fs.readFileSync(file, "utf8").includes("https://api.telegram.org")).map((file) => path.relative(root, file).replaceAll("\\", "/"));
assert(telegramEndpointOwners.length === 2 && telegramEndpointOwners.includes("server/telegram/DirectTelegramTransport.ts") && telegramEndpointOwners.includes("cloud/relay-server/relayServer.mjs"), `Telegram endpoint is centralized to Direct transport and Cloud relay (${telegramEndpointOwners.join(", ")})`);

const cloudFiles = sourceFiles.filter((file) => path.relative(root, file).replaceAll("\\", "/").startsWith("cloud/"));
const cloudBusinessImports = cloudFiles.filter((file) => /(?:from|import\()\s*["'][^"']*(?:server\/database|repositories\/(?:customer|partner|sales|installment|inventory|invoice)|financial)/i.test(fs.readFileSync(file, "utf8"))).map((file) => path.relative(root, file));
assert(cloudBusinessImports.length === 0, `Cloud Relay imports no Local financial/business database modules${cloudBusinessImports.length ? `: ${cloudBusinessImports.join(", ")}` : ""}`);
const cloudSchemaSource = read("cloud/control-plane/cloudControlSchema.mjs");
assert(/const forbiddenSchema=/.test(cloudSchemaSource) && /CLOUD_BUSINESS_SCHEMA_DETECTED/.test(cloudSchemaSource) && /assertCurrentCloudControlDatabaseConnection/.test(cloudSchemaSource), "Persistent Cloud metadata schema actively rejects Local business/financial tables and Bot Token fields");

const phaseDomainAuditFiles = sourceFiles.filter((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  return relative.startsWith("server/cloud/") || relative.startsWith("server/telegram/") || relative.startsWith("cloud/") || relative === "server/connectivity/telegramPublicAccess.ts" || relative === "server/connectivity/telegramReadinessProfiles.ts";
});
const sourceText = phaseDomainAuditFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const suspiciousDomains = [...sourceText.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)].map((match) => match[1].toLowerCase()).filter((host) => !["api.telegram.org", "localhost", "127.0.0.1", "example.com", "example.invalid"].includes(host) && !host.endsWith(".example.invalid") && !host.endsWith(".invalid"));
assert(suspiciousDomains.length === 0, `No store-specific/production domain is hard-coded${suspiciousDomains.length ? `: ${[...new Set(suspiciousDomains)].join(", ")}` : ""}`);

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.engines?.node === "^22.17.0 || >=24.0.0", "Package Node engine remains ^22.17.0 || >=24.0.0");

if (process.exitCode) process.exit(process.exitCode);
console.log("[v152-audit] Cloud Relay architecture audit completed successfully.");
