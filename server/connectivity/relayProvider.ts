import { normalizeCloudConnectorEndpoint } from "../cloud/cloudConnectorReadiness";
import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { resolveMiniAppPublicAccessMode } from "./telegramPublicAccess";

export type RelayProvider = "managed_kourosh" | "custom";

const isLoopback = (host: string) => ["127.0.0.1", "localhost", "::1"].includes(host);

export const resolveRelayProvider = (settings: Record<string, unknown>): RelayProvider => {
  const raw = String(settings.relay_provider || "").trim();
  if (raw === "managed_kourosh" || raw === "custom") return raw;
  // v151-v158 compatibility: all historical relay/cloud modes were Kourosh-managed.
  if (String(settings.telegram_transport_mode || "").trim() === "cloud_relay") return "managed_kourosh";
  if (String(settings.telegram_public_access_mode || "").trim() === "cloud_managed") return "managed_kourosh";
  return "managed_kourosh";
};


export const resolveRelayAssignmentProvider = (settings: Record<string, unknown>): RelayProvider | null => {
  const raw = String(settings.relay_assignment_provider || "").trim();
  if (raw === "managed_kourosh" || raw === "custom") return raw;
  // v151-v158 persisted relay assignments were always managed by Kourosh Cloud.
  return String(settings.kourosh_cloud_provisioned || "").trim() === "1" ? "managed_kourosh" : null;
};

export const projectSelectedRelayAssignment = (settings: Record<string, unknown>) => {
  const provider = resolveRelayProvider(settings);
  const assignmentProvider = resolveRelayAssignmentProvider(settings);
  if (!assignmentProvider || assignmentProvider === provider) return { ...settings };
  // Provider selection must never reuse another provider's assignment/health metadata.
  return {
    ...settings,
    kourosh_cloud_provisioned: "0",
    kourosh_cloud_assigned_store_id: "",
    kourosh_cloud_assigned_public_url: "",
    kourosh_cloud_assignment_version: "",
    kourosh_cloud_connection_state: "not_provisioned",
    kourosh_cloud_telegram_relay_healthy: "0",
    kourosh_cloud_miniapp_relay_healthy: "0",
  };
};

export const relayRequiredByStrategies = (settings: Record<string, unknown>) =>
  resolveTelegramTransportMode(settings) === "relay" || resolveMiniAppPublicAccessMode(settings) === "relay";

export const validateRelayControlUrl = (value: unknown, environment = process.env.NODE_ENV || "production"): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const devLoopback = ["test", "development"].includes(environment) && url.protocol === "http:" && isLoopback(url.hostname);
    if (url.protocol !== "https:" && !devLoopback) return null;
    if (url.username || url.password || url.hash || url.search) return null;
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch { return null; }
};

export const validateRelayConnectorUrl = (value: unknown, environment = process.env.NODE_ENV || "production"): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const devLoopback = ["test", "development"].includes(environment) && url.protocol === "ws:" && isLoopback(url.hostname);
    if (url.protocol !== "wss:" && !devLoopback) return null;
    if (url.username || url.password || url.hash || url.search || url.pathname !== "/connector") return null;
    return url.toString();
  } catch { return null; }
};

export const resolveRelayControlUrl = (
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): string | null => {
  const provider = resolveRelayProvider(settings);
  const raw = provider === "custom"
    ? settings.custom_relay_control_url
    : env.KOUROSH_CLOUD_CONTROL_PLANE_URL;
  return validateRelayControlUrl(raw, env.NODE_ENV || "production");
};

export const resolveRelayConnectorUrl = (
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): string | null => {
  const provider = resolveRelayProvider(settings);
  if (provider === "custom") {
    return validateRelayConnectorUrl(settings.custom_relay_connector_url, env.NODE_ENV || "production");
  }
  const assignmentProvider = resolveRelayAssignmentProvider(settings);
  const legacyManagedEndpoint = assignmentProvider === "custom" ? null : settings.kourosh_cloud_endpoint;
  return normalizeCloudConnectorEndpoint(env.KOUROSH_CLOUD_CONNECTOR_ENDPOINT || legacyManagedEndpoint, env.NODE_ENV || "production");
};

export const resolveRelayProviderStatus = (settings: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env) => ({
  provider: resolveRelayProvider(settings),
  required: relayRequiredByStrategies(settings),
  controlUrl: resolveRelayControlUrl(settings, env),
  connectorUrl: resolveRelayConnectorUrl(settings, env),
});
