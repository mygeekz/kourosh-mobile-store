import { LocalCloudConnector } from "./localCloudConnector";
import { ensureConnectorCredential } from "./connectorCredentialStore";
import { resolveCloudConnectorReadiness } from "./cloudConnectorReadiness";
import { projectSelectedRelayAssignment, relayRequiredByStrategies, resolveRelayConnectorUrl, resolveRelayProvider } from "../connectivity/relayProvider";

let connector: LocalCloudConnector | null = null;
let cachedSettings: Record<string, unknown> = {};
let persistSetting: ((key: string, value: string) => Promise<unknown>) | null = null;

const safeLog = (event: string, meta?: Record<string, unknown>) => {
  const allowed = meta ? Object.fromEntries(Object.entries(meta).filter(([key]) => !/(token|secret|credential|authorization|initdata|body)/i.test(key))) : undefined;
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, ...(allowed || {}) }));
};

const persistRuntimeState = (key: string, value: string) => {
  cachedSettings[key] = value;
  if (persistSetting) void persistSetting(key, value).catch(() => undefined);
};

const resolveRuntimeReadiness = (settings: Record<string, unknown>) => {
  const required = relayRequiredByStrategies(settings);
  const selectedAssignment = projectSelectedRelayAssignment(settings);
  const endpoint = resolveRelayConnectorUrl(selectedAssignment);
  const provider = resolveRelayProvider(settings);
  const projected = {
    ...selectedAssignment,
    // Existing v152-v158 persisted metadata remains the compatibility storage layer.
    // Custom Relay must never inherit a legacy managed endpoint when its explicit URL is absent.
    kourosh_cloud_enabled: required ? "1" : settings.kourosh_cloud_enabled,
    kourosh_cloud_endpoint: provider === "custom" ? (endpoint || "") : (endpoint || settings.kourosh_cloud_endpoint),
  };
  return { ...resolveCloudConnectorReadiness(projected), provider: resolveRelayProvider(settings), required };
};

export const initializeCloudConnectorRuntime = (
  settings: Record<string, unknown>,
  options: { updateSetting?: (key: string, value: string) => Promise<unknown> } = {},
) => {
  cachedSettings = { ...settings };
  persistSetting = options.updateSetting || persistSetting;
  connector?.stop();
  connector = null;

  const readiness = resolveRuntimeReadiness(cachedSettings);
  // Relay Connector is optional: Direct/Proxy + Disabled/Self-hosted/Tunnel must make zero relay connection attempts.
  if (!readiness.required) return readiness;
  if (!readiness.provisioned || !readiness.installationId || !readiness.endpoint) return readiness;

  const credential = ensureConnectorCredential({ createIfMissing: false });
  if (!credential) {
    persistRuntimeState("kourosh_cloud_connection_state", "unprovisioned");
    return resolveRuntimeReadiness(cachedSettings);
  }
  connector = new LocalCloudConnector({
    installationId: readiness.installationId,
    endpoint: readiness.endpoint,
    publicKeyFingerprint: credential.publicKeyFingerprint,
    signChallenge: credential.signChallenge,
    miniAppGatewayOrigin: String(process.env.KOUROSH_MINIAPP_GATEWAY_ORIGIN || "http://127.0.0.1:4180"),
    environment: process.env.NODE_ENV || "production",
    logger: safeLog,
    onStateChange: (state) => {
      const storedState = state === "unprovisioned" ? "not_provisioned" : state;
      persistRuntimeState("kourosh_cloud_connection_state", storedState);
      if (state === "connected") persistRuntimeState("kourosh_cloud_last_connected_at", new Date().toISOString());
      if (state !== "connected") {
        persistRuntimeState("kourosh_cloud_telegram_relay_healthy", "0");
        persistRuntimeState("kourosh_cloud_miniapp_relay_healthy", "0");
      }
    },
    onAssignmentChange: ({ assignedStoreId, assignedPublicUrl, assignmentVersion }) => {
      if (assignedStoreId) persistRuntimeState("kourosh_cloud_assigned_store_id", assignedStoreId);
      if (assignedPublicUrl) persistRuntimeState("kourosh_cloud_assigned_public_url", assignedPublicUrl);
      persistRuntimeState("kourosh_cloud_assignment_version", String(assignmentVersion || 1));
    },
  });
  connector.start();
  return resolveRuntimeReadiness(cachedSettings);
};

export const stopCloudConnectorRuntime = () => { connector?.stop(); connector = null; };
export const getCloudConnectorRuntimeStatus = () => ({ ...resolveRuntimeReadiness(cachedSettings), runtime: connector?.getStatus() || null });
export const getRelayConnectorRuntimeStatus = getCloudConnectorRuntimeStatus;
export const getLocalCloudConnector = () => connector;

export const requestTelegramThroughRelay = async (input: Parameters<LocalCloudConnector["requestTelegram"]>[0]) => {
  if (!connector) throw Object.assign(new Error("Relay unavailable."), { code: "CLOUD_RELAY_UNAVAILABLE" });
  return connector.requestTelegram(input);
};
export const requestTelegramThroughCloud = requestTelegramThroughRelay;

export const validateRelayTelegramOperational = async (botToken: string) => {
  if (!connector) return false;
  const ok = await connector.checkTelegramRelay(botToken).catch(() => false);
  persistRuntimeState("kourosh_cloud_telegram_relay_healthy", ok ? "1" : "0");
  return ok;
};
export const validateCloudTelegramOperational = validateRelayTelegramOperational;

export const validateRelayMiniAppOperational = async () => {
  if (!connector) return false;
  const ok = await connector.checkMiniAppRelay().catch(() => false);
  persistRuntimeState("kourosh_cloud_miniapp_relay_healthy", ok ? "1" : "0");
  return ok;
};
export const validateCloudMiniAppOperational = validateRelayMiniAppOperational;
