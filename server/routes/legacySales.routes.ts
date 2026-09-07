import type { Express, NextFunction, Request, Response } from 'express';
import {
  buildLegacySaleTelegramText,
  recordLegacySale,
  recordLegacySaleInventoryOutIfNeeded,
  type SaleDataPayload,
} from '../services/legacySales.service';

export type LegacySalesRoutesDeps = {
  getTelegramTargetsForTopic: (
    topic: string,
  ) => Promise<{ botToken: string; chatIds: any[] }>;
  sendTelegramMessages: (
    botToken: string,
    chatIds: any[],
    text: string,
  ) => Promise<any>;
  formatPriceForSms: (price: number) => string;
};

export function registerLegacySalesRoutes(app: Express, deps: LegacySalesRoutesDeps) {
  const { getTelegramTargetsForTopic, sendTelegramMessages, formatPriceForSms } = deps;

  /** (قدیمی) فروش تکی — فقط برای سازگاریِ صفحاتی که هنوز از این مسیر استفاده می‌کنند */
  app.post('/api/sales', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saleData = req.body as SaleDataPayload;
      const data = await recordLegacySale(saleData);
      // Internal Telegram notification for sales (optional, based on settings)
      try {
        const { botToken, chatIds } = await getTelegramTargetsForTopic('sales');
        if (botToken && chatIds.length) {
          const text = buildLegacySaleTelegramText({
            data,
            saleData,
            formatPriceForSms,
          });
          await sendTelegramMessages(botToken, chatIds, text);
        }
      } catch (e) {}
      // Inventory ledger OUT (FIFO consumption) - only for inventory sales
      try {
        await recordLegacySaleInventoryOutIfNeeded({ data, saleData });
      } catch {}
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  });
}

// Backward-compatible type aliases for older imports.
export type LegacySalesDeps = LegacySalesRoutesDeps;
