
import { sendSMS } from "./smsService";
import { sendTelegramMessage } from "./telegramService";
import { lowInventoryTemplate } from "./notificationTemplates";
import { logger } from "./logger";

export async function notifyLowInventory(productId: number, quantity: number) {
  const message = lowInventoryTemplate(productId, quantity);

  try {
    await sendSMS(message);
  } catch (e) {
    logger.error("SMS failed");
  }

  try {
    await sendTelegramMessage(message);
  } catch (e) {
    logger.error("Telegram failed");
  }
}
