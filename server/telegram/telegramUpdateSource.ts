export type TelegramUpdateSource = "polling" | "webhook" | "cloud_relay";
export type NormalizedTelegramUpdate = Record<string, unknown>;
export type TelegramBusinessUpdateHandler = (update: NormalizedTelegramUpdate) => Promise<void>;

export const normalizeTelegramUpdate = (update: unknown): NormalizedTelegramUpdate =>
  update && typeof update === "object" ? update as NormalizedTelegramUpdate : {};

export const createTelegramUpdateIngress = (businessHandler: TelegramBusinessUpdateHandler) => {
  const dispatch = async (update: unknown, _source: TelegramUpdateSource) => {
    await businessHandler(normalizeTelegramUpdate(update));
  };
  return {
    fromPolling: (update: unknown) => dispatch(update, "polling"),
    fromWebhook: (update: unknown) => dispatch(update, "webhook"),
    fromCloudRelay: (update: unknown) => dispatch(update, "cloud_relay"),
  };
};
