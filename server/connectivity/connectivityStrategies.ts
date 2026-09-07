import { resolveCloudConnectorReadiness } from "../cloud/cloudConnectorReadiness";
import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { resolveMiniAppLiveOriginUrl, resolveMiniAppPublicAccessMode, resolveTelegramMiniAppUrl, validateTelegramMiniAppPublicUrl } from "./telegramPublicAccess";
import { resolveMiniAppStableTunnelProvider } from "./stableTunnelProvider";
import { projectSelectedRelayAssignment, relayRequiredByStrategies, resolveRelayProvider, resolveRelayProviderStatus } from "./relayProvider";

export type ConnectivityStatus = "disabled" | "not_configured" | "checking" | "ready" | "degraded";
export type RelayConnectivityStatus = "disabled" | "not_provisioned" | "connecting" | "connected" | "degraded";

const hasBotCredential = (settings: Record<string, unknown>) => Boolean(String(settings.telegram_bot_token || "").trim());

export const resolveConnectivityStrategies = (settings: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env) => {
  const telegramMode = resolveTelegramTransportMode(settings);
  const miniAppMode = resolveMiniAppPublicAccessMode(settings, env.NODE_ENV || "production");
  const stableTunnelProvider = resolveMiniAppStableTunnelProvider(settings);
  const liveOriginUrl = resolveMiniAppLiveOriginUrl(settings, env.NODE_ENV || "production");
  const relayProvider = resolveRelayProvider(settings);
  const relayRequired = relayRequiredByStrategies(settings);
  const relayStatus = resolveRelayProviderStatus(settings, env);
  const selectedAssignment = projectSelectedRelayAssignment(settings);
  const relayReadiness = resolveCloudConnectorReadiness({
    ...selectedAssignment,
    kourosh_cloud_enabled: relayRequired ? "1" : settings.kourosh_cloud_enabled,
    kourosh_cloud_endpoint: relayProvider === "custom" ? (relayStatus.connectorUrl || "") : (relayStatus.connectorUrl || settings.kourosh_cloud_endpoint),
  }, env);

  let telegramStatus: ConnectivityStatus = "not_configured";
  if (telegramMode === "disabled") telegramStatus = "disabled";
  else if (!hasBotCredential(settings)) telegramStatus = "not_configured";
  else if (telegramMode === "proxy" && !String(settings.telegram_proxy || "").trim()) telegramStatus = "not_configured";
  else if (telegramMode === "relay") telegramStatus = relayReadiness.connected && relayReadiness.telegramRelayHealthy ? "ready" : relayReadiness.provisioned ? "degraded" : "not_configured";
  else telegramStatus = "ready";

  const miniAppUrl = resolveTelegramMiniAppUrl(settings, env.NODE_ENV || "production");
  let miniAppStatus: ConnectivityStatus = "not_configured";
  if (miniAppMode === "disabled") miniAppStatus = "disabled";
  else if (miniAppMode === "self_hosted" || miniAppMode === "external_tunnel") miniAppStatus = miniAppUrl ? "ready" : "not_configured";
  else if (miniAppMode === "stable_tunnel") miniAppStatus = miniAppUrl && liveOriginUrl ? "ready" : "not_configured";
  else miniAppStatus = relayReadiness.connected && relayReadiness.miniAppRelayHealthy && Boolean(miniAppUrl) ? "ready" : relayReadiness.provisioned ? "degraded" : "not_configured";

  const relayConnectivityStatus: RelayConnectivityStatus = !relayRequired ? "disabled"
    : !relayReadiness.provisioned ? "not_provisioned"
    : relayReadiness.state === "connecting" || relayReadiness.state === "provisioned" ? "connecting"
    : relayReadiness.state === "connected" ? "connected"
    : "degraded";

  return {
    telegram: { mode: telegramMode, status: telegramStatus },
    miniApp: { mode: miniAppMode, status: miniAppStatus, publicUrl: miniAppUrl, liveOriginUrl, stableTunnelProvider: miniAppMode === "stable_tunnel" ? stableTunnelProvider : null },
    relay: { provider: relayProvider, required: relayRequired, status: relayConnectivityStatus, readiness: relayReadiness, controlUrlConfigured: Boolean(relayStatus.controlUrl), connectorUrlConfigured: Boolean(relayStatus.connectorUrl) },
  };
};

export const validateExplicitMiniAppPublicUrlForMode = (
  settings: Record<string, unknown>,
  environment = process.env.NODE_ENV || "production",
) => {
  const mode = resolveMiniAppPublicAccessMode(settings, environment);
  if (mode !== "self_hosted" && mode !== "external_tunnel" && mode !== "stable_tunnel") return null;
  return validateTelegramMiniAppPublicUrl(settings.telegram_miniapp_public_url, environment);
};
