export type TelegramTransportMode = "disabled" | "direct" | "proxy" | "relay";

export type TelegramTransportResult = {
  success: boolean;
  status?: number;
  message?: string;
  data?: any;
  rawText?: string;
  errorCode?:
    | "TELEGRAM_DISABLED"
    | "TELEGRAM_PROXY_NOT_CONFIGURED"
    | "TELEGRAM_NETWORK_ERROR"
    | "CLOUD_RELAY_UNAVAILABLE"
    | "CLOUD_RELAY_TIMEOUT"
    | "CLOUD_RELAY_AUTH_FAILED"
    | "TELEGRAM_API_ERROR";
  details?: { httpStatus?: number; rawResponseText?: string; durationMs?: number };
};

export type TelegramMultipartPayload = {
  fields: Record<string, string>;
  attachment: {
    fieldName: "photo" | "document";
    filename: string;
    mimeType: string;
    data: Uint8Array;
  };
};

export type TelegramTransportRequest = {
  botToken: string;
  method: string;
  httpMethod?: "GET" | "POST";
  payload?: Record<string, unknown>;
  multipart?: TelegramMultipartPayload;
  /** Optional per-request client timeout. Long-polling may exceed the 12s direct default. */
  timeoutMs?: number;
};

export interface TelegramTransport {
  readonly mode: TelegramTransportMode;
  setProxy(proxyUrl?: string | null): void;
  request(request: TelegramTransportRequest): Promise<TelegramTransportResult>;
}

export const resolveTelegramTransportMode = (settings: Record<string, unknown>): TelegramTransportMode => {
  const raw = String(settings.telegram_transport_mode || "direct").trim();
  if (raw === "disabled" || raw === "direct" || raw === "proxy" || raw === "relay") return raw;
  // v151-v158 compatibility: cloud_relay is the managed relay strategy.
  if (raw === "cloud_relay") return "relay";
  return "direct";
};
