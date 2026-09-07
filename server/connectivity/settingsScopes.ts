export const LOCAL_ACCESS_SETTING_KEYS = new Set([
  "local_hostname",
  "local_domain_suffix",
  "local_base_url",
  "local_hosts_ip",
  "local_hosts_line",
]);

export const RELAY_CONNECTIVITY_SETTING_KEYS = new Set([
  "relay_provider",
  "custom_relay_control_url",
  "custom_relay_connector_url",
  "miniapp_public_access_mode",
  "miniapp_live_origin_url",
  "miniapp_stable_tunnel_provider",
]);

export const SERVER_OWNED_SETTING_KEYS = new Set([
  "installation_id",
  "relay_assignment_provider",
  "kourosh_cloud_enabled",
  "kourosh_cloud_provisioned",
  "kourosh_cloud_endpoint",
  "kourosh_cloud_assigned_store_id",
  "kourosh_cloud_assigned_public_url",
  "kourosh_cloud_assignment_version",
  "kourosh_cloud_connection_state",
  "kourosh_cloud_last_connected_at",
  "kourosh_cloud_relay_mode",
  "kourosh_cloud_credential_configured",
  "kourosh_cloud_credential_version",
  "kourosh_cloud_telegram_relay_healthy",
  "kourosh_cloud_miniapp_relay_healthy",
]);

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const pickLocalAccessSettings = (value: unknown) =>
  Object.fromEntries(Object.entries(toRecord(value)).filter(([key]) => LOCAL_ACCESS_SETTING_KEYS.has(key)));

export const pickTelegramSettings = (value: unknown) =>
  Object.fromEntries(Object.entries(toRecord(value)).filter(([key]) => key.startsWith("telegram_") || RELAY_CONNECTIVITY_SETTING_KEYS.has(key)));

export const pickGenericWritableSettings = (value: unknown) =>
  Object.fromEntries(
    Object.entries(toRecord(value)).filter(([key]) =>
      !SERVER_OWNED_SETTING_KEYS.has(key) &&
      !LOCAL_ACCESS_SETTING_KEYS.has(key) &&
      !key.startsWith("telegram_") &&
      !key.startsWith("kourosh_cloud_") &&
      !RELAY_CONNECTIVITY_SETTING_KEYS.has(key),
    ),
  );
