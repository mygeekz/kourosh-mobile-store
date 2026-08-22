import { createHash, createHmac, createPublicKey, verify as verifySignature } from "node:crypto";

const EDGE_VERSION = "v197";
const SNAPSHOT_SCHEMA_VERSION = "1";
const SNAPSHOT_MAX_BYTES = 512 * 1024;
const SNAPSHOT_SYNC_PATH = "/cloud/v1/miniapp/snapshots";
const SNAPSHOT_SYNC_MAX_BODY_BYTES = 544 * 1024;
const SNAPSHOT_SYNC_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SNAPSHOT_SYNC_REPLAY_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_PRODUCTION_PUBLIC_KEY_HEX = "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d";
const TELEGRAM_TEST_PUBLIC_KEY_HEX = "40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec";
const SESSION_AAD = new TextEncoder().encode("KOUROSH-MINIAPP-EDGE-SESSION-V1");
const API_MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{80,96}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const INSTALLATION_ID_PATTERN = /^inst_[A-Za-z0-9_-]{24}$/;
const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const BOT_ID_PATTERN = /^[1-9][0-9]{0,19}$/;
const SUBJECT_KEY_PATTERN = /^sub_[A-Za-z0-9_-]{32,128}$/;

const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});

const CSP = "default-src 'none'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'none'; form-action 'none'; object-src 'none'; manifest-src 'none'; worker-src 'none'";

const CUSTOMER_CAPABILITIES = [
  "customer:read_own",
  "customer:account:read_own",
  "customer:installments:read_own",
  "customer:invoices:read_own",
];
const PARTNER_CAPABILITIES = [
  "partner:read_own",
  "partner:ledger:read_own",
  "partner:purchases:read_own",
  "partner:phones:read_own",
];

const utf8Bytes = (value) => new TextEncoder().encode(String(value));
const utf8Text = (value) => new TextDecoder().decode(value);
const base64UrlEncode = (bytes) => Buffer.from(bytes).toString("base64url");
const base64UrlDecode = (value) => Buffer.from(String(value || ""), "base64url");
const sha256Hex = (value) => createHash("sha256").update(value).digest("hex");
const hmacSha256Base64Url = (secret, value) => createHmac("sha256", secret).update(value).digest("base64url");
const nowIso = () => new Date().toISOString();
const requestId = () => crypto.randomUUID().replace(/-/g, "");

const LIVE_OBSERVABILITY_EVENTS = new Set([
  "live_auth_success",
  "live_auth_timeout",
  "live_auth_5xx",
  "live_auth_unavailable",
  "live_auth_rejected",
  "live_read_success",
  "live_read_timeout",
  "live_read_5xx",
  "live_read_unavailable",
  "live_read_rejected",
]);

export const writeMiniAppEdgeLiveLog = (event, fields = {}, sink = console.info) => {
  if (!LIVE_OBSERVABILITY_EVENTS.has(event)) return;
  const record = {
    timestamp: nowIso(),
    event,
    edgeVersion: EDGE_VERSION,
    requestId: REQUEST_ID_PATTERN.test(String(fields.requestId || "")) ? String(fields.requestId) : undefined,
    route: String(fields.route || "").split("?")[0].slice(0, 160) || undefined,
    status: Number.isInteger(fields.status) ? fields.status : undefined,
    durationMs: Number.isFinite(fields.durationMs) ? Math.max(0, Math.round(fields.durationMs)) : undefined,
  };
  sink(JSON.stringify(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))));
};

const observeLiveResult = (operation, result, fields) => {
  if (result.kind === "unavailable") {
    writeMiniAppEdgeLiveLog(
      result.reason === "timeout" ? `live_${operation}_timeout` : `live_${operation}_unavailable`,
      { ...fields, durationMs: result.durationMs },
    );
    return;
  }
  if (result.status >= 500) {
    writeMiniAppEdgeLiveLog(`live_${operation}_5xx`, { ...fields, status: result.status, durationMs: result.durationMs });
  }
};

const numericEnv = (env, key, fallback, min, max) => {
  const parsed = Number(env?.[key]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const applyApiHeaders = (headers = new Headers()) => {
  headers.set("Cache-Control", "no-store");
  headers.set("X-Kourosh-Release", EDGE_VERSION);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return headers;
};

const jsonResponse = (status, payload, reqId, extraHeaders = {}) => {
  const headers = applyApiHeaders(new Headers({ "Content-Type": "application/json; charset=utf-8", ...extraHeaders }));
  if (reqId) headers.set("X-Kourosh-Request-Id", reqId);
  return new Response(JSON.stringify(reqId && payload && typeof payload === "object" ? { ...payload, requestId: reqId } : payload), { status, headers });
};

const success = (data, reqId, extraHeaders = {}) => jsonResponse(200, { success: true, data }, reqId, extraHeaders);
const failure = (status, code, message, reqId, extraHeaders = {}) => jsonResponse(status, { success: false, code, message }, reqId, extraHeaders);

const storageUnavailable = (reqId, message = "ذخیره‌سازی Edge موقتاً در دسترس نیست.") => failure(
  503,
  "MINIAPP_EDGE_STORAGE_UNAVAILABLE",
  message,
  reqId,
  { "Retry-After": "2" },
);

const sanitizeStorageErrorMessage = (error) => String(error?.message || error?.name || "D1_ERROR")
  .replace(/inst_[A-Za-z0-9_-]{24}/g, "inst_[redacted]")
  .replace(/tenant_[A-Za-z0-9._:-]{3,127}/g, "tenant_[redacted]")
  .replace(/\b[1-9][0-9]{7,19}\b/g, "[numeric-redacted]")
  .replace(/[A-Za-z0-9_-]{80,}/g, "[long-token-redacted]")
  .slice(0, 320);

const tryStorage = async (operation, stage = "storage") => {
  try { return { ok: true, value: await operation() }; }
  catch (error) {
    console.error(JSON.stringify({
      event: "miniapp_edge_storage_error",
      stage,
      errorName: String(error?.name || "Error").slice(0, 80),
      errorCode: String(error?.code || "D1_ERROR").slice(0, 120),
      errorMessage: sanitizeStorageErrorMessage(error),
    }));
    return { ok: false, error };
  }
};

const readJsonBody = async (request, maxBytes) => {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw Object.assign(new Error("REQUEST_BODY_TOO_LARGE"), { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw Object.assign(new Error("REQUEST_BODY_TOO_LARGE"), { status: 413 });
  try {
    return { value: JSON.parse(utf8Text(bytes)), raw: utf8Text(bytes), bytes: bytes.byteLength };
  } catch {
    throw Object.assign(new Error("REQUEST_JSON_INVALID"), { status: 400 });
  }
};

const readResponseBounded = async (response, maxBytes = API_MAX_RESPONSE_BYTES) => {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("LIVE_RESPONSE_TOO_LARGE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error("LIVE_RESPONSE_TOO_LARGE");
  const text = utf8Text(bytes);
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { throw new Error("LIVE_RESPONSE_INVALID_JSON"); }
  return { text, json };
};

const safeOrigin = (value) => {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    return url.origin;
  } catch {
    return null;
  }
};

const safePublicHost = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw.length > 253 || raw.includes("/") || raw.includes("\\") || raw.includes("@") || raw.includes(":")) return null;
  try {
    const url = new URL(`https://${raw}/`);
    if (url.hostname.toLowerCase() !== raw || url.port || url.username || url.password) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
};

const requestPublicHost = (request) => safePublicHost(new URL(request.url).hostname);

const sameOriginHeaderIsSafe = (request) => {
  const origin = String(request.headers.get("origin") || "").trim();
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.protocol === "https:" && !originUrl.port && safePublicHost(originUrl.hostname) === requestPublicHost(request) && !originUrl.username && !originUrl.password;
  } catch {
    return false;
  }
};

const isJsonContentType = (request) => /^application\/json(?:\s*;|$)/i.test(String(request.headers.get("content-type") || "").trim());

const parseTelegramUser = (raw) => {
  try {
    const user = JSON.parse(String(raw || ""));
    if (!Number.isSafeInteger(user?.id) || Number(user.id) <= 0 || typeof user?.first_name !== "string" || !user.first_name.trim()) return null;
    return { ...user, id: Number(user.id), first_name: user.first_name.trim() };
  } catch {
    return null;
  }
};

const telegramPublicKey = (environment, overrideHex = null) => {
  const hex = overrideHex || (environment === "test" ? TELEGRAM_TEST_PUBLIC_KEY_HEX : TELEGRAM_PRODUCTION_PUBLIC_KEY_HEX);
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(hex, "hex")]);
  return createPublicKey({ key: spki, format: "der", type: "spki" });
};

export const validateTelegramInitDataThirdParty = (initData, botId, options = {}) => {
  const raw = String(initData || "").trim();
  if (!BOT_ID_PATTERN.test(String(botId || ""))) throw Object.assign(new Error("MINIAPP_BOT_ID_INVALID"), { code: "MINIAPP_BOT_ID_INVALID" });
  if (!raw || raw.length > 16_384) throw Object.assign(new Error("MINIAPP_INIT_DATA_INVALID"), { code: "MINIAPP_INIT_DATA_INVALID" });
  const params = new URLSearchParams(raw);
  const signature = String(params.get("signature") || "").trim();
  if (!signature || !SIGNATURE_PATTERN.test(signature)) throw Object.assign(new Error("MINIAPP_INIT_DATA_SIGNATURE_INVALID"), { code: "MINIAPP_INIT_DATA_SIGNATURE_INVALID" });
  const lines = [...params.entries()]
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);
  const dataCheckString = `${botId}:WebAppData\n${lines.join("\n")}`;
  const valid = verifySignature(null, Buffer.from(dataCheckString, "utf8"), telegramPublicKey(options.environment, options.publicKeyHex), base64UrlDecode(signature));
  if (!valid) throw Object.assign(new Error("MINIAPP_INIT_DATA_SIGNATURE_INVALID"), { code: "MINIAPP_INIT_DATA_SIGNATURE_INVALID" });
  const authDate = Number(params.get("auth_date"));
  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const maxAgeSeconds = Math.max(30, Number(options.maxAgeSeconds || 300));
  if (!Number.isSafeInteger(authDate) || authDate <= 0) throw Object.assign(new Error("MINIAPP_AUTH_DATE_INVALID"), { code: "MINIAPP_AUTH_DATE_INVALID" });
  if (authDate > nowSeconds + 30) throw Object.assign(new Error("MINIAPP_AUTH_DATE_FUTURE"), { code: "MINIAPP_AUTH_DATE_FUTURE" });
  if (nowSeconds - authDate > maxAgeSeconds) throw Object.assign(new Error("MINIAPP_INIT_DATA_EXPIRED"), { code: "MINIAPP_INIT_DATA_EXPIRED" });
  const user = parseTelegramUser(params.get("user"));
  if (!user) throw Object.assign(new Error("MINIAPP_TELEGRAM_USER_INVALID"), { code: "MINIAPP_TELEGRAM_USER_INVALID" });
  return { authDate, user, startParam: params.get("start_param") || null };
};

const decodeBase64Secret = (value, minBytes, exactBytes = null) => {
  const text = String(value || "").trim();
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text)) throw new Error("EDGE_SECRET_INVALID");
  const bytes = base64UrlDecode(text);
  if (exactBytes !== null ? bytes.length !== exactBytes : bytes.length < minBytes) throw new Error("EDGE_SECRET_INVALID");
  return bytes;
};

export const deriveTelegramSubjectKey = (env, tenantId, botId, telegramUserId) => {
  const pepper = decodeBase64Secret(env.KOUROSH_EDGE_SUBJECT_PEPPER, 32);
  return `sub_${hmacSha256Base64Url(pepper, `${tenantId}\n${botId}\n${telegramUserId}`)}`;
};

const importSessionKey = async (env) => {
  const raw = decodeBase64Secret(env.KOUROSH_EDGE_SESSION_KEY, 32, 32);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const sealEdgeSession = async (env, payload) => {
  const key = await importSessionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8Bytes(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: SESSION_AAD }, key, plaintext);
  return `ke1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
};

export const openEdgeSession = async (env, token) => {
  const match = String(token || "").match(/^ke1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{32,4096})$/);
  if (!match) return null;
  try {
    const key = await importSessionKey(env);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlDecode(match[1]), additionalData: SESSION_AAD }, key, base64UrlDecode(match[2]));
    const payload = JSON.parse(utf8Text(new Uint8Array(decrypted)));
    if (payload?.v !== 1 || !TENANT_ID_PATTERN.test(payload.tenantId || "") || !BOT_ID_PATTERN.test(payload.botId || "")) return null;
    if (!SUBJECT_KEY_PATTERN.test(payload.subjectKey || "") || !["customer", "partner", "staff"].includes(payload?.identity?.kind)) return null;
    if (!safePublicHost(payload.publicHost) || safePublicHost(payload.publicHost) !== payload.publicHost) return null;
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    if (payload.liveOrigin && safeOrigin(payload.liveOrigin) !== payload.liveOrigin) return null;
    return payload;
  } catch {
    return null;
  }
};

const bearerToken = (request) => String(request.headers.get("authorization") || "").match(/^Bearer\s+([^\s]{32,8192})$/)?.[1] || null;

const miniAppRouteForStartParam = (value, role) => {
  const raw = String(value || "");
  if (role === "customer") {
    const basic = raw.match(/^v1_c_(home|account|purchases|installments)$/);
    if (basic) return { startParam: raw, route: basic[1] === "home" ? "/" : `/${basic[1]}` };
    const inst = raw.match(/^v1_c_inst_([1-9]\d*)(?:_([1-9]\d*))?$/);
    if (inst) return { startParam: raw, route: `/installments/${inst[1]}${inst[2] ? `?paymentId=${inst[2]}` : ""}` };
    const invoice = raw.match(/^v1_c_inv_(order|legacy)_([1-9]\d*)$/);
    if (invoice) return { startParam: raw, route: `/invoices/${invoice[1]}-${invoice[2]}` };
  }
  if (role === "partner") {
    const basic = raw.match(/^v1_p_(home|account|ledger|purchases|phones)$/);
    if (basic) return { startParam: raw, route: basic[1] === "home" ? "/" : `/${basic[1]}` };
  }
  if (role === "staff") {
    const basic = raw.match(/^v1_s_(home|search|dues|inventory|sales)$/);
    if (basic) return { startParam: raw, route: basic[1] === "home" ? "/" : `/${basic[1]}` };
    const entity = raw.match(/^v1_s_(customer|phone|inst)_([1-9]\d*)$/);
    if (entity) return { startParam: raw, route: entity[1] === "inst" ? `/installments/${entity[2]}` : `/${entity[1]}s/${entity[2]}` };
    const invoice = raw.match(/^v1_s_inv_(order|legacy)_([1-9]\d*)$/);
    if (invoice) return { startParam: raw, route: `/invoices/${invoice[1]}-${invoice[2]}` };
  }
  return { startParam: null, route: "/" };
};

const normalizeTenantRow = (row) => {
  if (!row) return null;
  const liveOrigin = safeOrigin(row.live_origin);
  const publicHost = safePublicHost(row.public_host);
  if (!TENANT_ID_PATTERN.test(String(row.tenant_id || "")) || !INSTALLATION_ID_PATTERN.test(String(row.installation_id || "")) || !BOT_ID_PATTERN.test(String(row.bot_id || "")) || !liveOrigin || !publicHost) return null;
  return {
    tenantId: String(row.tenant_id),
    installationId: String(row.installation_id),
    credentialVersion: Number(row.credential_version),
    publicKeyPem: String(row.installation_public_key_pem || ""),
    botId: String(row.bot_id),
    publicHost,
    liveOrigin,
    status: String(row.status || ""),
  };
};

const getTenantByPublicHost = async (db, host) => normalizeTenantRow(await db.prepare(
  "SELECT tenant_id, installation_id, credential_version, installation_public_key_pem, bot_id, public_host, live_origin, status FROM tenant_installations WHERE lower(public_host) = lower(?) AND status = 'active' LIMIT 1"
).bind(String(host || "").toLowerCase()).first());

const getInstallation = async (db, installationId) => normalizeTenantRow(await db.prepare(
  "SELECT tenant_id, installation_id, credential_version, installation_public_key_pem, bot_id, public_host, live_origin, status FROM tenant_installations WHERE installation_id = ? AND status = 'active' LIMIT 1"
).bind(installationId).first());

const snapshotRowToStored = (row) => {
  if (!row) return null;
  let data = null;
  try { data = row.payload_json == null ? null : JSON.parse(row.payload_json); } catch { return null; }
  return {
    schemaVersion: String(row.schema_version), tenantId: String(row.tenant_id), installationId: String(row.installation_id),
    subjectKind: String(row.subject_kind), subjectKey: String(row.subject_key), snapshotVersion: Number(row.snapshot_version),
    generatedAt: String(row.generated_at), receivedAt: String(row.received_at), authorizationValidUntil: String(row.authorization_valid_until),
    state: String(row.state), data, contentHash: String(row.content_hash),
  };
};

const getSnapshot = async (db, tenantId, subjectKind, subjectKey) => snapshotRowToStored(await db.prepare(
  "SELECT tenant_id, subject_kind, subject_key, installation_id, snapshot_version, schema_version, state, generated_at, received_at, authorization_valid_until, payload_json, content_hash FROM subject_snapshots WHERE tenant_id = ? AND subject_kind = ? AND subject_key = ? LIMIT 1"
).bind(tenantId, subjectKind, subjectKey).first());

const activeSnapshot = (snapshot, now = Date.now()) => Boolean(snapshot && snapshot.schemaVersion === SNAPSHOT_SCHEMA_VERSION && snapshot.state === "active" && snapshot.data && Date.parse(snapshot.authorizationValidUntil) > now);

const snapshotHeaders = (snapshot) => ({
  "X-Kourosh-Data-Source": "snapshot",
  "X-Kourosh-Snapshot-Version": String(snapshot.snapshotVersion),
  "X-Kourosh-Snapshot-Generated-At": snapshot.generatedAt,
  "X-Kourosh-Snapshot-Received-At": snapshot.receivedAt,
});

const liveHeaders = () => ({ "X-Kourosh-Data-Source": "live" });

const proxyLive = async ({ session, request, path, method = "GET", body = undefined, contentType = undefined, timeoutMs }) => {
  const startedAt = Date.now();
  if (!session.liveOrigin) return { kind: "unavailable", reason: "origin_missing", durationMs: 0 };
  const target = new URL(path, `${session.liveOrigin}/`);
  if (target.origin !== session.liveOrigin) return { kind: "unavailable", reason: "origin_invalid", durationMs: 0 };
  const headers = new Headers({ "Accept": "application/json", "Cache-Control": "no-store", "X-Kourosh-Edge-Request-Id": requestId() });
  if (session.localSessionToken) headers.set("Authorization", `Bearer ${session.localSessionToken}`);
  if (contentType) headers.set("Content-Type", contentType);
  try {
    const response = await fetch(target, { method, headers, body, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    const parsed = await readResponseBounded(response);
    return { kind: "response", status: response.status, json: parsed.json, durationMs: Date.now() - startedAt };
  } catch (error) {
    const errorName = String(error?.name || "");
    return {
      kind: "unavailable",
      reason: errorName === "TimeoutError" || errorName === "AbortError" ? "timeout" : "network_error",
      durationMs: Date.now() - startedAt,
    };
  }
};

const identityFromSnapshot = (kind, snapshot, telegramUserId) => {
  const displayName = String(snapshot?.data?.profile?.displayName || (kind === "customer" ? "مشتری کوروش" : "همکار کوروش"));
  return {
    kind,
    subjectId: 0,
    displayName,
    telegramUserId,
    capabilities: kind === "customer" ? [...CUSTOMER_CAPABILITIES] : [...PARTNER_CAPABILITIES],
  };
};

const validateLiveIdentity = (identity, telegramUserId, expectedKind = null) => {
  if (!identity || !["customer", "partner", "staff"].includes(identity.kind)) return null;
  if (expectedKind && identity.kind !== expectedKind) return null;
  if (String(identity.telegramUserId || "") !== String(telegramUserId || "")) return null;
  if (!Number.isSafeInteger(Number(identity.subjectId)) || Number(identity.subjectId) <= 0) return null;
  if (typeof identity.displayName !== "string" || !identity.displayName.trim() || identity.displayName.length > 160) return null;
  if (!Array.isArray(identity.capabilities) || identity.capabilities.length > 32 || identity.capabilities.some((item) => typeof item !== "string" || item.length > 96)) return null;
  if (identity.kind === "staff" && !["Admin", "Manager"].includes(identity.roleName)) return null;
  return { ...identity, subjectId: Number(identity.subjectId), displayName: identity.displayName.trim(), telegramUserId: String(identity.telegramUserId) };
};

const edgeSessionPayload = ({ tenant, validated, identity, subjectKey, localSessionToken, initData = null, expiresAt }) => ({
  v: 1,
  tenantId: tenant.tenantId,
  installationId: tenant.installationId,
  botId: tenant.botId,
  publicHost: tenant.publicHost,
  subjectKey,
  telegramUserId: String(validated.user.id),
  identity,
  liveOrigin: tenant.liveOrigin,
  localSessionToken: localSessionToken || null,
  initData: initData || null,
  issuedAt: Date.now(),
  expiresAt,
});

const authenticate = async (request, env, reqId) => {
  if (request.method !== "POST") return failure(405, "MINIAPP_METHOD_NOT_ALLOWED", "روش درخواست مجاز نیست.", reqId, { Allow: "POST" });
  const url = new URL(request.url);
  if (url.search) return failure(400, "MINIAPP_AUTH_QUERY_NOT_ALLOWED", "پارامتر اضافی در درخواست ورود مجاز نیست.", reqId);
  if (!isJsonContentType(request)) return failure(415, "MINIAPP_CONTENT_TYPE_REQUIRED", "درخواست ورود باید JSON باشد.", reqId);
  if (!sameOriginHeaderIsSafe(request)) return failure(403, "MINIAPP_EDGE_ORIGIN_MISMATCH", "مبدأ درخواست Mini App معتبر نیست.", reqId);
  const db = env.KOUROSH_EDGE_DB;
  if (!db) return failure(503, "MINIAPP_EDGE_STORAGE_UNAVAILABLE", "سرویس دسترسی کوروش آماده نیست.", reqId);
  let parsed;
  try { parsed = await readJsonBody(request, 24 * 1024); } catch (error) { return failure(error.status || 400, "MINIAPP_AUTH_REQUEST_INVALID", "درخواست احراز هویت معتبر نیست.", reqId); }
  const tenantLookup = await tryStorage(() => getTenantByPublicHost(db, url.hostname));
  if (!tenantLookup.ok) return storageUnavailable(reqId, "سرویس دسترسی کوروش موقتاً در دسترس نیست.");
  const tenant = tenantLookup.value;
  if (!tenant) return failure(503, "MINIAPP_EDGE_TENANT_NOT_CONFIGURED", "Mini App برای این دامنه پیکربندی نشده است.", reqId);
  let validated;
  try {
    validated = validateTelegramInitDataThirdParty(String(parsed.value?.initData || ""), tenant.botId, {
      environment: String(env.KOUROSH_TELEGRAM_ENVIRONMENT || "production") === "test" ? "test" : "production",
      maxAgeSeconds: numericEnv(env, "KOUROSH_EDGE_INIT_DATA_MAX_AGE_SECONDS", 300, 30, 900),
    });
  } catch (error) {
    const code = String(error?.code || "MINIAPP_INIT_DATA_SIGNATURE_INVALID");
    return failure(401, code, code === "MINIAPP_INIT_DATA_EXPIRED" ? "اطلاعات ورود تلگرام منقضی شده است. Mini App را دوباره باز کنید." : "امضای Telegram Mini App معتبر نیست.", reqId);
  }

  const subjectKey = deriveTelegramSubjectKey(env, tenant.tenantId, tenant.botId, String(validated.user.id));
  const liveTimeoutMs = numericEnv(env, "KOUROSH_EDGE_LIVE_TIMEOUT_MS", 1500, 500, 3000);
  const authSession = { liveOrigin: tenant.liveOrigin, localSessionToken: null };
  const live = await proxyLive({ session: authSession, request, path: "/api/miniapp/auth", method: "POST", body: JSON.stringify({ initData: String(parsed.value.initData) }), contentType: "application/json", timeoutMs: liveTimeoutMs });
  observeLiveResult("auth", live, { requestId: reqId, route: "/api/miniapp/auth" });

  let identity = null;
  let localSessionToken = null;
  let liveExpiresAt = null;
  let source = "snapshot";
  let offlineSnapshot = null;
  if (live.kind === "response" && live.status >= 200 && live.status < 300 && live.json?.success === true && live.json?.data?.identity && live.json?.data?.sessionToken) {
    identity = validateLiveIdentity(live.json.data.identity, String(validated.user.id));
    if (!identity) return failure(502, "MINIAPP_LIVE_IDENTITY_INVALID", "هویت دریافتی از فروشگاه معتبر نیست.", reqId, liveHeaders());
    localSessionToken = String(live.json.data.sessionToken);
    liveExpiresAt = Date.parse(live.json.data.expiresAt || "");
    source = "live";
    writeMiniAppEdgeLiveLog("live_auth_success", { requestId: reqId, route: "/api/miniapp/auth", status: live.status, durationMs: live.durationMs });
  } else if (live.kind === "response" && live.status < 500) {
    writeMiniAppEdgeLiveLog("live_auth_rejected", { requestId: reqId, route: "/api/miniapp/auth", status: live.status, durationMs: live.durationMs });
    return jsonResponse(live.status, live.json || { success: false, code: "MINIAPP_AUTH_FAILED", message: "احراز هویت کوروش انجام نشد." }, reqId, liveHeaders());
  }

  if (!identity) {
    const snapshotLookup = await tryStorage(() => Promise.all([
      getSnapshot(db, tenant.tenantId, "customer", subjectKey),
      getSnapshot(db, tenant.tenantId, "partner", subjectKey),
    ]));
    if (!snapshotLookup.ok) return storageUnavailable(reqId, "اطلاعات ذخیره‌شده موقتاً در دسترس نیست.");
    const [customer, partner] = snapshotLookup.value;
    const validCustomer = activeSnapshot(customer) ? customer : null;
    const validPartner = activeSnapshot(partner) ? partner : null;
    if (validCustomer && validPartner) return failure(401, "MINIAPP_IDENTITY_AMBIGUOUS", "این حساب تلگرام به بیش از یک پرونده متصل است. با مدیر سیستم تماس بگیرید.", reqId);
    const snapshot = validCustomer || validPartner;
    if (!snapshot) return failure(503, "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE", "فروشگاه آفلاین است و اطلاعات ذخیره‌شده معتبری برای این حساب موجود نیست.", reqId);
    offlineSnapshot = snapshot;
    identity = identityFromSnapshot(snapshot.subjectKind, snapshot, String(validated.user.id));
  }

  const durationSeconds = identity.kind === "staff"
    ? numericEnv(env, "KOUROSH_EDGE_SESSION_STAFF_SECONDS", 1800, 300, 1800)
    : numericEnv(env, "KOUROSH_EDGE_SESSION_CUSTOMER_PARTNER_SECONDS", 14400, 900, 14400);
  const expiresAt = Math.min(Date.now() + durationSeconds * 1000, Number.isFinite(liveExpiresAt) ? liveExpiresAt : Number.POSITIVE_INFINITY);
  const token = await sealEdgeSession(env, edgeSessionPayload({ tenant, validated, identity, subjectKey, localSessionToken, initData: source === "snapshot" ? String(parsed.value.initData) : null, expiresAt }));
  const launch = source === "live" && live.json?.data?.launch ? live.json.data.launch : miniAppRouteForStartParam(validated.startParam, identity.kind);
  return success({
    sessionToken: token,
    expiresAt: new Date(expiresAt).toISOString(),
    identity,
    launch,
    telegram: { userId: String(validated.user.id), firstName: validated.user.first_name, startParam: launch.startParam },
  }, reqId, source === "live" ? liveHeaders() : snapshotHeaders(offlineSnapshot));
};

const requireSession = async (request, env, reqId) => {
  const token = bearerToken(request);
  if (!token) return { error: failure(401, "MINIAPP_AUTH_REQUIRED", "نشست Mini App ارسال نشده است.", reqId) };
  const session = await openEdgeSession(env, token);
  if (!session) return { error: failure(401, "MINIAPP_SESSION_INVALID", "نشست Mini App معتبر نیست. برنامه را دوباره باز کنید.", reqId) };
  const host = requestPublicHost(request);
  if (!host || host !== session.publicHost) return { error: failure(403, "MINIAPP_EDGE_HOST_MISMATCH", "این نشست برای این دامنه معتبر نیست.", reqId) };
  return { session };
};

const customerSnapshotResponse = (snapshot, pathname) => {
  const data = snapshot.data;
  if (pathname === "/api/miniapp/customer/home") {
    const allInstallments = [...(data.installments?.active || []), ...(data.installments?.recentClosed || [])];
    const active = data.installments?.active || [];
    const nextCandidates = active.filter((item) => item?.nextDueDate).sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)));
    return {
      customer: { id: 0, fullName: data.profile.displayName },
      account: { signedBalance: data.account.signedBalance, code: data.account.code, label: data.account.label, amount: data.account.amount },
      installments: {
        activeCount: active.length,
        overdueCount: active.reduce((sum, item) => sum + Math.max(0, Number(item.overdueCount || 0)), 0),
        next: nextCandidates[0] ? { saleId: Number(nextCandidates[0].id), dueDate: String(nextCandidates[0].nextDueDate), amount: Number(nextCandidates[0].nextDueAmount || 0) } : null,
      },
      lastPurchase: [...(data.purchases || [])].sort((a, b) => String(b.transactionDate || "").localeCompare(String(a.transactionDate || "")))[0] || null,
    };
  }
  if (pathname === "/api/miniapp/customer/account") return {
    account: { signedBalance: data.account.signedBalance, code: data.account.code, label: data.account.label, amount: data.account.amount },
    totalDebit: data.account.totalDebit,
    totalCredit: data.account.totalCredit,
    entries: data.account.recentEntries || [],
  };
  if (pathname === "/api/miniapp/customer/installments") return [...(data.installments?.active || []), ...(data.installments?.recentClosed || [])];
  const installment = pathname.match(/^\/api\/miniapp\/customer\/installments\/([1-9]\d*)$/);
  if (installment) return (data.installments?.details || []).find((item) => Number(item.id) === Number(installment[1])) || undefined;
  if (pathname === "/api/miniapp/customer/purchases") return data.purchases || [];
  if (pathname === "/api/miniapp/customer/invoices") return (data.invoices || []).map((item) => item.summary).filter(Boolean);
  const invoice = pathname.match(/^\/api\/miniapp\/customer\/invoices\/([^/]+)$/);
  if (invoice) return (data.invoices || []).find((item) => item.ref === decodeURIComponent(invoice[1]))?.detail;
  return undefined;
};

const pageSlice = (items, url, maxPageSize = 50) => {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(maxPageSize, Number(url.searchParams.get("pageSize") || url.searchParams.get("limit") || 20)));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

const partnerSnapshotResponse = (snapshot, pathname, url) => {
  const data = snapshot.data;
  const partner = { id: 0, name: data.profile.displayName, type: data.profile.type || null, contactName: null, phoneNumber: null, email: null };
  const account = { signedBalance: data.account.signedBalance, code: data.account.code, label: data.account.label, amount: data.account.amount };
  if (pathname === "/api/miniapp/partner/home") return {
    partner, account,
    ledger: { total: (data.ledger?.recent || []).length, lastActivity: data.ledger?.recent?.[0]?.transactionDate || null, recent: data.ledger?.recent || [] },
    supplied: data.supplied,
    phoneSettlement: data.phoneSettlement,
  };
  if (pathname === "/api/miniapp/partner/account") return { partner, account, totalDebit: data.account.totalDebit, totalCredit: data.account.totalCredit, supplied: data.supplied, phoneSettlement: data.phoneSettlement };
  if (pathname === "/api/miniapp/partner/ledger") return { ...pageSlice(data.ledger?.recent || [], url), account };
  if (pathname === "/api/miniapp/partner/purchases") {
    const paged = pageSlice(data.purchases || [], url);
    return { ...paged, items: paged.items.map((item) => ({ ...item, identifier: item.identifierMasked || null })) };
  }
  if (pathname === "/api/miniapp/partner/phones") {
    const paged = pageSlice(data.phones?.recent || [], url);
    return { ...paged, items: paged.items.map((item) => ({ ...item, identifier: item.identifierMasked || null })), summary: data.phones?.summary || { total: 0, amount: 0, paidAmount: 0, remainingAmount: 0 } };
  }
  return undefined;
};

const serveSnapshotRead = async (env, session, request, reqId) => {
  if (session.identity.kind === "staff") return failure(503, "MINIAPP_STAFF_OFFLINE_UNAVAILABLE", "دسترسی مدیریتی در حالت آفلاین در دسترس نیست.", reqId);
  const db = env.KOUROSH_EDGE_DB;
  if (!db) return failure(503, "MINIAPP_EDGE_STORAGE_UNAVAILABLE", "اطلاعات ذخیره‌شده در دسترس نیست.", reqId);
  const installationLookup = await tryStorage(() => getInstallation(db, session.installationId));
  if (!installationLookup.ok) return storageUnavailable(reqId, "اطلاعات ذخیره‌شده موقتاً در دسترس نیست.");
  const installation = installationLookup.value;
  if (!installation || installation.tenantId !== session.tenantId || installation.botId !== session.botId) return failure(403, "MINIAPP_EDGE_INSTALLATION_REVOKED", "دسترسی این نصب غیرفعال شده است.", reqId);
  const snapshotLookup = await tryStorage(() => getSnapshot(db, session.tenantId, session.identity.kind, session.subjectKey));
  if (!snapshotLookup.ok) return storageUnavailable(reqId, "اطلاعات ذخیره‌شده موقتاً در دسترس نیست.");
  const snapshot = snapshotLookup.value;
  if (!snapshot) return failure(503, "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE", "اطلاعات ذخیره‌شده برای این حساب موجود نیست.", reqId);
  if (snapshot.installationId !== session.installationId) return failure(403, "MINIAPP_SNAPSHOT_INSTALLATION_MISMATCH", "Snapshot به این نصب تعلق ندارد.", reqId);
  if (snapshot.state !== "active") return failure(403, "MINIAPP_ACCOUNT_UNLINKED", "دسترسی این حساب غیرفعال شده است.", reqId);
  if (!activeSnapshot(snapshot)) return failure(503, "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED", "اطلاعات ذخیره‌شده قدیمی است و دیگر قابل نمایش نیست.", reqId, snapshotHeaders(snapshot));
  const url = new URL(request.url);
  const data = session.identity.kind === "customer" ? customerSnapshotResponse(snapshot, url.pathname) : partnerSnapshotResponse(snapshot, url.pathname, url);
  if (data === undefined) return failure(404, "MINIAPP_ROUTE_NOT_FOUND", "مسیر Mini App پیدا نشد.", reqId, snapshotHeaders(snapshot));
  return success(data, reqId, snapshotHeaders(snapshot));
};

const authenticatedRead = async (request, env, reqId) => {
  if (request.method !== "GET") return failure(405, "MINIAPP_READ_ONLY", "این سرویس فقط خواندنی است.", reqId, { Allow: "GET" });
  if (Number(request.headers.get("content-length") || 0) > 0) return failure(400, "MINIAPP_GET_BODY_NOT_ALLOWED", "درخواست خواندنی نباید بدنه داشته باشد.", reqId);
  if (!sameOriginHeaderIsSafe(request)) return failure(403, "MINIAPP_EDGE_ORIGIN_MISMATCH", "مبدأ درخواست Mini App معتبر نیست.", reqId);
  const auth = await requireSession(request, env, reqId);
  if (auth.error) return auth.error;
  const session = auth.session;
  const url = new URL(request.url);
  if (url.pathname === "/api/miniapp/me") return success({ identity: session.identity }, reqId);
  const routeKind = url.pathname.startsWith("/api/miniapp/customer/") ? "customer" : url.pathname.startsWith("/api/miniapp/partner/") ? "partner" : url.pathname.startsWith("/api/miniapp/staff/") ? "staff" : null;
  if (!routeKind) return failure(404, "MINIAPP_ROUTE_NOT_FOUND", "مسیر Mini App پیدا نشد.", reqId);
  if (session.identity.kind !== routeKind) return failure(403, routeKind === "customer" ? "MINIAPP_CUSTOMER_ACCESS_REQUIRED" : routeKind === "partner" ? "MINIAPP_PARTNER_ACCESS_REQUIRED" : "MINIAPP_STAFF_ACCESS_REQUIRED", "دسترسی لازم برای این بخش فعال نیست.", reqId);

  const timeoutMs = numericEnv(env, "KOUROSH_EDGE_LIVE_TIMEOUT_MS", 1500, 500, 3000);
  let liveSession = session;
  if (!liveSession.localSessionToken && liveSession.liveOrigin && liveSession.initData) {
    const reauth = await proxyLive({ session: liveSession, request, path: "/api/miniapp/auth", method: "POST", body: JSON.stringify({ initData: liveSession.initData }), contentType: "application/json", timeoutMs });
    observeLiveResult("auth", reauth, { requestId: reqId, route: "/api/miniapp/auth" });
    if (reauth.kind === "response" && reauth.status >= 200 && reauth.status < 300 && reauth.json?.success === true && reauth.json?.data?.sessionToken) {
      const refreshedIdentity = validateLiveIdentity(reauth.json?.data?.identity, liveSession.telegramUserId, liveSession.identity.kind);
      if (!refreshedIdentity) return failure(502, "MINIAPP_LIVE_IDENTITY_INVALID", "هویت دریافتی از فروشگاه معتبر نیست.", reqId, liveHeaders());
      liveSession = { ...liveSession, identity: refreshedIdentity, localSessionToken: String(reauth.json.data.sessionToken) };
      writeMiniAppEdgeLiveLog("live_auth_success", { requestId: reqId, route: "/api/miniapp/auth", status: reauth.status, durationMs: reauth.durationMs });
    } else if (reauth.kind === "response" && reauth.status < 500) {
      writeMiniAppEdgeLiveLog("live_auth_rejected", { requestId: reqId, route: "/api/miniapp/auth", status: reauth.status, durationMs: reauth.durationMs });
      return jsonResponse(reauth.status, reauth.json || { success: false, code: "MINIAPP_AUTH_FAILED", message: "دسترسی این حساب فعال نیست." }, reqId, liveHeaders());
    }
  }
  if (liveSession.localSessionToken && liveSession.liveOrigin) {
    const live = await proxyLive({ session: liveSession, request, path: `${url.pathname}${url.search}`, timeoutMs });
    observeLiveResult("read", live, { requestId: reqId, route: url.pathname });
    if (live.kind === "response") {
      if (live.status < 500) {
        writeMiniAppEdgeLiveLog(live.status >= 200 && live.status < 300 ? "live_read_success" : "live_read_rejected", { requestId: reqId, route: url.pathname, status: live.status, durationMs: live.durationMs });
        return jsonResponse(live.status, live.json || { success: false, code: "MINIAPP_LIVE_RESPONSE_INVALID", message: "پاسخ فروشگاه معتبر نبود." }, reqId, liveHeaders());
      }
      // 5xx may safely fall through to an offline snapshot for customer/partner.
    }
  }
  return serveSnapshotRead(env, session, request, reqId);
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const forbiddenSnapshotKeys = new Set([
  "password", "passwordHash", "password_hash", "botToken", "bot_token", "initData", "init_data", "sessionToken", "session_token",
  "privateKey", "private_key", "relayCredential", "relayCredentials", "proxyCredential", "proxyCredentials", "purchasePrice", "purchase_price",
  "currentPurchasePrice", "current_purchase_price", "grossProfit", "gross_profit", "internalProfit", "internal_profit", "phoneNumber", "phone_number",
  "email", "contactName", "contact_name", "telegramUserId", "telegram_user_id", "localSubjectId", "local_subject_id",
]);

const scanForbidden = (value) => {
  if (Array.isArray(value)) return value.some(scanForbidden);
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) if (forbiddenSnapshotKeys.has(key) || scanForbidden(child)) return true;
  return false;
};

const validateCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
  if (candidate.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || !TENANT_ID_PATTERN.test(String(candidate.tenantId || "")) || !INSTALLATION_ID_PATTERN.test(String(candidate.installationId || ""))) return false;
  if (!["customer", "partner"].includes(candidate.subjectKind) || !Number.isSafeInteger(candidate.localSubjectId) || candidate.localSubjectId < 1 || !/^[1-9][0-9]{0,19}$/.test(String(candidate.telegramUserId || ""))) return false;
  if (!Number.isSafeInteger(candidate.snapshotVersion) || candidate.snapshotVersion < 1 || !["active", "revoked"].includes(candidate.state)) return false;
  const generated = Date.parse(candidate.generatedAt); const validUntil = Date.parse(candidate.authorizationValidUntil);
  if (!Number.isFinite(generated) || !Number.isFinite(validUntil) || validUntil <= generated || validUntil - generated > 72 * 60 * 60 * 1000) return false;
  if (candidate.state === "active" && (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data))) return false;
  if (candidate.state === "revoked" && candidate.data !== null) return false;
  if (candidate.data && scanForbidden(candidate.data)) return false;
  return Buffer.byteLength(JSON.stringify(candidate), "utf8") <= SNAPSHOT_MAX_BYTES;
};

const materializeStored = (candidate, subjectKey, receivedAt) => {
  const base = {
    schemaVersion: candidate.schemaVersion,
    tenantId: candidate.tenantId,
    installationId: candidate.installationId,
    subjectKind: candidate.subjectKind,
    subjectKey,
    snapshotVersion: candidate.snapshotVersion,
    generatedAt: candidate.generatedAt,
    receivedAt,
    authorizationValidUntil: candidate.authorizationValidUntil,
    state: candidate.state,
    data: candidate.data,
  };
  const { receivedAt: _ignored, ...hashable } = base;
  return { ...base, contentHash: sha256Hex(JSON.stringify(canonicalize(hashable))) };
};

const verifySyncRequest = async (request, tenant, rawBody) => {
  const installationId = String(request.headers.get("x-kourosh-installation-id") || "");
  const credentialVersion = Number(request.headers.get("x-kourosh-credential-version"));
  const reqId = String(request.headers.get("x-kourosh-request-id") || "");
  const timestamp = String(request.headers.get("x-kourosh-timestamp") || "");
  const bodySha = String(request.headers.get("x-kourosh-body-sha256") || "");
  const signature = String(request.headers.get("x-kourosh-signature") || "");
  if (installationId !== tenant.installationId || credentialVersion !== tenant.credentialVersion || !REQUEST_ID_PATTERN.test(reqId) || !SHA256_PATTERN.test(bodySha) || !SIGNATURE_PATTERN.test(signature)) return { ok: false, code: "MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID" };
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > SNAPSHOT_SYNC_CLOCK_SKEW_MS) return { ok: false, code: "MINIAPP_SNAPSHOT_SYNC_TIMESTAMP_INVALID" };
  if (sha256Hex(rawBody) !== bodySha) return { ok: false, code: "MINIAPP_SNAPSHOT_SYNC_BODY_HASH_INVALID" };
  const canonical = ["KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1", "POST", SNAPSHOT_SYNC_PATH, installationId, String(credentialVersion), reqId, timestamp, bodySha].join("\n");
  try {
    const key = createPublicKey(tenant.publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519" || !verifySignature(null, Buffer.from(canonical, "utf8"), key, base64UrlDecode(signature))) return { ok: false, code: "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID" };
  } catch {
    return { ok: false, code: "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID" };
  }
  return { ok: true, requestId: reqId };
};

const consumePersistentReplay = async (db, installationId, reqId) => {
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SNAPSHOT_SYNC_REPLAY_TTL_MS).toISOString();
  // Best-effort cleanup. INSERT OR IGNORE is the actual race-safe replay guard.
  try { await db.prepare("DELETE FROM snapshot_sync_replays WHERE expires_at <= ?").bind(now).run(); } catch {}
  const result = await db.prepare("INSERT OR IGNORE INTO snapshot_sync_replays (installation_id, request_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(installationId, reqId, expiresAt, now).run();
  return Number(result?.meta?.changes || 0) === 1;
};

const upsertSnapshotD1 = async (db, snapshot) => {
  const payloadJson = snapshot.data === null ? null : JSON.stringify(snapshot.data);
  const result = await db.prepare(`INSERT INTO subject_snapshots (
    tenant_id, subject_kind, subject_key, installation_id, snapshot_version, schema_version, state, generated_at, received_at, authorization_valid_until, payload_json, content_hash
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(tenant_id, subject_kind, subject_key) DO UPDATE SET
    installation_id = excluded.installation_id,
    snapshot_version = excluded.snapshot_version,
    schema_version = excluded.schema_version,
    state = excluded.state,
    generated_at = excluded.generated_at,
    received_at = excluded.received_at,
    authorization_valid_until = excluded.authorization_valid_until,
    payload_json = excluded.payload_json,
    content_hash = excluded.content_hash
  WHERE subject_snapshots.installation_id = excluded.installation_id
    AND excluded.snapshot_version > subject_snapshots.snapshot_version`).bind(
      snapshot.tenantId, snapshot.subjectKind, snapshot.subjectKey, snapshot.installationId, snapshot.snapshotVersion,
      snapshot.schemaVersion, snapshot.state, snapshot.generatedAt, snapshot.receivedAt, snapshot.authorizationValidUntil,
      payloadJson, snapshot.contentHash,
    ).run();
  if (Number(result?.meta?.changes || 0) === 1) return { status: "accepted" };
  const current = await getSnapshot(db, snapshot.tenantId, snapshot.subjectKind, snapshot.subjectKey);
  if (!current) return { status: "storage_conflict" };
  if (current.installationId !== snapshot.installationId) return { status: "installation_conflict" };
  if (snapshot.snapshotVersion < current.snapshotVersion) return { status: "stale" };
  if (snapshot.snapshotVersion === current.snapshotVersion && snapshot.contentHash === current.contentHash) return { status: "idempotent" };
  if (snapshot.snapshotVersion === current.snapshotVersion) return { status: "version_conflict" };
  return { status: "storage_conflict" };
};

const ingestSnapshot = async (request, env, reqId) => {
  if (request.method !== "POST") return failure(405, "MINIAPP_SNAPSHOT_SYNC_METHOD_NOT_ALLOWED", "روش درخواست مجاز نیست.", reqId, { Allow: "POST" });
  const url = new URL(request.url);
  if (url.search) return failure(400, "MINIAPP_SNAPSHOT_SYNC_QUERY_NOT_ALLOWED", "پارامتر اضافی در Snapshot Sync مجاز نیست.", reqId);
  if (!isJsonContentType(request)) return failure(415, "MINIAPP_SNAPSHOT_SYNC_CONTENT_TYPE_REQUIRED", "Snapshot Sync باید JSON باشد.", reqId);
  const db = env.KOUROSH_EDGE_DB;
  if (!db) return failure(503, "MINIAPP_EDGE_STORAGE_UNAVAILABLE", "ذخیره‌سازی Edge آماده نیست.", reqId);
  let parsed;
  try { parsed = await readJsonBody(request, SNAPSHOT_SYNC_MAX_BODY_BYTES); } catch (error) {
    const status = Number(error?.status || 400);
    return failure(status, status === 413 ? "MINIAPP_SNAPSHOT_SYNC_BODY_TOO_LARGE" : "MINIAPP_SNAPSHOT_SYNC_BODY_INVALID", status === 413 ? "حجم Snapshot بیش از حد مجاز است." : "بدنه Snapshot معتبر نیست.", reqId);
  }
  const installationId = String(request.headers.get("x-kourosh-installation-id") || "");
  if (!INSTALLATION_ID_PATTERN.test(installationId)) return failure(401, "MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID", "اعتبارنامه Sync معتبر نیست.", reqId);
  const tenantLookup = await tryStorage(() => getInstallation(db, installationId), "snapshot_tenant_lookup");
  if (!tenantLookup.ok) return storageUnavailable(reqId, "ذخیره‌سازی Snapshot موقتاً در دسترس نیست.");
  const tenant = tenantLookup.value;
  if (!tenant) return failure(401, "MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID", "اعتبارنامه Sync معتبر نیست.", reqId);
  const verified = await verifySyncRequest(request, tenant, parsed.raw);
  if (!verified.ok) return failure(401, verified.code, "امضای Snapshot Sync معتبر نیست.", reqId);
  const replay = await tryStorage(() => consumePersistentReplay(db, tenant.installationId, verified.requestId), "snapshot_replay_guard");
  if (!replay.ok) return storageUnavailable(reqId, "ذخیره‌سازی Snapshot موقتاً در دسترس نیست.");
  if (!replay.value) return failure(409, "MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED", "درخواست تکراری رد شد.", reqId);
  const body = parsed.value;
  const candidate = body?.candidate;
  if (body?.protocolVersion !== 1 || String(body?.botId || "") !== tenant.botId || !validateCandidate(candidate) || candidate.tenantId !== tenant.tenantId || candidate.installationId !== tenant.installationId) {
    return failure(403, "MINIAPP_SNAPSHOT_SYNC_SCOPE_INVALID", "محدوده Snapshot معتبر نیست.", reqId);
  }
  const subjectKey = deriveTelegramSubjectKey(env, tenant.tenantId, tenant.botId, String(candidate.telegramUserId));
  const stored = materializeStored(candidate, subjectKey, nowIso());
  const writeAttempt = await tryStorage(() => upsertSnapshotD1(db, stored), "snapshot_upsert");
  if (!writeAttempt.ok) return storageUnavailable(reqId, "ذخیره‌سازی Snapshot موقتاً در دسترس نیست.");
  const write = writeAttempt.value;
  if (write.status === "accepted" || write.status === "idempotent") return success({ result: write.status, snapshotVersion: stored.snapshotVersion, state: stored.state }, reqId);
  const code = write.status === "stale" ? "MINIAPP_SNAPSHOT_SYNC_STALE_REJECTED" : write.status === "version_conflict" ? "MINIAPP_SNAPSHOT_SYNC_VERSION_CONFLICT" : write.status === "installation_conflict" ? "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_CONFLICT" : "MINIAPP_SNAPSHOT_SYNC_STORAGE_CONFLICT";
  return failure(409, code, "Snapshot جدید قابل اعمال نیست.", reqId);
};

const handleApi = async (request, env, reqId) => {
  const url = new URL(request.url);
  if (url.pathname === "/api/miniapp/auth") return authenticate(request, env, reqId);
  if (url.pathname === "/api/miniapp/me" || url.pathname.startsWith("/api/miniapp/customer/") || url.pathname.startsWith("/api/miniapp/partner/") || url.pathname.startsWith("/api/miniapp/staff/")) return authenticatedRead(request, env, reqId);
  return failure(404, "MINIAPP_ROUTE_NOT_FOUND", "مسیر Mini App پیدا نشد.", reqId);
};

const serveAsset = async (request, env) => {
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  headers.set("X-Kourosh-Release", EDGE_VERSION);
  const type = String(headers.get("content-type") || "");
  if (type.includes("text/html")) {
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Security-Policy", CSP);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const createKouroshMiniAppEdgeHandler = () => ({
  async fetch(request, env) {
    const reqId = requestId();
    try {
      const url = new URL(request.url);
      if (url.pathname === SNAPSHOT_SYNC_PATH) return await ingestSnapshot(request, env, reqId);
      if (url.pathname.startsWith("/cloud/")) return failure(404, "MINIAPP_CLOUD_ROUTE_NOT_FOUND", "مسیر Cloud پیدا نشد.", reqId);
      if (url.pathname.startsWith("/api/miniapp/")) return await handleApi(request, env, reqId);
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return failure(404, "MINIAPP_API_ROUTE_NOT_FOUND", "مسیر API پیدا نشد.", reqId);
      if (request.method !== "GET" && request.method !== "HEAD") return failure(405, "MINIAPP_STATIC_METHOD_NOT_ALLOWED", "روش درخواست فایل مجاز نیست.", reqId, { Allow: "GET, HEAD" });
      if (!env.ASSETS?.fetch) return failure(404, "MINIAPP_ASSET_NOT_FOUND", "فایل Mini App پیدا نشد.", reqId);
      return await serveAsset(request, env);
    } catch (error) {
      console.error("kourosh_edge_request_failed", { edgeVersion: EDGE_VERSION, requestId: reqId, code: String(error?.code || error?.name || "EDGE_ERROR") });
      return failure(500, "MINIAPP_EDGE_ERROR", "سرویس عمومی کوروش با خطا روبه‌رو شد.", reqId);
    }
  },
});

export default createKouroshMiniAppEdgeHandler();
