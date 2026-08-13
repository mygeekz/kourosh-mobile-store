import { randomUUID } from "node:crypto";
import { validateCloudRelayEnvelopeRuntime } from "./cloudRelayProtocolRuntime.mjs";

export const KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION = 1 as const;

export const CLOUD_RELAY_LIMITS = Object.freeze({
  controlMessageBytes: 64 * 1024,
  telegramJsonMessageBytes: 512 * 1024,
  telegramBinaryBytes: 8 * 1024 * 1024,
  miniAppBodyBytes: 8 * 1024 * 1024,
  wireMessageBytes: 12 * 1024 * 1024,
  requestTimeoutMs: 30_000,
  longPollRequestTimeoutMs: 45_000,
  maxPendingPerTenant: 128,
  maxConnections: 1_000,
  heartbeatIntervalMs: 25_000,
  heartbeatTimeoutMs: 75_000,
  authChallengeTtlMs: 10_000,
  authDeadlineMs: 10_000,
  maxUnauthenticatedConnectionsPerIp: 5,
  connectorAttemptsPerMinute: 30,
  publicRequestsPerMinutePerIpPerTenant: 120,
  publicGlobalRequestsPerMinutePerIp: 600,
  telegramResponseBytes: 6 * 1024 * 1024,
  rawDiagnosticBytes: 64 * 1024,
});

export type CloudRelayMessageType =
  | "connector_auth_hello"
  | "connector_auth_challenge"
  | "connector_auth_response"
  | "connector_ready"
  | "connector_health_request"
  | "connector_health_response"
  | "heartbeat"
  | "telegram_credential_bind"
  | "telegram_credential_bound"
  | "telegram_api_request"
  | "telegram_api_response"
  | "miniapp_http_request"
  | "miniapp_http_response"
  | "connector_error";

export type CloudRelayEnvelope<TType extends CloudRelayMessageType, TPayload> = {
  protocolVersion: typeof KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION;
  installationId: string;
  requestId: string;
  type: TType;
  timestamp: string;
  expiresAt: string;
  payload: TPayload;
};

export type ConnectorAuthHello = CloudRelayEnvelope<"connector_auth_hello", {
  publicKeyFingerprint: string;
  capabilities: Array<"telegram_api" | "miniapp_http">;
}>;

export type ConnectorAuthChallenge = CloudRelayEnvelope<"connector_auth_challenge", {
  challengeId: string;
  nonce: string;
}>;

export type ConnectorAuthResponse = CloudRelayEnvelope<"connector_auth_response", {
  challengeId: string;
  signature: string;
}>;

export type ConnectorReady = CloudRelayEnvelope<"connector_ready", {
  assignedStoreId: string;
  assignedHost: string | null;
  assignedPublicUrl: string | null;
  assignmentVersion: number;
  connectionState: "connected";
}>;

export type ConnectorHealthRequest = CloudRelayEnvelope<"connector_health_request", {
  checks: Array<"telegram" | "miniapp">;
}>;

export type ConnectorHealthResponse = CloudRelayEnvelope<"connector_health_response", {
  telegramRelayReady: boolean;
  miniAppRelayReady: boolean;
}>;

export type Heartbeat = CloudRelayEnvelope<"heartbeat", {
  connectionState: "connected" | "degraded";
}>;

export type TelegramCredentialBind = CloudRelayEnvelope<"telegram_credential_bind", {
  botToken: string;
}>;

export type TelegramCredentialBound = CloudRelayEnvelope<"telegram_credential_bound", {
  accepted: boolean;
}>;

export type TelegramBinaryAttachment = {
  fieldName: "photo" | "document";
  filename: string;
  mimeType: string;
  encoding: "base64";
  data: string;
};

export type TelegramApiRequest = CloudRelayEnvelope<"telegram_api_request", {
  method: string;
  httpMethod?: "GET" | "POST";
  body?: Record<string, unknown>;
  multipart?: {
    fields: Record<string, string>;
    attachment: TelegramBinaryAttachment;
  };
}>;

export type TelegramApiResponse = CloudRelayEnvelope<"telegram_api_response", {
  success: boolean;
  status?: number;
  message?: string;
  data?: unknown;
  rawText?: string;
  errorCode?: "CLOUD_RELAY_UNAVAILABLE" | "CLOUD_RELAY_TIMEOUT" | "CLOUD_RELAY_AUTH_FAILED" | "CLOUD_RELAY_RESPONSE_TOO_LARGE" | "TELEGRAM_API_ERROR";
  parameters?: unknown;
}>;

export type MiniAppHttpRequest = CloudRelayEnvelope<"miniapp_http_request", {
  method: "GET" | "POST" | "HEAD";
  path: string;
  publicHost: string;
  headers: Record<string, string>;
  clientContext: { ip: string };
  bodyBase64?: string;
}>;

export type MiniAppHttpResponse = CloudRelayEnvelope<"miniapp_http_response", {
  status: number;
  headers: Record<string, string>;
  bodyBase64?: string;
}>;

export type ConnectorError = CloudRelayEnvelope<"connector_error", {
  code: string;
  message: string;
  retryable: boolean;
}>;

export type CloudRelayProtocolMessage =
  | ConnectorAuthHello
  | ConnectorAuthChallenge
  | ConnectorAuthResponse
  | ConnectorReady
  | ConnectorHealthRequest
  | ConnectorHealthResponse
  | Heartbeat
  | TelegramCredentialBind
  | TelegramCredentialBound
  | TelegramApiRequest
  | TelegramApiResponse
  | MiniAppHttpRequest
  | MiniAppHttpResponse
  | ConnectorError;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;


export const createCloudRelayRequestId = (): string => randomUUID().replaceAll("-", "");

export const isCloudRelayRequestId = (value: unknown): boolean => REQUEST_ID_PATTERN.test(String(value || ""));

export const createCloudRelayEnvelope = <TType extends CloudRelayMessageType, TPayload>(
  installationId: string,
  type: TType,
  payload: TPayload,
  ttlMs = CLOUD_RELAY_LIMITS.requestTimeoutMs,
): CloudRelayEnvelope<TType, TPayload> => {
  const now = Date.now();
  return {
    protocolVersion: KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION,
    installationId,
    requestId: createCloudRelayRequestId(),
    type,
    timestamp: new Date(now).toISOString(),
    expiresAt: new Date(now + Math.max(1_000, Math.min(ttlMs, 120_000))).toISOString(),
    payload,
  };
};

export type CloudRelayValidationResult =
  | { ok: true; message: CloudRelayProtocolMessage }
  | { ok: false; code: string; message: string };

export const validateCloudRelayEnvelope = (
  value: unknown,
  expectedInstallationId?: string,
  nowMs = Date.now(),
): CloudRelayValidationResult => {
  const runtime = validateCloudRelayEnvelopeRuntime(value, expectedInstallationId, nowMs);
  if (!runtime.ok) {
    const messages: Record<string, string> = {
      MALFORMED_PAYLOAD: "Relay envelope or payload is malformed.",
      UNSUPPORTED_PROTOCOL_VERSION: "Unsupported relay protocol version.",
      INVALID_INSTALLATION_ID: "Invalid installation identity.",
      INSTALLATION_ID_MISMATCH: "Envelope installation does not match authenticated tenant.",
      INVALID_REQUEST_ID: "Invalid relay request id.",
      UNKNOWN_MESSAGE_TYPE: "Unknown relay message type.",
      INVALID_TIMESTAMP: "Relay timestamps are invalid.",
      EXPIRED_MESSAGE: "Relay message is expired.",
      FUTURE_TIMESTAMP: "Relay message timestamp is too far in the future.",
      INVALID_EXPIRY_ORDER: "Relay expiry precedes its timestamp.",
      TTL_TOO_LARGE: "Relay message TTL exceeds the accepted window.",
    };
    return { ok: false, code: runtime.code, message: messages[runtime.code] || "Relay envelope rejected." };
  }
  return { ok: true, message: value as CloudRelayProtocolMessage };
};

export const cloudRelaySerializedBytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), "utf8");
