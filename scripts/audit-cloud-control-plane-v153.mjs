import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PersistentCloudTenantRegistry } from "../cloud/control-plane/PersistentCloudTenantRegistry.mjs";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); else console.log(`[v153-audit] PASS: ${message}`); };
const relay = read("cloud/relay-server/relayServer.mjs");
const wsServer = read("cloud/relay-server/webSocketServer.mjs");
const edge = read("cloud/relay-server/securityLimits.mjs");
const registrySource = read("cloud/control-plane/PersistentCloudTenantRegistry.mjs") + "\n" + read("cloud/control-plane/cloudControlSchema.mjs");
const controlApi = read("cloud/control-plane/controlPlaneApi.mjs");
const controlCli = read("cloud/control-plane/cli.mjs");
const connector = read("server/cloud/localCloudConnector.ts");
const protocol = read("server/cloud/cloudRelayProtocol.ts");
const runtimeProtocol = read("server/cloud/cloudRelayProtocolRuntime.mjs");
const gateway = read("scripts/serve-miniapp-gateway.mjs");
const enrollment = read("server/cloud/cloudEnrollment.ts");
const settings = read("server/routes/settings.routes.ts");
const index = read("cloud/relay-server/index.mjs");
const productionConfig = read("cloud/runtime/cloudProductionConfig.mjs");
const panel = read("pages/settings/SettingsTelegramPanel.tsx");

check((relay.match(/\.ws\.send\(/g) || []).length === 1 && /const sendBounded[\s\S]*connection\.ws\.send\(serialized\)/.test(relay), "Relay envelopes have one centralized bounded WebSocket send site");
check(!/response\.text\(\)/.test(relay) && /readFetchResponseBounded/.test(relay), "Telegram response reading is bounded and does not use unbounded response.text()");
check(/maxFrameBytes/.test(wsServer) && /body\.length > this\.#maxFrameBytes/.test(wsServer), "WebSocket implementation has a second outbound frame-size defense");
check(/maxRawDiagnosticBytes/.test(relay) && /data: data \?\? diagnosticRawText \?\? null/.test(relay), "Telegram parsed data is authoritative and raw diagnostics are bounded");
check(/clientContext:\{ip:clientIp\}/.test(relay) && /x-kourosh-relay-client-ip/.test(connector), "Cloud-computed client identity is carried through authenticated relay metadata");
check(!edge.toLowerCase().includes("x-forwarded-for") && /req\?\.socket\?\.remoteAddress/.test(edge), "Cloud public X-Forwarded-For is never a client identity source");
check(/trusted_loopback_edge/.test(edge) && /timingSafeEqual/.test(edge) && /cloudflareTrustedProxyIps/.test(edge), "Trusted edge profiles require explicit trust contracts");
check(/cloud_relay_internal/.test(gateway) && /x-kourosh-relay-auth/.test(gateway) && /peerLoopback/.test(gateway) && /assignment\?\.assignedHost/.test(gateway), "Internal Gateway requires loopback, local relay authentication and assigned Host");
check(/self_hosted/.test(gateway) && /expectedHost/.test(gateway) && /requestHost\(req\) !== expectedHost/.test(gateway) && /421/.test(gateway), "Self-hosted exact public-host contract remains enforced");
check(/authDeadlineMs/.test(relay) && /maxUnauthenticatedConnectionsPerIp/.test(relay) && /connectorAttemptsPerMinute/.test(relay), "Unauthenticated connector lifetime, per-IP cap and attempt rate are bounded");
check(/BoundedWindowRateLimiter/.test(edge) && /maxEntries/.test(edge), "Connection/public rate-limiter state has a bounded map");
check(relay.includes("publicTenantRequestLimiter.check(`${tenant.installationId}|${clientIp}`)") && relay.includes("publicGlobalRequestLimiter.check(clientIp)"), "Cloud public rate limiting has tenant+client isolation plus a separate global client safety cap");
check(/validateCloudRelayEnvelopeRuntime/.test(relay) && /validateCloudRelayEnvelopeRuntime/.test(protocol) && /TTL_TOO_LARGE/.test(runtimeProtocol), "Relay and TypeScript protocol validation share one runtime validator");
check(/KOUROSH_CLOUD_CONTROL_DB_PATH/.test(registrySource) && /node:sqlite/.test(registrySource), "Persistent Cloud metadata DB is runtime-configured SQLite without an ORM");
check(/assigned_host TEXT NOT NULL COLLATE NOCASE UNIQUE/.test(registrySource), "Assigned Host uniqueness is case-insensitive at the database layer");
check(/public_key_fingerprint TEXT NOT NULL UNIQUE/.test(registrySource) && /assigned_store_id TEXT NOT NULL UNIQUE/.test(registrySource), "Store ID and public-key fingerprint uniqueness are database-enforced");
check(/crypto\.randomBytes\(32\)/.test(registrySource) && /code_hash/.test(registrySource) && /used_at/.test(registrySource) && /expires_at/.test(registrySource), "Enrollment credentials are high-entropy, hashed, expiring and single-use");
check(/canonicalEd25519PublicKey/.test(registrySource) && /fingerprint\(canonical\)/.test(registrySource), "Cloud recomputes Ed25519 public-key fingerprint server-side");
check(/tenant_status TEXT NOT NULL CHECK\(tenant_status IN \('active','suspended','revoked'\)\)/.test(registrySource), "Tenant lifecycle supports active/suspended/revoked states");
check(/credential_version=credential_version\+1/.test(registrySource) && /public_key_pem=\?/.test(registrySource), "Key rotation is versioned and replaces the active public key");
check(/create-recovery/.test(controlCli) && /revoke --store-id/.test(controlCli), "Recovery and revocation operator actions require explicit store IDs");
check(/KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN/.test(productionConfig) && /KOUROSH_CLOUD_CONNECTOR_PUBLIC_ENDPOINT/.test(productionConfig), "Cloud base domain and connector endpoint are runtime configuration");
check(/KOUROSH_CLOUD_INSTANCE_COUNT/.test(productionConfig) && /supports exactly one Relay instance/.test(productionConfig), "v153 explicitly hard-fails multi-instance configuration");
check(/\/control\/v1\/enroll/.test(controlApi) && /64\*1024/.test(controlApi) && /BoundedWindowRateLimiter/.test(controlApi), "Enrollment API is minimal, body-bounded and rate-limited");
check(/readControlResponseBounded/.test(enrollment) && !/response\.text\(\)/.test(enrollment), "Local enrollment also bounds Control Plane responses");
check(/TENANT_EXISTS/.test(settings) && /takeover خودکار مجاز نیست/.test(settings), "Existing/lost-key installations cannot auto-enroll or take over a tenant");
check(/rotate-key/.test(settings) && /recoveryCode/.test(settings), "Local key recovery/rotation requires an explicit recovery credential");
check(/فعال‌سازی (?:خدمات ابری|رله)/.test(panel) && /cloudEnrollmentCode/.test(panel) && /enrollmentAvailable/.test(panel), "Settings exposes real state-aware relay enrollment only when backend support exists");
check(!/domain|subdomain|ssl|vps|public ip/i.test(panel.match(/خدمات ابری کوروش[\s\S]{0,2200}/)?.[0] || "") || /بدون دامنه/.test(panel), "Cloud-managed activation does not require personal domain/VPS fields");

const cloudRoots = [path.join(root, "cloud")];
const cloudFiles = [];
for (const base of cloudRoots) {
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const full=path.join(dir,e.name); if(e.isDirectory()) walk(full); else if(/\.(?:mjs|js|ts|tsx)$/.test(e.name)) cloudFiles.push(full); } };
  walk(base);
}
const forbiddenImports = cloudFiles.filter((f) => /(?:from|import\()\s*["'][^"']*(?:server\/database|repositories\/(?:customer|partner|sales|installment|inventory|invoice)|financial)/i.test(fs.readFileSync(f,"utf8")));
check(forbiddenImports.length === 0, `Cloud code imports no Local business/financial database modules${forbiddenImports.length ? `: ${forbiddenImports.map((f)=>path.relative(root,f)).join(", ")}` : ""}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v153-audit-"));
const dbPath = path.join(temp, "control.sqlite");
initializeCloudControlDatabase({config:{runtimeDataDir:temp,controlDbPath:dbPath,backupDir:path.join(temp,"backups")}});
const db = new PersistentCloudTenantRegistry({ dbPath });
const schemaText = db.listSchema().map((row) => `${row.name}\n${row.sql || ""}`).join("\n").toLowerCase();
const forbiddenSchema = ["customers", "customer_ledger", "partner_ledger", "sales", "installments", "inventory", "invoices", "profit", "imei", "bot_token", "initdata", "bearer"];
check(forbiddenSchema.every((term) => !schemaText.includes(term)), "Persistent Cloud schema contains no business/financial data, Bot Token, initData or bearer session fields");
check(db.listTenants().length === 0, "Fresh Cloud metadata DB contains no business records");
db.close(); fs.rmSync(temp,{recursive:true,force:true});

if (failures.length) { for (const failure of failures) console.error(`[v153-audit] FAIL: ${failure}`); process.exit(1); }
console.log("[v153-audit] Cloud security/control-plane architecture audit completed successfully.");
