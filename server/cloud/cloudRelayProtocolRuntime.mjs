export const KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION_RUNTIME = 1;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const INSTALLATION_ID_PATTERN = /^inst_[A-Za-z0-9_-]{24}$/;
const TYPE_SET = new Set([
  "connector_auth_hello", "connector_auth_challenge", "connector_auth_response", "connector_ready",
  "connector_health_request", "connector_health_response", "heartbeat", "telegram_credential_bind",
  "telegram_credential_bound", "telegram_api_request", "telegram_api_response", "miniapp_http_request",
  "miniapp_http_response", "connector_error",
]);

export const validateCloudRelayEnvelopeRuntime = (value, expectedInstallationId, nowMs = Date.now()) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, code: "MALFORMED_PAYLOAD" };
  if (value.protocolVersion !== KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION_RUNTIME) return { ok: false, code: "UNSUPPORTED_PROTOCOL_VERSION" };
  const installationId = String(value.installationId || "");
  if (!INSTALLATION_ID_PATTERN.test(installationId)) return { ok: false, code: "INVALID_INSTALLATION_ID" };
  if (expectedInstallationId && installationId !== expectedInstallationId) return { ok: false, code: "INSTALLATION_ID_MISMATCH" };
  if (!REQUEST_ID_PATTERN.test(String(value.requestId || ""))) return { ok: false, code: "INVALID_REQUEST_ID" };
  if (!TYPE_SET.has(String(value.type || ""))) return { ok: false, code: "UNKNOWN_MESSAGE_TYPE" };
  const timestamp = Date.parse(String(value.timestamp || ""));
  const expiresAt = Date.parse(String(value.expiresAt || ""));
  if (!Number.isFinite(timestamp) || !Number.isFinite(expiresAt)) return { ok: false, code: "INVALID_TIMESTAMP" };
  if (expiresAt <= nowMs) return { ok: false, code: "EXPIRED_MESSAGE" };
  if (timestamp > nowMs + 30_000) return { ok: false, code: "FUTURE_TIMESTAMP" };
  if (expiresAt < timestamp) return { ok: false, code: "INVALID_EXPIRY_ORDER" };
  if (expiresAt - timestamp > 120_000) return { ok: false, code: "TTL_TOO_LARGE" };
  if (!("payload" in value)) return { ok: false, code: "MALFORMED_PAYLOAD" };
  return { ok: true, code: "OK" };
};
