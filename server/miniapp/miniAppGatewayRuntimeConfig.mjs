import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_VERSION = 1;
const MODES = new Set(["disabled", "self_hosted", "external_tunnel", "stable_tunnel", "relay"]);
const HOST_PATTERN = /^(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d{1,5})?$/;

const chmodBestEffort = (target, mode) => { try { fs.chmodSync(target, mode); } catch {} };
const normalizeMode = (value) => MODES.has(String(value || "").trim()) ? String(value || "").trim() : "disabled";
const resolveSettingsMode = (settings = {}) => {
  const canonical = String(settings.miniapp_public_access_mode || "").trim();
  if (MODES.has(canonical)) return canonical;
  const legacy = String(settings.telegram_public_access_mode || "").trim();
  if (legacy === "cloud_managed") return "relay";
  if (legacy === "self_hosted" || legacy === "disabled") return legacy;
  return String(settings.telegram_miniapp_public_url || "").trim() ? "self_hosted" : "disabled";
};
const normalizeHost = (value) => {
  const host = String(value || "").trim().toLowerCase();
  if (!host || !HOST_PATTERN.test(host)) return null;
  const port = host.match(/:(\d{1,5})$/)?.[1];
  if (port && (Number(port) < 1 || Number(port) > 65535)) return null;
  return host;
};

export const resolveMiniAppGatewayRuntimeConfigPath = (env = process.env) => {
  const explicit = String(env.KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH || "").trim();
  if (explicit) return path.resolve(explicit);
  const storeRuntime = String(env.KOUROSH_STORE_RUNTIME_DIR || "").trim();
  const root = storeRuntime ? path.resolve(storeRuntime) : path.join(os.homedir(), ".kourosh", "runtime", "store");
  return path.join(root, "miniapp-gateway.json");
};

export const deriveMiniAppGatewayExpectedHost = (publicUrl) => {
  try {
    const url = new URL(String(publicUrl || "").trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    return normalizeHost(url.host);
  } catch { return null; }
};

export const buildMiniAppGatewayRuntimeConfig = (settings = {}) => {
  const mode = resolveSettingsMode(settings);
  let expectedPublicHost = null;
  if (mode === "self_hosted" || mode === "external_tunnel" || mode === "stable_tunnel") {
    const gatewayUrl = mode === "stable_tunnel" ? settings.miniapp_live_origin_url : settings.telegram_miniapp_public_url;
    expectedPublicHost = deriveMiniAppGatewayExpectedHost(gatewayUrl);
    if (!expectedPublicHost) throw Object.assign(new Error(mode === "stable_tunnel" ? "Mini App stable Live Origin HTTPS URL is invalid for Gateway runtime configuration." : "Mini App public HTTPS URL is invalid for Gateway runtime configuration."), { code: mode === "stable_tunnel" ? "MINIAPP_GATEWAY_LIVE_ORIGIN_INVALID" : "MINIAPP_GATEWAY_PUBLIC_URL_INVALID" });
  }
  return Object.freeze({
    version: CONFIG_VERSION,
    mode,
    expectedPublicHost,
    updatedAt: new Date().toISOString(),
  });
};

export const writeMiniAppGatewayRuntimeConfig = (config, options = {}) => {
  const mode = normalizeMode(config?.mode);
  const expectedPublicHost = mode === "self_hosted" || mode === "external_tunnel" || mode === "stable_tunnel" ? normalizeHost(config?.expectedPublicHost) : null;
  if ((mode === "self_hosted" || mode === "external_tunnel" || mode === "stable_tunnel") && !expectedPublicHost) throw Object.assign(new Error("Mini App Gateway expected Host is invalid."), { code: "MINIAPP_GATEWAY_HOST_INVALID" });
  const file = path.resolve(options.configPath || resolveMiniAppGatewayRuntimeConfigPath(options.env));
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodBestEffort(dir, 0o700);
  const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  const body = JSON.stringify({ version: CONFIG_VERSION, mode, expectedPublicHost, updatedAt: config?.updatedAt || new Date().toISOString() });
  try {
    fs.writeFileSync(temp, body, { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodBestEffort(temp, 0o600);
    fs.renameSync(temp, file);
    chmodBestEffort(file, 0o600);
  } catch (error) {
    try { fs.rmSync(temp, { force: true }); } catch {}
    throw error;
  }
  return { file, mode, expectedPublicHost };
};

export const writeMiniAppGatewayRuntimeConfigFromSettings = (settings = {}, options = {}) =>
  writeMiniAppGatewayRuntimeConfig(buildMiniAppGatewayRuntimeConfig(settings), options);

const invalidResult = (reasonCode) => Object.freeze({ state: "invalid", reasonCode });

const readExistingRegularFile = (file) => {
  let before;
  try {
    before = fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT") return { state: "absent" };
    return invalidResult("RUNTIME_CONFIG_UNREADABLE");
  }
  if (before.isSymbolicLink()) return invalidResult("RUNTIME_CONFIG_SYMLINK_UNSAFE");
  if (!before.isFile()) return invalidResult("RUNTIME_CONFIG_NOT_REGULAR_FILE");

  let fd;
  try {
    const noFollow = Number.isInteger(fs.constants.O_NOFOLLOW) ? fs.constants.O_NOFOLLOW : 0;
    fd = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) return invalidResult("RUNTIME_CONFIG_NOT_REGULAR_FILE");
    if (Number.isFinite(before.dev) && Number.isFinite(before.ino) && Number.isFinite(opened.dev) && Number.isFinite(opened.ino)
      && (before.dev !== opened.dev || before.ino !== opened.ino)) {
      return invalidResult("RUNTIME_CONFIG_CHANGED_DURING_READ");
    }
    return { state: "content", content: fs.readFileSync(fd, "utf8") };
  } catch {
    return invalidResult("RUNTIME_CONFIG_UNREADABLE");
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
  }
};

export const readMiniAppGatewayRuntimeConfig = (options = {}) => {
  const file = path.resolve(options.configPath || resolveMiniAppGatewayRuntimeConfigPath(options.env));
  const fileResult = readExistingRegularFile(file);
  if (fileResult.state === "absent" || fileResult.state === "invalid") return fileResult;

  let value;
  try {
    value = JSON.parse(fileResult.content);
  } catch {
    return invalidResult("RUNTIME_CONFIG_MALFORMED_JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidResult("RUNTIME_CONFIG_SCHEMA_INVALID");
  if (value.version !== CONFIG_VERSION) return invalidResult("RUNTIME_CONFIG_VERSION_UNSUPPORTED");
  if (!MODES.has(value.mode)) return invalidResult("RUNTIME_CONFIG_MODE_INVALID");
  if (typeof value.updatedAt !== "string") return invalidResult("RUNTIME_CONFIG_SCHEMA_INVALID");

  let expectedPublicHost = null;
  if (value.mode === "self_hosted" || value.mode === "external_tunnel" || value.mode === "stable_tunnel") {
    expectedPublicHost = normalizeHost(value.expectedPublicHost);
    if (!expectedPublicHost) return invalidResult("RUNTIME_CONFIG_HOST_INVALID");
  } else if (value.expectedPublicHost !== null && value.expectedPublicHost !== undefined) {
    return invalidResult("RUNTIME_CONFIG_SCHEMA_INVALID");
  }

  return Object.freeze({
    state: "valid",
    config: Object.freeze({
      version: CONFIG_VERSION,
      mode: value.mode,
      expectedPublicHost,
      updatedAt: value.updatedAt,
    }),
  });
};

export const MINI_APP_GATEWAY_RUNTIME_CONFIG_VERSION = CONFIG_VERSION;
