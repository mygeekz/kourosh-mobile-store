export type CloudConnectorReadinessState =
  | "disabled"
  | "not_provisioned"
  | "provisioned"
  | "connecting"
  | "connected"
  | "degraded";

export type CloudConnectorReadiness = {
  state: CloudConnectorReadinessState;
  enabled: boolean;
  provisioned: boolean;
  connected: boolean;
  operational: boolean;
  installationId: string | null;
  assignedStoreId: string | null;
  assignedPublicUrl: string | null;
  endpoint: string | null;
  credentialConfigured: boolean;
  telegramRelayHealthy: boolean;
  miniAppRelayHealthy: boolean;
  lastConnectedAt: string | null;
  code: "CLOUD_DISABLED" | "CLOUD_RELAY_NOT_PROVISIONED" | "CLOUD_RELAY_PROVISIONED" | "CLOUD_RELAY_CONNECTING" | "CLOUD_RELAY_CONNECTED" | "CLOUD_RELAY_DEGRADED";
};

const truthy = (value: unknown) => String(value ?? "").trim() === "1" || value === true;
const validInstallationId = (value: unknown) => /^inst_[A-Za-z0-9_-]{24}$/.test(String(value || "").trim());

export const normalizeCloudConnectorEndpoint = (
  value: unknown,
  environment = process.env.NODE_ENV || "production",
): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "wss:") return url.toString();
    const dev = environment === "test" || environment === "development";
    if (dev && url.protocol === "ws:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname)) return url.toString();
    return null;
  } catch {
    return null;
  }
};

export const resolveCloudConnectorReadiness = (
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): CloudConnectorReadiness => {
  const enabled = truthy(settings.kourosh_cloud_enabled);
  const installationId = validInstallationId(settings.installation_id) ? String(settings.installation_id).trim() : null;
  const assignedStoreId = String(settings.kourosh_cloud_assigned_store_id || "").trim() || null;
  const assignedPublicUrl = String(settings.kourosh_cloud_assigned_public_url || "").trim() || null;
  const endpoint = normalizeCloudConnectorEndpoint(env.KOUROSH_CLOUD_CONNECTOR_ENDPOINT || settings.kourosh_cloud_endpoint, env.NODE_ENV || "production");
  const credentialConfigured = truthy(settings.kourosh_cloud_credential_configured) || Boolean(String(env.KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH || "").trim());
  const provisionedFlag = truthy(settings.kourosh_cloud_provisioned);
  const provisioned = Boolean(enabled && provisionedFlag && installationId && assignedStoreId && endpoint && credentialConfigured);
  const rawState = String(settings.kourosh_cloud_connection_state || "").trim();
  const lastConnectedAt = String(settings.kourosh_cloud_last_connected_at || "").trim() || null;
  const connected = provisioned && rawState === "connected";
  const telegramRelayHealthy = connected && truthy(settings.kourosh_cloud_telegram_relay_healthy);
  const miniAppRelayHealthy = connected && truthy(settings.kourosh_cloud_miniapp_relay_healthy);

  let state: CloudConnectorReadinessState;
  if (!enabled) state = "disabled";
  else if (!provisioned) state = "not_provisioned";
  else if (rawState === "connecting" || rawState === "authenticating") state = "connecting";
  else if (rawState === "connected") state = "connected";
  else if (rawState === "degraded" || (rawState === "backoff" && lastConnectedAt)) state = "degraded";
  else if (rawState === "backoff") state = "connecting";
  else state = "provisioned";

  const code = state === "disabled" ? "CLOUD_DISABLED"
    : state === "not_provisioned" ? "CLOUD_RELAY_NOT_PROVISIONED"
    : state === "provisioned" ? "CLOUD_RELAY_PROVISIONED"
    : state === "connecting" ? "CLOUD_RELAY_CONNECTING"
    : state === "connected" ? "CLOUD_RELAY_CONNECTED"
    : "CLOUD_RELAY_DEGRADED";

  return {
    state,
    enabled,
    provisioned,
    connected,
    operational: connected && (telegramRelayHealthy || miniAppRelayHealthy),
    installationId,
    assignedStoreId,
    assignedPublicUrl,
    endpoint,
    credentialConfigured,
    telegramRelayHealthy,
    miniAppRelayHealthy,
    lastConnectedAt,
    code,
  };
};
