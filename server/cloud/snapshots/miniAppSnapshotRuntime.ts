import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allTypedAsync } from "../../db/query";
import { isValidInstallationId } from "../../connectivity/installationIdentity";
import {
  resolveMiniAppPublicAccessMode,
  validateMiniAppLiveOriginUrl,
  validateTelegramStableMiniAppCanonicalUrl,
} from "../../connectivity/telegramPublicAccess";
import { ensureConnectorCredential } from "../connectorCredentialStore";
import {
  buildCustomerMiniAppSnapshotCandidate,
  buildMiniAppSnapshotRevocationCandidate,
  buildPartnerMiniAppSnapshotCandidate,
} from "./miniAppSnapshotBuilder";
import { createMiniAppSnapshotSyncClient } from "./miniAppSnapshotSyncClient";

export type MiniAppSnapshotRuntimeReason =
  | "ready"
  | "stable_tunnel_required"
  | "public_edge_url_required"
  | "live_origin_required"
  | "public_and_live_origin_must_differ"
  | "installation_id_required"
  | "telegram_bot_id_required"
  | "credential_unavailable";

type SnapshotSubjectKind = "customer" | "partner";
type SnapshotSubject = { kind: SnapshotSubjectKind; localSubjectId: number; telegramUserId: string };
type PersistedSubject = SnapshotSubject & { snapshotVersion: number };
type RuntimeFile = { schemaVersion: 1; subjects: PersistedSubject[] };

type RuntimeConfig = {
  enabled: boolean;
  reason: MiniAppSnapshotRuntimeReason;
  tenantId: string | null;
  installationId: string | null;
  botId: string | null;
  credentialVersion: number;
  publicUrl: string | null;
  publicHost: string | null;
  liveOrigin: string | null;
  syncEndpoint: string | null;
};
export type MiniAppSnapshotProvisioningDescriptor =
  | { ready: false; config: RuntimeConfig }
  | { ready: true; config: RuntimeConfig; publicKeyPem: string; publicKeyFingerprint: string };

type RuntimeStatus = RuntimeConfig & {
  state: "disabled" | "not_ready" | "idle" | "syncing" | "degraded";
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  syncedSubjects: number;
  failedSubjects: number;
  nextRunAt: string | null;
};

const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;
const BOT_TOKEN_ID = /^([1-9][0-9]{0,19}):/;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_DEBOUNCE_MS = 10_000;
const stateFilePath = () => path.join(os.homedir(), ".kourosh", "runtime", "miniapp-snapshot-runtime.json");

const iso = () => new Date().toISOString();
const clampInterval = (value: unknown) => {
  const parsed = Number(value);
  const candidate = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
  return Math.min(30 * 60 * 1000, Math.max(60_000, candidate));
};
const deriveTenantId = (installationId: string) => `tenant_${installationId.slice("inst_".length)}`;
const botIdFromSettings = (settings: Record<string, unknown>): string | null => {
  const explicit = String(settings.telegram_bot_id || "").trim();
  if (/^[1-9][0-9]{0,19}$/.test(explicit)) return explicit;
  return String(settings.telegram_bot_token || "").trim().match(BOT_TOKEN_ID)?.[1] || null;
};

export const resolveMiniAppSnapshotRuntimeConfig = (
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig => {
  const mode = resolveMiniAppPublicAccessMode(settings, env.NODE_ENV || "production");
  if (mode !== "stable_tunnel") return { enabled: false, reason: "stable_tunnel_required", tenantId: null, installationId: null, botId: null, credentialVersion: 1, publicUrl: null, publicHost: null, liveOrigin: null, syncEndpoint: null };
  const publicUrl = validateTelegramStableMiniAppCanonicalUrl(settings.telegram_miniapp_public_url, env.NODE_ENV || "production");
  if (!publicUrl) return { enabled: false, reason: "public_edge_url_required", tenantId: null, installationId: null, botId: null, credentialVersion: 1, publicUrl: null, publicHost: null, liveOrigin: null, syncEndpoint: null };
  const liveOrigin = validateMiniAppLiveOriginUrl(settings.miniapp_live_origin_url, env.NODE_ENV || "production");
  if (!liveOrigin) return { enabled: false, reason: "live_origin_required", tenantId: null, installationId: null, botId: null, credentialVersion: 1, publicUrl, publicHost: new URL(publicUrl).hostname, liveOrigin: null, syncEndpoint: null };
  const publicOrigin = new URL(publicUrl).origin;
  if (publicOrigin === new URL(liveOrigin).origin) return { enabled: false, reason: "public_and_live_origin_must_differ", tenantId: null, installationId: null, botId: null, credentialVersion: 1, publicUrl, publicHost: new URL(publicUrl).hostname, liveOrigin, syncEndpoint: null };
  const installationId = String(settings.installation_id || "").trim();
  if (!isValidInstallationId(installationId)) return { enabled: false, reason: "installation_id_required", tenantId: null, installationId: null, botId: null, credentialVersion: 1, publicUrl, publicHost: new URL(publicUrl).hostname, liveOrigin, syncEndpoint: publicOrigin };
  const botId = botIdFromSettings(settings);
  if (!botId) return { enabled: false, reason: "telegram_bot_id_required", tenantId: deriveTenantId(installationId), installationId, botId: null, credentialVersion: 1, publicUrl, publicHost: new URL(publicUrl).hostname, liveOrigin, syncEndpoint: publicOrigin };
  const versionRaw = Number(settings.kourosh_cloud_credential_version || 1);
  const credentialVersion = Number.isSafeInteger(versionRaw) && versionRaw > 0 ? versionRaw : 1;
  const override = String(env.KOUROSH_MINIAPP_SNAPSHOT_SYNC_ENDPOINT || "").trim();
  const syncEndpoint = override || publicOrigin;
  return { enabled: true, reason: "ready", tenantId: deriveTenantId(installationId), installationId, botId, credentialVersion, publicUrl, publicHost: new URL(publicUrl).hostname, liveOrigin, syncEndpoint };
};

const readState = (): RuntimeFile => {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFilePath(), "utf8"));
    if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.subjects)) return { schemaVersion: 1, subjects: [] };
    return { schemaVersion: 1, subjects: parsed.subjects.filter((item: any) => ["customer", "partner"].includes(item?.kind) && Number.isSafeInteger(Number(item?.localSubjectId)) && Number(item.localSubjectId) > 0 && TELEGRAM_USER_ID.test(String(item?.telegramUserId || "")) && Number.isSafeInteger(Number(item?.snapshotVersion)) && Number(item.snapshotVersion) > 0) };
  } catch { return { schemaVersion: 1, subjects: [] }; }
};

const writeState = (state: RuntimeFile) => {
  const target = stateFilePath();
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state), { mode: 0o600, encoding: "utf8" });
  try { fs.chmodSync(temp, 0o600); } catch {}
  fs.renameSync(temp, target);
  try { fs.chmodSync(target, 0o600); } catch {}
};

const listSnapshotSubjects = async (): Promise<SnapshotSubject[]> => {
  // Identity discovery is fail-closed: a DB/query failure must abort this reconciliation.
  // Treating a failed query as an empty result could incorrectly publish revocation tombstones.
  const [customers, partners, staff] = await Promise.all([
    allTypedAsync<{ id: number; telegram_user_id: string }>("SELECT id, telegram_user_id FROM customers WHERE telegram_user_id IS NOT NULL AND TRIM(telegram_user_id) <> '' ORDER BY id ASC"),
    allTypedAsync<{ id: number; telegram_user_id: string }>("SELECT id, telegram_user_id FROM partners WHERE telegram_user_id IS NOT NULL AND TRIM(telegram_user_id) <> '' ORDER BY id ASC"),
    allTypedAsync<{ telegram_user_id: string }>("SELECT telegram_user_id FROM user_telegram_links WHERE telegram_user_id IS NOT NULL AND TRIM(telegram_user_id) <> '' ORDER BY user_id ASC"),
  ]);
  const staffIds = new Set(staff.map((row) => String(row.telegram_user_id || "").trim()).filter((id) => TELEGRAM_USER_ID.test(id)));
  const byTelegram = new Map<string, SnapshotSubject[]>();
  for (const [kind, rows] of [["customer", customers], ["partner", partners]] as const) {
    for (const row of rows) {
      const telegramUserId = String(row.telegram_user_id || "").trim();
      const localSubjectId = Number(row.id);
      if (!TELEGRAM_USER_ID.test(telegramUserId) || !Number.isSafeInteger(localSubjectId) || localSubjectId <= 0 || staffIds.has(telegramUserId)) continue;
      const values = byTelegram.get(telegramUserId) || [];
      values.push({ kind, localSubjectId, telegramUserId });
      byTelegram.set(telegramUserId, values);
    }
  }
  return [...byTelegram.values()].filter((items) => items.length === 1).flat();
};

let currentSettings: Record<string, unknown> = {};
let status: RuntimeStatus = { ...resolveMiniAppSnapshotRuntimeConfig({}), state: "disabled", lastRunAt: null, lastSuccessAt: null, lastErrorCode: null, syncedSubjects: 0, failedSubjects: 0, nextRunAt: null };
let intervalTimer: NodeJS.Timeout | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let running = false;
let generation = 0;

const safeLog = (event: string, meta: Record<string, unknown> = {}) => {
  const clean = Object.fromEntries(Object.entries(meta).filter(([key]) => !/(token|secret|credential|telegram|subject|private|body|authorization)/i.test(key)));
  console.info(JSON.stringify({ timestamp: iso(), event, ...clean }));
};

const scheduleNextLabel = (delay: number) => { status.nextRunAt = new Date(Date.now() + delay).toISOString(); };

export const runMiniAppSnapshotReconciliation = async (): Promise<RuntimeStatus> => {
  if (running) return { ...status };
  const config = resolveMiniAppSnapshotRuntimeConfig(currentSettings);
  status = { ...status, ...config, state: config.enabled ? "syncing" : "not_ready", lastRunAt: iso(), nextRunAt: null, syncedSubjects: 0, failedSubjects: 0 };
  if (!config.enabled || !config.installationId || !config.tenantId || !config.botId || !config.syncEndpoint) return { ...status };
  const credential = ensureConnectorCredential({ createIfMissing: true });
  if (!credential) { status.state = "not_ready"; status.reason = "credential_unavailable"; status.lastErrorCode = "MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_UNAVAILABLE"; return { ...status }; }
  running = true;
  try {
    const client = createMiniAppSnapshotSyncClient({ endpoint: config.syncEndpoint, installationId: config.installationId, credentialVersion: config.credentialVersion, signCanonical: credential.signChallenge, environment: process.env.NODE_ENV || "production", logger: safeLog });
    const persisted = readState();
    const previous = new Map(persisted.subjects.map((item) => [`${item.kind}:${item.localSubjectId}`, item]));
    let active: SnapshotSubject[];
    try {
      active = await listSnapshotSubjects();
    } catch (error: any) {
      const causeCode = String(error?.code || "SQLITE_ERROR");
      const wrapped = Object.assign(new Error("Mini App Snapshot identity discovery failed."), {
        code: "MINIAPP_SNAPSHOT_IDENTITY_DISCOVERY_FAILED",
        causeCode,
      });
      throw wrapped;
    }
    const activeKeys = new Set(active.map((item) => `${item.kind}:${item.localSubjectId}`));
    const nextPersisted: PersistedSubject[] = [];
    let synced = 0;
    let failed = 0;
    const syncOne = async (subject: SnapshotSubject, revoked = false): Promise<boolean> => {
      const key = `${subject.kind}:${subject.localSubjectId}`;
      const prior = previous.get(key);
      const snapshotVersion = Math.max(Date.now(), Number(prior?.snapshotVersion || 0) + 1);
      const context = { tenantId: config.tenantId!, installationId: config.installationId!, telegramUserId: subject.telegramUserId, snapshotVersion };
      try {
        const candidate = revoked
          ? buildMiniAppSnapshotRevocationCandidate(subject.kind, subject.localSubjectId, context)
          : subject.kind === "customer"
            ? await buildCustomerMiniAppSnapshotCandidate(subject.localSubjectId, context)
            : await buildPartnerMiniAppSnapshotCandidate(subject.localSubjectId, context);
        if (!candidate) throw Object.assign(new Error("Snapshot source data unavailable."), { code: "MINIAPP_SNAPSHOT_SOURCE_UNAVAILABLE" });
        const result = await client.syncCandidate(candidate, { botId: config.botId! });
        if (!result.ok) throw Object.assign(new Error(result.code), { code: result.code });
        synced += 1;
        if (!revoked) nextPersisted.push({ ...subject, snapshotVersion });
        return true;
      } catch (error: any) {
        failed += 1;
        status.lastErrorCode = String(error?.code || "MINIAPP_SNAPSHOT_SYNC_FAILED");
        // Retain any previous identity locally when either refresh or revocation fails,
        // so the next reconciliation retries instead of silently forgetting the tombstone.
        if (prior) nextPersisted.push(prior);
        safeLog("miniapp_snapshot_runtime_subject_failed", { kind: subject.kind, code: status.lastErrorCode });
        return false;
      }
    };
    // If a local record is re-bound to another Telegram identity, revoke the previous
    // subject key before publishing the replacement. This prevents the old Telegram
    // account from retaining an active offline snapshot until lease expiry.
    for (const subject of active) {
      const key = `${subject.kind}:${subject.localSubjectId}`;
      const prior = previous.get(key);
      if (prior && prior.telegramUserId !== subject.telegramUserId) {
        const revoked = await syncOne(prior, true);
        if (!revoked) continue;
        previous.delete(key);
      }
      await syncOne(subject, false);
    }
    for (const prior of persisted.subjects) if (!activeKeys.has(`${prior.kind}:${prior.localSubjectId}`)) await syncOne(prior, true);
    writeState({ schemaVersion: 1, subjects: nextPersisted });
    status.syncedSubjects = synced;
    status.failedSubjects = failed;
    status.state = failed > 0 ? "degraded" : "idle";
    if (failed === 0) { status.lastSuccessAt = iso(); status.lastErrorCode = null; }
    return { ...status };
  } catch (error: any) {
    status.state = "degraded";
    status.lastErrorCode = String(error?.code || "MINIAPP_SNAPSHOT_RECONCILIATION_FAILED");
    status.failedSubjects = Math.max(1, status.failedSubjects);
    safeLog("miniapp_snapshot_runtime_reconciliation_failed", {
      code: status.lastErrorCode,
      causeCode: String(error?.causeCode || error?.code || "UNKNOWN"),
      stage: status.lastErrorCode === "MINIAPP_SNAPSHOT_IDENTITY_DISCOVERY_FAILED" ? "identity_discovery" : "reconciliation",
    });
    return { ...status };
  } finally { running = false; }
};

export const initializeMiniAppSnapshotRuntime = (settings: Record<string, unknown>) => {
  currentSettings = { ...settings };
  generation += 1;
  const myGeneration = generation;
  if (intervalTimer) clearInterval(intervalTimer);
  if (debounceTimer) clearTimeout(debounceTimer);
  intervalTimer = null; debounceTimer = null;
  const config = resolveMiniAppSnapshotRuntimeConfig(currentSettings);
  status = { ...status, ...config, state: config.enabled ? "idle" : "not_ready", nextRunAt: null };
  if (!config.enabled) return { ...status };
  const intervalMs = clampInterval(process.env.KOUROSH_MINIAPP_SNAPSHOT_INTERVAL_MS);
  scheduleNextLabel(1500);
  debounceTimer = setTimeout(() => { if (myGeneration === generation) void runMiniAppSnapshotReconciliation(); }, 1500);
  intervalTimer = setInterval(() => { if (myGeneration === generation) void runMiniAppSnapshotReconciliation(); scheduleNextLabel(intervalMs); }, intervalMs);
  try { intervalTimer.unref(); debounceTimer.unref(); } catch {}
  return { ...status };
};

export const requestMiniAppSnapshotRefresh = (delayMs = DEFAULT_DEBOUNCE_MS) => {
  if (!status.enabled) return false;
  if (debounceTimer) clearTimeout(debounceTimer);
  const myGeneration = generation;
  scheduleNextLabel(delayMs);
  debounceTimer = setTimeout(() => { if (myGeneration === generation) void runMiniAppSnapshotReconciliation(); }, Math.max(1000, delayMs));
  try { debounceTimer.unref(); } catch {}
  return true;
};

export const stopMiniAppSnapshotRuntime = () => {
  generation += 1;
  if (intervalTimer) clearInterval(intervalTimer);
  if (debounceTimer) clearTimeout(debounceTimer);
  intervalTimer = null; debounceTimer = null;
};

export const getMiniAppSnapshotRuntimeStatus = () => ({ ...status });

export const getMiniAppSnapshotProvisioningDescriptor = (
  settings: Record<string, unknown>,
  options: { createCredentialIfMissing?: boolean } = {},
): MiniAppSnapshotProvisioningDescriptor => {
  const config = resolveMiniAppSnapshotRuntimeConfig(settings);
  if (!config.enabled || !config.installationId || !config.tenantId || !config.botId || !config.publicHost || !config.liveOrigin) return { ready: false, config };
  const credential = ensureConnectorCredential({ createIfMissing: options.createCredentialIfMissing === true });
  if (!credential) return { ready: false, config: { ...config, reason: "credential_unavailable" } };
  return {
    ready: true,
    config,
    publicKeyPem: credential.publicKeyPem,
    publicKeyFingerprint: credential.publicKeyFingerprint,
  };
};

export const prepareMiniAppSnapshotProvisioningDescriptor = (settings: Record<string, unknown>): MiniAppSnapshotProvisioningDescriptor =>
  getMiniAppSnapshotProvisioningDescriptor(settings, { createCredentialIfMissing: true });

const sqlQuote = (value: unknown) => `'${String(value ?? "").replace(/'/g, "''")}'`;

export const renderMiniAppSnapshotProvisioningSql = (descriptor: MiniAppSnapshotProvisioningDescriptor): string | null => {
  if (!descriptor.ready) return null;
  const { config, publicKeyPem } = descriptor;
  if (!config.installationId || !config.tenantId || !config.botId || !config.publicHost || !config.liveOrigin) return null;
  const now = iso();
  return [
    "INSERT INTO tenant_installations (installation_id, tenant_id, credential_version, installation_public_key_pem, bot_id, public_host, live_origin, status, created_at, updated_at)",
    `VALUES (${sqlQuote(config.installationId)}, ${sqlQuote(config.tenantId)}, ${Number(config.credentialVersion)}, ${sqlQuote(publicKeyPem)}, ${sqlQuote(config.botId)}, ${sqlQuote(config.publicHost)}, ${sqlQuote(config.liveOrigin)}, 'active', ${sqlQuote(now)}, ${sqlQuote(now)})`,
    "ON CONFLICT(installation_id) DO UPDATE SET",
    `tenant_id=excluded.tenant_id, credential_version=excluded.credential_version, installation_public_key_pem=excluded.installation_public_key_pem, bot_id=excluded.bot_id, public_host=excluded.public_host, live_origin=excluded.live_origin, status='active', updated_at=excluded.updated_at;`,
  ].join("\n");
};
