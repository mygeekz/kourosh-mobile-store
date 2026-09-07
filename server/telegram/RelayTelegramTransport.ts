import type { TelegramTransport, TelegramTransportRequest, TelegramTransportResult } from "./TelegramTransport";
import { requestTelegramThroughRelay } from "../cloud/cloudConnectorRuntime";

const MAX_BINARY_BYTES = 8 * 1024 * 1024;

export class RelayTelegramTransport implements TelegramTransport {
  readonly mode = "relay" as const;
  setProxy(_proxyUrl?: string | null): void { /* Relay never uses the local Telegram proxy. */ }

  async request(request: TelegramTransportRequest): Promise<TelegramTransportResult> {
    const startedAt = Date.now();
    try {
      let multipart: any = undefined;
      if (request.multipart) {
        const binary = Buffer.from(request.multipart.attachment.data);
        if (binary.length > MAX_BINARY_BYTES) return { success: false, message: "Telegram attachment exceeds Relay limit.", errorCode: "CLOUD_RELAY_UNAVAILABLE" };
        multipart = {
          fields: request.multipart.fields,
          attachment: {
            fieldName: request.multipart.attachment.fieldName,
            filename: request.multipart.attachment.filename,
            mimeType: request.multipart.attachment.mimeType,
            encoding: "base64",
            data: binary.toString("base64"),
          },
        };
      }
      const payload = await requestTelegramThroughRelay({
        botToken: request.botToken,
        method: request.method,
        httpMethod: request.httpMethod,
        body: request.payload,
        multipart,
        timeoutMs: request.timeoutMs,
      });
      return {
        success: Boolean(payload?.success),
        status: payload?.status,
        message: payload?.message,
        data: payload?.data,
        rawText: payload?.rawText,
        errorCode: payload?.errorCode,
        details: { httpStatus: payload?.status, rawResponseText: payload?.rawText, durationMs: Date.now() - startedAt },
      };
    } catch (error: any) {
      const code = String(error?.code || "CLOUD_RELAY_UNAVAILABLE");
      return {
        success: false,
        message: code === "CLOUD_RELAY_TIMEOUT" ? "Relay request timeout." : "Relay unavailable.",
        errorCode: code === "CLOUD_RELAY_TIMEOUT" ? "CLOUD_RELAY_TIMEOUT" : code === "CLOUD_RELAY_AUTH_FAILED" ? "CLOUD_RELAY_AUTH_FAILED" : "CLOUD_RELAY_UNAVAILABLE",
        details: { rawResponseText: "", durationMs: Date.now() - startedAt },
      };
    }
  }
}

export const relayTelegramTransport = new RelayTelegramTransport();
