import type { TelegramTransport, TelegramTransportRequest, TelegramTransportResult } from "./TelegramTransport";

export class DisabledTelegramTransport implements TelegramTransport {
  readonly mode = "disabled" as const;
  setProxy(_proxyUrl?: string | null): void {}
  async request(_request: TelegramTransportRequest): Promise<TelegramTransportResult> {
    return { success: false, message: "Telegram is disabled by configuration.", errorCode: "TELEGRAM_DISABLED" };
  }
}

export const disabledTelegramTransport = new DisabledTelegramTransport();
