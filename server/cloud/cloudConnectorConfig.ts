import { resolveCloudConnectorReadiness, type CloudConnectorReadinessState } from "./cloudConnectorReadiness";

export type CloudConnectorConnectionState = CloudConnectorReadinessState;
export type CloudConnectorRelayMode = "none" | "telegram" | "miniapp" | "telegram_and_miniapp";

export type CloudConnectorConfig = ReturnType<typeof resolveCloudConnectorConfig>;

export const resolveCloudConnectorConfig = (
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
) => {
  const readiness = resolveCloudConnectorReadiness(settings, env);
  const relayModeRaw = String(settings.kourosh_cloud_relay_mode || "none").trim();
  const relayMode: CloudConnectorRelayMode = ["none", "telegram", "miniapp", "telegram_and_miniapp"].includes(relayModeRaw)
    ? relayModeRaw as CloudConnectorRelayMode
    : "none";
  return {
    ...readiness,
    relayMode,
    connectionState: readiness.state,
  };
};

export const getCloudProvisioningStatus = (config: CloudConnectorConfig) =>
  config.provisioned ? "CLOUD_RELAY_PROVISIONED" as const : "CLOUD_RELAY_NOT_PROVISIONED" as const;
