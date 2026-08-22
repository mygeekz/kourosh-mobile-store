import { resolveCloudConnectorReadiness } from "../cloud/cloudConnectorReadiness";
export type ConnectivitySettings = Record<string, unknown>;
export type MiniAppPublicAccessMode = "disabled" | "self_hosted" | "external_tunnel" | "stable_tunnel" | "relay";
/** v151-v158 compatibility type. */
export type TelegramPublicAccessMode = "disabled" | "self_hosted" | "cloud_managed";

const isPrivateIpv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
    parts[0] >= 224;
};

const ipv4FromMappedIpv6 = (hostname: string): string | null => {
  if (!hostname.startsWith("::ffff:")) return null;
  const suffix = hostname.slice("::ffff:".length);
  if (suffix.includes(".")) return suffix;
  const groups = suffix.split(":");
  if (groups.length !== 2 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  const high = Number.parseInt(groups[0], 16);
  const low = Number.parseInt(groups[1], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
};

const isPrivateHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const mappedIpv4 = ipv4FromMappedIpv6(host);
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".home.arpa") || host.endsWith(".internal") || host.endsWith(".lan") || isPrivateIpv4(host) || (mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false) || host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
};

export const validateTelegramMiniAppPublicUrl = (
  value: unknown,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    const privateHost = isPrivateHostname(url.hostname);
    const localhostInTest = environment === "test" && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1");
    if (privateHost && !localhostInTest) return null;
    return url.toString();
  } catch { return null; }
};

export const isTemporaryQuickTunnelMiniAppUrl = (value: unknown): boolean => {
  const normalized = validateTelegramMiniAppPublicUrl(value);
  if (!normalized) return false;
  const hostname = new URL(normalized).hostname.toLowerCase();
  return hostname === "trycloudflare.com" || hostname.endsWith(".trycloudflare.com");
};

export const validateTelegramStableMiniAppCanonicalUrl = (
  value: unknown,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const normalized = validateTelegramMiniAppPublicUrl(value, environment);
  if (!normalized) return null;
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase();
  if (hostname === "trycloudflare.com" || hostname.endsWith(".trycloudflare.com")) return null;
  if (url.search || (url.pathname !== "/" && url.pathname !== "/miniapp.html")) return null;
  return `${url.origin}/miniapp.html`;
};

export const resolveMiniAppPublicAccessMode = (
  settings: ConnectivitySettings,
  environment = process.env.NODE_ENV || "production",
): MiniAppPublicAccessMode => {
  const canonical = String(settings.miniapp_public_access_mode || "").trim();
  if (["disabled", "self_hosted", "external_tunnel", "stable_tunnel", "relay"].includes(canonical)) return canonical as MiniAppPublicAccessMode;

  const legacy = String(settings.telegram_public_access_mode || "").trim();
  if (legacy === "disabled" || legacy === "self_hosted") return legacy;
  if (legacy === "cloud_managed") return "relay";
  // v150 compatibility: explicit URL without a mode is treated as self-hosted in memory only.
  return validateTelegramMiniAppPublicUrl(settings.telegram_miniapp_public_url, environment) ? "self_hosted" : "disabled";
};

/** v151-v158 API compatibility wrapper. */
export const resolveTelegramPublicAccessMode = (
  settings: ConnectivitySettings,
  environment = process.env.NODE_ENV || "production",
): TelegramPublicAccessMode => {
  const legacy = String(settings.telegram_public_access_mode || "").trim();
  if (legacy === "disabled" || legacy === "self_hosted" || legacy === "cloud_managed") return legacy;
  const mode = resolveMiniAppPublicAccessMode(settings, environment);
  if (mode === "relay") return "cloud_managed";
  return mode === "external_tunnel" || mode === "stable_tunnel" ? "self_hosted" : mode;
};


const relayAssignmentMatchesSelectedProvider = (settings: ConnectivitySettings): boolean => {
  const selected = String(settings.relay_provider || "").trim() === "custom" ? "custom" : "managed_kourosh";
  const explicitAssignment = String(settings.relay_assignment_provider || "").trim();
  const assignment = explicitAssignment === "custom" || explicitAssignment === "managed_kourosh"
    ? explicitAssignment
    : String(settings.kourosh_cloud_provisioned || "").trim() === "1" ? "managed_kourosh" : null;
  return Boolean(assignment && assignment === selected);
};

export const resolveTelegramMiniAppUrl = (
  settings: ConnectivitySettings,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const mode = resolveMiniAppPublicAccessMode(settings, environment);
  if (mode === "disabled") return null;
  if (mode === "stable_tunnel") {
    return validateTelegramStableMiniAppCanonicalUrl(settings.telegram_miniapp_public_url, environment);
  }
  if (mode === "self_hosted" || mode === "external_tunnel") {
    return validateTelegramMiniAppPublicUrl(settings.telegram_miniapp_public_url, environment);
  }
  if (!relayAssignmentMatchesSelectedProvider(settings)) return null;
  const relay = resolveCloudConnectorReadiness(settings, { ...process.env, NODE_ENV: environment });
  if (!relay.provisioned) return null;
  return validateTelegramMiniAppPublicUrl(relay.assignedPublicUrl, environment);
};


export const validateMiniAppLiveOriginUrl = (
  value: unknown,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const normalized = validateTelegramMiniAppPublicUrl(value, environment);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (url.search || (url.pathname !== "/" && url.pathname !== "/miniapp.html")) return null;
  return `${url.origin}/`;
};

export const resolveMiniAppLiveOriginUrl = (
  settings: ConnectivitySettings,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const mode = resolveMiniAppPublicAccessMode(settings, environment);
  if (mode === "stable_tunnel") return validateMiniAppLiveOriginUrl(settings.miniapp_live_origin_url, environment);
  if (mode === "self_hosted" || mode === "external_tunnel") return validateMiniAppLiveOriginUrl(settings.telegram_miniapp_public_url, environment);
  return null;
};

export const normalizeTelegramBotUsername = (value: unknown): string | null => {
  const username = String(value ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username) ? username : null;
};

export const auditTelegramMiniAppPublicConfiguration = (
  settings: ConnectivitySettings,
  gatewayPublicHost: unknown,
  environment = process.env.NODE_ENV || "production",
) => {
  const mode = resolveMiniAppPublicAccessMode(settings, environment);
  const miniAppUrl = resolveTelegramMiniAppUrl(settings, environment);
  const botUsername = normalizeTelegramBotUsername(settings.telegram_bot_username);
  const expectedHost = String(gatewayPublicHost ?? "").trim().toLowerCase();
  const parsed = miniAppUrl ? new URL(miniAppUrl) : null;
  const liveOriginUrl = resolveMiniAppLiveOriginUrl(settings, environment);
  const liveOrigin = liveOriginUrl ? new URL(liveOriginUrl) : null;
  const actualHost = (mode === "stable_tunnel" ? liveOrigin?.host : parsed?.host)?.toLowerCase() || null;
  const readinessSettings = relayAssignmentMatchesSelectedProvider(settings)
    ? settings
    : { ...settings, kourosh_cloud_provisioned: "0", kourosh_cloud_assigned_store_id: "", kourosh_cloud_assigned_public_url: "", kourosh_cloud_connection_state: "not_provisioned", kourosh_cloud_telegram_relay_healthy: "0", kourosh_cloud_miniapp_relay_healthy: "0" };
  const relayReadiness = resolveCloudConnectorReadiness(readinessSettings, { ...process.env, NODE_ENV: environment });
  const hostMatches = (mode === "self_hosted" || mode === "external_tunnel" || mode === "stable_tunnel") ? Boolean(actualHost && expectedHost && actualHost === expectedHost) : true;
  const endpointIsCanonical = parsed ? parsed.pathname === "/miniapp.html" || parsed.pathname === "/" : false;
  const status = mode === "disabled" ? "MINIAPP_DISABLED"
    : mode === "relay" && !relayReadiness.provisioned ? "CLOUD_RELAY_NOT_PROVISIONED"
    : mode === "relay" && !(relayReadiness.connected && relayReadiness.miniAppRelayHealthy) ? "CLOUD_RELAY_NOT_READY"
    : mode === "stable_tunnel" && !liveOriginUrl ? "LIVE_ORIGIN_REQUIRED"
    : miniAppUrl ? "READY" : "PUBLIC_MINIAPP_URL_REQUIRED";
  return { mode, miniAppUrl, liveOriginUrl, botUsername, expectedHost: expectedHost || null, actualHost, hostMatches, endpointIsCanonical, cloudReadiness: relayReadiness, status };
};
