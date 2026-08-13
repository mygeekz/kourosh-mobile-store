import type { Express, NextFunction, Request, Response } from "express";
import moment from "jalali-moment";
import { formatExactNumberText } from '../../utils/exactNumber';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        roleName: string;
        firstName?: string | null;
        lastName?: string | null;
        avatarUrl?: string | null;
      };
    }
  }
}

import {
  allAsync,
  getAllSettingsAsObject,
  getAsync,
  getCustomerByIdFromDb,
  getPartnerByIdFromDb,
  runAsync,
} from "../database";
import {
  updateCustomerTelegramDelivery,
  updatePartnerTelegramDelivery,
} from "../services/telegramIdentitySecurity.service";

type AuthorizeRole = (roles: string[]) => any;

interface NotificationOutboxRouteDeps {
  authorizeRole: AuthorizeRole;
  ensureNotificationOutboxTables: () => Promise<void>;
  processOneOutboxRow: () => Promise<boolean> | boolean;
  lookupCustomerTelegramChatId: (customerId: number) => Promise<string>;
  lookupPartnerTelegramChatId: (partnerId: number) => Promise<string>;
  trySendTelegramMediaNow: (
    messageType: any,
    fileRelPath: string,
    text: string,
    chatId: string | null,
    options?: any,
  ) => Promise<any>;
  trySendTelegramNow: (
    text: string,
    chatId: string | null,
    options?: any,
  ) => Promise<any>;
  insertSmsLog: (entry: any) => Promise<any>;
  enqueueOutbox: (opts: any) => Promise<any>;
  tryDeliverQueuedTelegramNow: (queued: any, payload: any, chatId: string) => Promise<any>;
}

export const registerNotificationOutboxRoutes = (
  app: Express,
  deps: NotificationOutboxRouteDeps,
): void => {
  const {
    authorizeRole,
    ensureNotificationOutboxTables,
    processOneOutboxRow,
    lookupCustomerTelegramChatId,
    lookupPartnerTelegramChatId,
    trySendTelegramMediaNow,
    trySendTelegramNow,
    insertSmsLog,
    enqueueOutbox,
    tryDeliverQueuedTelegramNow,
  } = deps;

const REPORT_CURRENCY_CONTRACT = {
  currencyBase: "TOMAN",
  displayCurrency: "تومان",
  moneyDivisor: 1,
} as const;

const formatReportMoneyText = (value: any): string => {
  const n = Number(value || 0);
  const toman = Number.isFinite(n) ? n / REPORT_CURRENCY_CONTRACT.moneyDivisor : 0;
  const displayAmount = Math.round(toman / 1_000) * 1_000;
  return `${formatExactNumberText(displayAmount)} ${REPORT_CURRENCY_CONTRACT.displayCurrency}`;
};

// Admin endpoints for outbox
// --------------------------------------------------
// Manual messaging (SMS/Telegram) – free text
// --------------------------------------------------
// --------------------------------------------------
// Person report text for Telegram/SMS
// --------------------------------------------------
const moneyFa = (v: any) => formatReportMoneyText(v);
const buildCustomerReportText = async (customerId: number) => {
  const c = await getCustomerByIdFromDb(customerId);
  if (!c) return null;
  // invoices
  const invAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(grandTotal),0) as total, MAX(date) as lastDate
       FROM invoices
      WHERE customerId = ?`,
    [customerId],
  );
  // installment sales
  const instAgg = await getAsync(
    `SELECT COUNT(1) as cnt,
            COALESCE(SUM(actualSalePrice),0) as total,
            COALESCE(SUM(downPayment),0) as down
       FROM installment_sales
      WHERE customerId = ?
        AND COALESCE(status,'active') = 'active'`,
    [customerId],
  );
  // unpaid / overdue / due soon (uses shamsi dueDate in installment_payments)
  const todayJ = moment().locale("fa").format("jYYYY/jMM/jDD");
  const soon7J = moment().add(7, "day").locale("fa").format("jYYYY/jMM/jDD");
  const unpaidAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'
        AND ip.status != 'پرداخت شده'`,
    [customerId],
  );
  const overdueAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate < ?`,
    [customerId, todayJ],
  );
  const dueSoonAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate >= ?
        AND ip.dueDate <= ?`,
    [customerId, todayJ, soon7J],
  );
  const lines: string[] = [];
  lines.push("گزارش مشتری");
  lines.push(`نام: ${c.fullName || "—"}`);
  lines.push(`موبایل: ${(c.phoneNumber || "").trim() || "—"}`);
  lines.push("");
  lines.push(
    `فروش نقدی: ${Number(invAgg?.cnt || 0).toLocaleString("fa-IR")} فاکتور • ${moneyFa(invAgg?.total)}`,
  );
  if (invAgg?.lastDate)
    lines.push(`آخرین خرید: ${String(invAgg.lastDate).slice(0, 10)}`);
  lines.push(
    `فروش اقساطی: ${Number(instAgg?.cnt || 0).toLocaleString("fa-IR")} فروش • ${moneyFa(instAgg?.total)} (پیش‌پرداخت: ${moneyFa(instAgg?.down)})`,
  );
  lines.push(
    `مانده اقساط: ${moneyFa(unpaidAgg?.total)} • تعداد: ${Number(unpaidAgg?.cnt || 0).toLocaleString("fa-IR")}`,
  );
  lines.push(
    `معوق: ${moneyFa(overdueAgg?.total)} • ${Number(overdueAgg?.cnt || 0).toLocaleString("fa-IR")} قسط`,
  );
  lines.push(
    `۷ روز آینده: ${moneyFa(dueSoonAgg?.total)} • ${Number(dueSoonAgg?.cnt || 0).toLocaleString("fa-IR")} قسط`,
  );
  return lines.join("\n");
};

const getPartnerTypeFa = (value?: string | null) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "supplier") return "تأمین‌کننده";
  if (v === "technician") return "تعمیرکار";
  if (v === "both") return "همکار چندمنظوره";
  return String(value || "—");
};

const buildPartnerReportText = async (partnerId: number) => {
  const p = await getPartnerByIdFromDb(partnerId);
  if (!p) return null;

  const purchasesAgg = await getAsync(
    `SELECT
       COUNT(1) as cnt,
       COALESCE(SUM(CASE WHEN credit > 0 THEN credit ELSE 0 END),0) as total,
       MAX(transactionDate) as lastDate
     FROM partner_ledger
     WHERE partnerId = ?
       AND (credit > 0 OR LOWER(COALESCE(referenceType, '')) LIKE '%purchase%' OR description LIKE '%خرید%')`,
    [partnerId],
  );
  const repairsAgg = await getAsync(
    `SELECT
       COUNT(1) as cnt,
       COALESCE(SUM(CASE WHEN credit > 0 THEN credit ELSE 0 END),0) as total,
       MAX(transactionDate) as lastDate
     FROM partner_ledger
     WHERE partnerId = ?
       AND (credit > 0 OR LOWER(COALESCE(referenceType, '')) LIKE '%repair%' OR description LIKE '%تعمیر%')`,
    [partnerId],
  );
  const allLedgerAgg = await getAsync(
    `SELECT
       COUNT(1) as cnt,
       COALESCE(SUM(CASE WHEN credit > 0 THEN credit ELSE debit END),0) as total,
       MAX(transactionDate) as lastDate
     FROM partner_ledger
     WHERE partnerId = ?`,
    [partnerId],
  );
  const purchasesTableAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(totalCost),0) as total, MAX(purchaseDate) as lastDate
       FROM purchases
      WHERE supplierId = ?`,
    [partnerId],
  );
  const repTableAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(COALESCE(finalCost, laborFee, 0)),0) as total
       FROM repairs
      WHERE technicianId = ?`,
    [partnerId],
  );

  const currentBalance = Number((p as any)?.currentBalance || 0);
  const balanceText =
    currentBalance > 0
      ? `بدهکار: ${moneyFa(currentBalance)}`
      : currentBalance < 0
        ? `طلبکار: ${moneyFa(Math.abs(currentBalance))}`
        : "تسویه";

  const purchasesCount = Number(
    purchasesAgg?.cnt ||
      purchasesTableAgg?.cnt ||
      allLedgerAgg?.cnt ||
      (currentBalance !== 0 ? 1 : 0),
  );
  const purchasesTotal = Number(
    purchasesAgg?.total ||
      purchasesTableAgg?.total ||
      allLedgerAgg?.total ||
      Math.abs(currentBalance) ||
      0,
  );
  const purchasesLastDate =
    purchasesAgg?.lastDate ||
    purchasesTableAgg?.lastDate ||
    allLedgerAgg?.lastDate ||
    null;
  const repairsCount = Number(repTableAgg?.cnt || repairsAgg?.cnt || 0);
  const repairsTotal = Number(repTableAgg?.total || repairsAgg?.total || 0);

  const lines: string[] = [];
  lines.push("گزارش همکار");
  lines.push(`نام: ${p.partnerName || "—"}`);
  lines.push(`موبایل: ${(p.phoneNumber || "").trim() || "—"}`);
  lines.push(`نوع: ${getPartnerTypeFa(p.partnerType)}`);
  lines.push("");
  lines.push(
    `خریدها: ${purchasesCount.toLocaleString("fa-IR")} سند • ${moneyFa(purchasesTotal)}`,
  );
  if (purchasesLastDate)
    lines.push(`آخرین خرید: ${String(purchasesLastDate).slice(0, 10)}`);
  lines.push(
    `تعمیرات: ${repairsCount.toLocaleString("fa-IR")} مورد • ${moneyFa(repairsTotal)}`,
  );
  lines.push(`مانده حساب: ${balanceText}`);
  return lines.join("\n");
};

app.get(
  "/api/reports/customer/:id/message",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "شناسه مشتری نامعتبر است." });
      const text = await buildCustomerReportText(id);
      if (!text)
        return res
          .status(404)
          .json({ success: false, message: "مشتری پیدا نشد." });
      return res.json({ success: true, data: { text } });
    } catch (e) {
      return next(e);
    }
  },
);
app.get(
  "/api/reports/partner/:id/message",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "شناسه همکار نامعتبر است." });
      const text = await buildPartnerReportText(id);
      if (!text)
        return res
          .status(404)
          .json({ success: false, message: "همکار پیدا نشد." });
      return res.json({ success: true, data: { text } });
    } catch (e) {
      return next(e);
    }
  },
);
app.post(
  "/api/messages/send",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body || {};
      const recipientType = String(body.recipientType || "").trim();
      const recipientId =
        body.recipientId != null ? Number(body.recipientId) : null;
      const phoneNumberRaw = String(body.phoneNumber || "").trim();
      const telegramChatIdRaw = String(body.telegramChatId || "").trim();
      const channels: string[] = Array.isArray(body.channels)
        ? body.channels
        : [];
      const text = String(body.text || "").trim();
      const saveToProfile = body.saveToProfile !== false;
      const customVariables =
        body?.variables && typeof body.variables === "object"
          ? body.variables
          : {};
      const formatMessageAmount = (value: unknown) => {
        if (value == null || value === "") return "";
        const normalized = String(value).replace(/,/g, "").trim();
        const numeric = Number(normalized);
        if (Number.isFinite(numeric)) return numeric.toLocaleString("fa-IR");
        return String(value);
      };
      const resolveManualTemplateText = (
        rawText: string,
        variables: Record<string, unknown>,
      ) =>
        String(rawText || "").replace(
          /\{(name|phone|amount|dueDate|link)\}/g,
          (match, key) => {
            const value = variables[key];
            if (key === "amount") return formatMessageAmount(value) || match;
            const resolved = String(value ?? "").trim();
            return resolved || match;
          },
        );
      if (!text)
        return res
          .status(400)
          .json({ success: false, message: "متن پیام الزامی است." });
      if (!channels.length)
        return res
          .status(400)
          .json({ success: false, message: "حداقل یک کانال انتخاب کنید." });
      if (!["customer", "partner", "manual"].includes(recipientType)) {
        return res
          .status(400)
          .json({ success: false, message: "نوع گیرنده نامعتبر است." });
      }
      const settings = await getAllSettingsAsObject();
      // Resolve recipient info
      let resolvedName: string | null = null;
      let resolvedPhone: string | null = phoneNumberRaw || null;
      let resolvedChatId: string | null = telegramChatIdRaw || null;
      if (recipientType !== "manual") {
        if (!recipientId || Number.isNaN(recipientId)) {
          return res
            .status(400)
            .json({ success: false, message: "شناسه گیرنده نامعتبر است." });
        }
        if (recipientType === "customer") {
          const c = await getCustomerByIdFromDb(recipientId);
          if (!c)
            return res
              .status(404)
              .json({ success: false, message: "مشتری پیدا نشد." });
          resolvedName = c.fullName || null;
          resolvedPhone = resolvedPhone || c.phoneNumber || null;
          resolvedChatId = resolvedChatId || (c as any).telegramChatId || null;
          // Delivery-only write: this must never create or replace an identity mapping.
          if (saveToProfile && telegramChatIdRaw) {
            await updateCustomerTelegramDelivery(recipientId, telegramChatIdRaw);
          }
        } else {
          const p = await getPartnerByIdFromDb(recipientId);
          if (!p)
            return res
              .status(404)
              .json({ success: false, message: "همکار پیدا نشد." });
          resolvedName = p.partnerName || null;
          resolvedPhone = resolvedPhone || p.phoneNumber || null;
          resolvedChatId = resolvedChatId || (p as any).telegramChatId || null;
          if (saveToProfile && telegramChatIdRaw) {
            await updatePartnerTelegramDelivery(recipientId, telegramChatIdRaw);
          }
        }
      }
      const normalizedPhone = (resolvedPhone || "").replace(/\D/g, "");
      const normalizedChatId = String(resolvedChatId || "").trim();
      // Validate per channel
      if (
        channels.includes("sms") &&
        (!normalizedPhone || normalizedPhone.length < 10)
      ) {
        return res.status(400).json({
          success: false,
          message: "شماره موبایل برای پیامک معتبر نیست.",
        });
      }
      if (channels.includes("telegram") && !normalizedChatId) {
        return res.status(400).json({
          success: false,
          message: "Chat ID تلگرام گیرنده مشخص نیست.",
        });
      }
      // Build & enqueue
      const entityType = recipientType === "partner" ? "partner" : "customer";
      const entityId = recipientType === "manual" ? null : recipientId;
      const templateVariables = {
        name: resolvedName || customVariables?.name || "",
        phone: normalizedPhone || String(customVariables?.phone || "").trim(),
        amount: customVariables?.amount ?? "",
        dueDate: String(customVariables?.dueDate || "").trim(),
        link: String(customVariables?.link || "").trim(),
      };
      const resolvedText = resolveManualTemplateText(text, templateVariables);
      const baseContext = {
        ...templateVariables,
        name: resolvedName || customVariables?.name || "",
        phoneNumber: normalizedPhone,
        telegramChatId: normalizedChatId,
      };
      const queued: any[] = [];
      if (channels.includes("telegram")) {
        const tgProvider = String(settings.telegram_provider || "bot");
        const payload = {
          provider: tgProvider,
          chatId: normalizedChatId,
          text: resolvedText,
          context: baseContext,
        };
        const queuedTelegram = await enqueueOutbox({
          channel: "telegram",
          provider: tgProvider,
          eventType: "MANUAL_MESSAGE",
          entityType: entityType,
          entityId: entityId,
          recipient: normalizedChatId,
          payload,
          skipCustomerRateLimit: true,
          skipInvalidChatCheck: true,
        });
        const deliveredTelegram = await tryDeliverQueuedTelegramNow(
          queuedTelegram,
          payload,
          normalizedChatId,
        );
        queued.push({
          channel: "telegram",
          id: (queuedTelegram as any)?.id,
          deliveredNow: !!(deliveredTelegram as any)?.deliveredNow,
        });
      }
      if (channels.includes("sms")) {
        const smsProvider = String(settings.sms_provider || "meli_payamak");
        // Free-text via pattern/template requires a configured "custom" template per provider.
        const nameToken = (resolvedName || "").trim() || "مشتری";
        const tokens = [nameToken, resolvedText];
        let smsPayload: any = {
          provider: smsProvider,
          recipient: normalizedPhone,
          tokens,
        };
        if (smsProvider === "meli_payamak") {
          const bodyId = String(
            settings.meli_payamak_custom_body_id || "",
          ).trim();
          if (!bodyId) {
            return res.status(400).json({
              success: false,
              message:
                "برای پیامک متن آزاد، «کد بدنه/BodyId سفارشی» در تنظیمات پیامک را تنظیم کنید.",
            });
          }
          smsPayload = { ...smsPayload, meliBodyId: bodyId };
        } else if (smsProvider === "kavenegar") {
          const template = String(
            settings.kavenegar_custom_template || "",
          ).trim();
          if (!template) {
            return res.status(400).json({
              success: false,
              message:
                "برای پیامک متن آزاد، «نام قالب/Template سفارشی» کاوه‌نگار را در تنظیمات پیامک تنظیم کنید.",
            });
          }
          smsPayload = { ...smsPayload, kavenegarTemplate: template };
        } else if (smsProvider === "sms_ir") {
          const templateId = String(
            settings.sms_ir_custom_template_id || "",
          ).trim();
          if (!templateId) {
            return res.status(400).json({
              success: false,
              message:
                "برای پیامک متن آزاد، «TemplateId سفارشی» SMS.ir را در تنظیمات پیامک تنظیم کنید.",
            });
          }
          smsPayload = { ...smsPayload, smsIrTemplateId: templateId };
        } else if (smsProvider === "ippanel") {
          const patternCode = String(
            settings.ippanel_custom_pattern_code || "",
          ).trim();
          if (!patternCode) {
            return res.status(400).json({
              success: false,
              message:
                "برای پیامک متن آزاد، «PatternCode سفارشی» IPPanel را در تنظیمات پیامک تنظیم کنید.",
            });
          }
          smsPayload = { ...smsPayload, ippanelPatternCode: patternCode };
        }
        const rowId = await enqueueOutbox({
          channel: "sms",
          provider: smsProvider,
          eventType: "MANUAL_MESSAGE",
          entityType: entityType,
          entityId: entityId,
          recipient: normalizedPhone,
          payload: smsPayload,
        });
        queued.push({ channel: "sms", id: rowId });
      }
      return res.json({ success: true, data: { queued } });
    } catch (err) {
      next(err);
    }
  },
);
// Admin endpoints for outbox
app.get(
  "/api/notifications/outbox",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      res.setHeader("Cache-Control", "no-store");
      const status = String(req.query.status || "pending").trim();
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "100"), 10) || 100, 1), 500);
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
      const whereSql = status && status !== "ALL" ? "WHERE status = ?" : "";
      const whereArgs = status && status !== "ALL" ? [status] : [];
      const rows = await allAsync(
        `SELECT * FROM notification_outbox ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...whereArgs, limit, offset],
      );
      const totalRow = await getAsync(
        `SELECT COUNT(*) AS total FROM notification_outbox ${whereSql}`,
        whereArgs,
      );
      const statusRows = await allAsync(
        `SELECT LOWER(COALESCE(status, 'unknown')) AS status, COUNT(*) AS count
           FROM notification_outbox
          GROUP BY LOWER(COALESCE(status, 'unknown'))`,
      );
      const byStatus = Object.fromEntries((statusRows || []).map((row: any) => [String(row.status || "unknown"), Number(row.count || 0)]));
      res.json({
        success: true,
        data: rows,
        meta: {
          pagination: { limit, offset, total: Number((totalRow as any)?.total || 0) },
          stats: {
            pending: Number(byStatus.pending || 0),
            processing: Number(byStatus.processing || 0),
            sent: Number(byStatus.sent || byStatus.done || 0),
            failed: Number(byStatus.failed || 0),
            total: Object.values(byStatus).reduce((sum: number, value: any) => sum + Number(value || 0), 0),
          },
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/notifications/outbox/:id/retry",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await ensureNotificationOutboxTables();
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ success: false, message: "شناسه صف نامعتبر است." });
      }
      const updateResult = await runAsync(
        `UPDATE notification_outbox
            SET status='pending', attempts=0, lastError=NULL, nextAttemptAt=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
          WHERE id=?`,
        [moment().toISOString(), id],
      );
      if (Number((updateResult as any)?.changes || 0) < 1) {
        return res.status(404).json({ success: false, message: "رکورد صف پیدا نشد." });
      }
      // kick worker once
      try {
        await processOneOutboxRow();
      } catch {}
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
// =====================================================
// Telegram Inbox/Outbox (Support Center)
// =====================================================
// Telegram Outbox: rich list for support center (filters + parsed payload + customer linkage)
app.get(
  "/api/telegram/outbox/messages",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      res.setHeader("Cache-Control", "no-store");

      const status = String(req.query.status || "ALL").trim().toLowerCase();
      const type = String(req.query.type || "ALL").trim().toLowerCase();
      const channel = String(req.query.channel || "telegram").trim().toLowerCase();
      const customerId = String(req.query.customerId || "").trim();
      const from = String(req.query.from || "").trim();
      const to = String(req.query.to || "").trim();
      const q = String(req.query.q || "").trim().toLowerCase();
      const support = String(req.query.support || "ALL").trim().toLowerCase();
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "12"), 10) || 12, 1), 100);
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

      const where: string[] = [];
      const args: any[] = [];
      if (channel !== "all") {
        const normalizedChannel = channel === "sms" ? "sms" : "telegram";
        where.push(`LOWER(channel)=?`);
        args.push(normalizedChannel);
      }
      if (from) {
        where.push(`datetime(createdAt) >= datetime(?)`);
        args.push(from);
      }
      if (to) {
        where.push(`datetime(createdAt) <= datetime(?)`);
        args.push(to);
      }
      if (support === "resolved") where.push(`supportStatus='resolved'`);
      if (support === "open") where.push(`IFNULL(supportStatus,'') != 'resolved'`);

      const rows: any[] = await allAsync(
        `SELECT * FROM notification_outbox ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT 5000`,
        args,
      );

      const parsePayload = (value: any) => {
        try {
          return JSON.parse(String(value || "{}"));
        } catch {
          return {};
        }
      };
      const inferType = (eventType?: string | null, entityType?: string | null) => {
        const event = String(eventType || "").toUpperCase();
        const entity = String(entityType || "").toLowerCase();
        if (event === "MANUAL_MESSAGE") return "manual";
        if (event.startsWith("REPAIR_") || entity.includes("repair")) return "repairs";
        if (event.startsWith("INSTALLMENT_") || event.startsWith("CHECK_") || entity.includes("installment")) return "installments";
        if (event.startsWith("REPORT_") || event.includes("MANAGER")) return "reports";
        return "other";
      };
      const classifyError = (errorValue: any) => {
        const error = String(errorValue || "").toLowerCase();
        if (!error) return null;
        if (error.includes("bot was blocked") || error.includes("blocked by the user") || error.includes("forbidden") || error.includes("403")) return "blocked";
        if (error.includes("chat not found") || error.includes("user not found") || error.includes("400")) return "chat not found";
        if (error.includes("proxy") || error.includes("socks") || error.includes("econnrefused") || error.includes("etimedout") || error.includes("tunnel") || error.includes("timeout")) return "proxy error";
        return "other";
      };

      const customerIds = new Set<number>();
      const parsedRows = (rows || []).map((row: any) => {
        const payload = parsePayload(row.payloadJson);
        const resolvedCustomerId = Number(row.capCustomerId || payload?.customerId || payload?.context?.customerId || 0) || null;
        if (resolvedCustomerId) customerIds.add(resolvedCustomerId);
        return { row, payload, resolvedCustomerId };
      });

      const customerMap = new Map<number, any>();
      if (customerIds.size) {
        const ids = Array.from(customerIds);
        const placeholders = ids.map(() => "?").join(",");
        const customers = await allAsync(
          `SELECT id, fullName, phoneNumber, COALESCE(telegram_chat_id, telegramChatId) AS telegramChatId FROM customers WHERE id IN (${placeholders})`,
          ids,
        ).catch(() => []);
        for (const customer of customers || []) customerMap.set(Number(customer.id), customer);
      }

      const mapped = parsedRows.map(({ row, payload, resolvedCustomerId }: any) => {
        const rowChannel = String(row.channel || "").toLowerCase() === "sms" ? "sms" : "telegram";
        const customer = resolvedCustomerId ? customerMap.get(resolvedCustomerId) : null;
        const tokens = Array.isArray(payload?.tokens) ? payload.tokens.filter((token: any) => token != null && String(token).trim()) : [];
        const messageText = String(payload?.text || payload?.message || payload?.body || payload?.content || "").trim()
          || (tokens.length ? `متغیرهای الگو: ${tokens.join(" | ")}` : "");
        const recipient = String(payload?.recipient || row.recipient || "").trim();
        const chatId = rowChannel === "telegram" ? String(payload?.chatId || row.recipient || "").trim() : "";
        const messageType = inferType(row.eventType, row.entityType);
        const isRetried = Number(row.attempts || 0) > 0 && ["pending", "processing"].includes(String(row.status || "").toLowerCase());
        return {
          id: Number(row.id),
          channel: rowChannel,
          provider: row.provider || null,
          recipient,
          status: row.status,
          isRetried,
          attempts: Number(row.attempts || 0),
          maxAttempts: Number(row.maxAttempts || 0),
          nextAttemptAt: row.nextAttemptAt || null,
          createdAt: row.createdAt || null,
          updatedAt: row.updatedAt || null,
          eventType: row.eventType || null,
          entityType: row.entityType || null,
          entityId: row.entityId == null ? null : Number(row.entityId),
          chatId: chatId || null,
          text: messageText || null,
          customerId: resolvedCustomerId,
          customerName: customer?.fullName || null,
          customerPhone: customer?.phoneNumber || (rowChannel === "sms" ? recipient : null),
          supportStatus: row.supportStatus || null,
          supportNote: row.supportNote || null,
          error: row.lastError || null,
          errorKind: classifyError(row.lastError),
          messageType,
        };
      });

      const scoped = mapped.filter((item: any) => {
        if (type !== "all" && item.messageType !== type) return false;
        if (customerId && String(item.customerId || "") !== customerId) return false;
        if (!q) return true;
        const haystack = [
          item.id,
          item.channel,
          item.provider,
          item.recipient,
          item.chatId,
          item.customerName,
          item.customerPhone,
          item.eventType,
          item.entityType,
          item.status,
          item.error,
          item.text,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });

      const stats = scoped.reduce((acc: any, item: any) => {
        const itemStatus = String(item.status || "").toLowerCase();
        acc.total += 1;
        if (itemStatus === "pending") acc.pending += 1;
        else if (itemStatus === "processing") acc.processing += 1;
        else if (itemStatus === "done" || itemStatus === "sent") acc.sent += 1;
        else if (itemStatus === "failed") acc.failed += 1;
        if (itemStatus === "failed" && String(item.supportStatus || "") !== "resolved") acc.unresolved += 1;
        if (item.channel === "telegram") acc.telegram += 1;
        if (item.channel === "sms") acc.sms += 1;
        return acc;
      }, { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, unresolved: 0, telegram: 0, sms: 0 });

      const filtered = status !== "all"
        ? scoped.filter((item: any) => String(item.status || "").toLowerCase() === status)
        : scoped;
      const data = filtered.slice(offset, offset + limit);

      res.json({
        success: true,
        data,
        meta: {
          pagination: { limit, offset, total: filtered.length },
          stats,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
app.post(
  "/api/telegram/outbox/:id/mark-resolved",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      const id = Number(req.params.id);
      const note = String(req.body?.note || "").trim();
      await runAsync(
        `UPDATE notification_outbox SET supportStatus='resolved', supportNote=?, supportUpdatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [note || null, id],
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
// Send check (immediate) using the same payload text + chatId (helps debug blocked/chat/proxy)
app.post(
  "/api/telegram/outbox/:id/send-check",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      const id = Number(req.params.id);
      const row: any = await getAsync(
        `SELECT * FROM notification_outbox WHERE id=? AND channel='telegram' LIMIT 1`,
        [id],
      );
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "پیام پیدا نشد." });

      let payload: any = {};
      try {
        payload = JSON.parse(String(row.payloadJson || "{}"));
      } catch {
        payload = {};
      }

      const msgType = String(payload?.type || "message");
      const text = String(
        payload?.text ||
          payload?.message ||
          payload?.body ||
          payload?.caption ||
          "",
      ).trim();
      const replyMarkup = payload?.reply_markup || payload?.replyMarkup || null;
      const parseMode = payload?.parse_mode || payload?.parseMode || "HTML";
      const replyToMessageId = Number(payload?.replyToMessageId || 0) || 0;
      const mimeType = payload?.mimeType || undefined;
      const fileRelPath =
        payload?.fileRelPath || payload?.filePath || payload?.relPath || null;

      let effectiveChatId = String(
        payload?.chatId || payload?.recipient || "",
      ).trim();
      if (!effectiveChatId && row.recipient === "telegram_chat") {
        const capCustomerId = Number(
          payload?.capCustomerId ??
            payload?.meta?.capCustomerId ??
            row.capCustomerId ??
            0,
        );
        if (capCustomerId)
          effectiveChatId = await lookupCustomerTelegramChatId(capCustomerId);
      }
      if (!effectiveChatId && row.recipient === "telegram_partner_chat") {
        const partnerId = Number(
          payload?.partnerId ?? payload?.meta?.partnerId ?? row.entityId ?? 0,
        );
        if (partnerId)
          effectiveChatId = await lookupPartnerTelegramChatId(partnerId);
      }
      if (
        !effectiveChatId &&
        String(row.recipient || "").trim() &&
        !["telegram_chat", "telegram_partner_chat"].includes(
          String(row.recipient),
        )
      ) {
        effectiveChatId = String(row.recipient || "").trim();
      }

      if (!effectiveChatId)
        return res.json({
          success: false,
          message:
            "Chat ID مقصد پیدا نشد. اگر پیام مربوط به مشتری/همکار است، ابتدا اتصال تلگرام او را بررسی کنید.",
        });
      if (!text && !(msgType === "photo" || msgType === "document"))
        return res.json({ success: false, message: "متن پیام خالی است." });

      let r: any;
      if (msgType === "photo" || msgType === "document") {
        if (!fileRelPath) {
          r = {
            success: false,
            message: "مسیر فایل برای ارسال تلگرام پیدا نشد.",
          };
        } else {
          r = await trySendTelegramMediaNow(
            msgType as any,
            String(fileRelPath),
            text,
            effectiveChatId || null,
            {
              parseMode,
              replyMarkup,
              replyToMessageId: replyToMessageId || undefined,
              mimeType,
            },
          );
        }
      } else {
        r = await trySendTelegramNow(text, effectiveChatId, {
          parseMode,
          replyMarkup,
        });
      }

      try {
        await insertSmsLog({
          reqUser: req.user,
          provider: "telegram",
          eventType: "OUTBOX_SEND_TEST",
          entityType: row.entityType || "telegram",
          entityId: row.entityId ?? null,
          recipient: effectiveChatId,
          patternId: "TELEGRAM_TEST",
          tokens: [text],
          success: !!r?.success,
          response: r,
          error: r?.success ? undefined : r?.message,
        });
      } catch {}

      if (r?.success) {
        const telegramMessageId =
          Number((r as any)?.data?.result?.message_id || 0) || null;
        await runAsync(
          `UPDATE notification_outbox SET status='done', lastError=NULL, telegramMessageId=COALESCE(?, telegramMessageId), updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
          [telegramMessageId, id],
        ).catch(() => {});
        return res.json({
          success: true,
          message: "پیام بررسی ارسال شد.",
          data: r,
        });
      }

      await runAsync(
        `UPDATE notification_outbox SET status='failed', attempts=COALESCE(attempts,0)+1, lastError=?, nextAttemptAt=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [
          String(r?.message || "ارسال بررسی انجام نشد."),
          moment().add(30, "seconds").toISOString(),
          id,
        ],
      ).catch(() => {});
      return res.json({
        success: false,
        message: r?.message || "ارسال بررسی انجام نشد.",
        data: r,
      });
    } catch (e: any) {
      return res.json({
        success: false,
        message: e?.message || "ارسال بررسی انجام نشد.",
      });
    }
  },
);

};
