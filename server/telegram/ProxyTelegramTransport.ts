import { DirectTelegramTransport } from "./DirectTelegramTransport";
import type { TelegramTransportRequest, TelegramTransportResult } from "./TelegramTransport";

export class ProxyTelegramTransport extends DirectTelegramTransport {
  readonly mode = "proxy" as const;
  private proxyUrl: string | undefined;

  setProxy(proxyUrl?: string | null): void {
    const value = String(proxyUrl || "").trim();
    this.proxyUrl = value || undefined;
  }

  async request(request: TelegramTransportRequest): Promise<TelegramTransportResult> {
    if (!this.proxyUrl) {
      return { success: false, message: "Telegram Proxy is not configured.", errorCode: "TELEGRAM_PROXY_NOT_CONFIGURED" };
    }
    // Proxy mode is proxy-only. Failure never retries Direct.
    return this.requestWithNetwork(request, { proxyUrl: this.proxyUrl });
  }
}

export const proxyTelegramTransport = new ProxyTelegramTransport();
