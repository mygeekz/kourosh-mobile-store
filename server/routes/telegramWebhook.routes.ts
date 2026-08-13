import type { Express } from "express";
import moment from "jalali-moment";
import { getAllSettingsAsObject, updateSetting } from "../database";

type RegisterTelegramWebhookDeps = {
  handleTelegramUpdate: (update: any) => Promise<void>;
};

export const registerTelegramWebhookRoutes = (
  app: Express,
  { handleTelegramUpdate }: RegisterTelegramWebhookDeps,
): void => {
  app.post("/api/telegram/webhook", async (req, res) => {
    // Always ack fast; handle asynchronously.
    res.status(200).json({ ok: true });
    try {
      const settings = await getAllSettingsAsObject();
      const secret = String(
        (settings as any).telegram_webhook_secret || "",
      ).trim();
      if (secret) {
        const h = String(
          req.headers["x-telegram-bot-api-secret-token"] || "",
        ).trim();
        if (h !== secret) return;
      }
      // Track last received update for Control Center
      try {
        await updateSetting("telegram_last_webhook_at", moment().toISOString());
      } catch {}
      await handleTelegramUpdate(req.body || {});
    } catch {
      // swallow errors (webhook should never crash)
    }
  });
};
