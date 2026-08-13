import { formatExactNumberText } from "../../utils/exactNumber";
import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import cron from "node-cron";
import {
  allAsync,
  createOrReplaceReportSavedFilter,
  deleteReportSavedFilter,
  fromShamsiStringToISO,
  getAllSettingsAsObject,
  getAsync,
  getRepairFinancialSummary,
  getSalesSummaryAndProfit,
  listReportSavedFilters,
  runAsync,
} from "../database";
import { sendTelegramMessage, setTelegramProxy } from "../telegramService";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type TelegramTargets = {
  botToken: string;
  chatIds: string[];
};

export type ReportAutomationRoutesDeps = {
  authorizeRole: AuthorizeRole;
  formatReportMoneyText: (value: any) => string;
  escapeHtml: (value: any) => string;
  safeReplaceTemplate: (template: string, vars: Record<string, any>) => string;
  sanitizeTelegramHtml: (html: string) => string;
  markdownishToHtml: (template: string) => string;
  telegramCard: (
    title: string,
    icon: string,
    lines: string[],
    footer?: string,
  ) => string;
  getTelegramTargetsForTopic: (topic: string) => Promise<TelegramTargets>;
  isTopicTypeEnabled: (topic: string, typeKey: string) => Promise<boolean>;
  insertSmsLog: (payload: any) => Promise<any>;
};

export type ReportAutomationRuntime = {
  startReportSchedulers: () => Promise<void>;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerReportAutomationRoutes = (
  app: Express,
  {
    authorizeRole,
    formatReportMoneyText,
    escapeHtml,
    safeReplaceTemplate,
    sanitizeTelegramHtml,
    markdownishToHtml,
    telegramCard,
    getTelegramTargetsForTopic,
    isTopicTypeEnabled,
    insertSmsLog,
  }: ReportAutomationRoutesDeps,
): ReportAutomationRuntime => {
// -----------------------------------------------------
// Reports: Saved Filters (per-user, per-report)
// -----------------------------------------------------
app.get(
  "/api/reports/saved-filters",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const reportKey = String(req.query.reportKey || "").trim();
      if (!reportKey)
        return res
          .status(400)
          .json({ success: false, message: "reportKey الزامی است." });
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const data = await listReportSavedFilters(userId, reportKey);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/reports/saved-filters",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const { reportKey, name, filters } = req.body || {};
      if (!reportKey || !name)
        return res
          .status(400)
          .json({ success: false, message: "reportKey و name الزامی است." });
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const row = await createOrReplaceReportSavedFilter(
        userId,
        String(reportKey),
        String(name),
        filters,
      );
      res.status(201).json({ success: true, data: row });
    } catch (e) {
      next(e);
    }
  },
);
app.delete(
  "/api/reports/saved-filters/:id",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const data = await deleteReportSavedFilter(userId, id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
);
// -----------------------------------------------------
// Reports: Scheduling (Telegram/SMS) - CEO summaries
// -----------------------------------------------------
type ReportScheduleRow = {
  id: number;
  userId: number;
  reportKey: string;
  cronExpr: string; // e.g. "0 9 * * *" (09:00 daily)
  channel: "telegram" | "sms";
  isEnabled: number;
  createdAt: string;
};
const ensureReportSchedulesTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS report_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reportKey TEXT NOT NULL,
      cronExpr TEXT NOT NULL,
      payloadJson TEXT,
      channel TEXT NOT NULL DEFAULT 'telegram',
      isEnabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  // Lightweight migration for older DBs that were created before payloadJson existed
  try {
    await runAsync(`ALTER TABLE report_schedules ADD COLUMN payloadJson TEXT`);
  } catch {
    // ignore (already exists)
  }
};
const listReportSchedules = async (userId: number) => {
  await ensureReportSchedulesTable();
  return allAsync(
    `SELECT * FROM report_schedules WHERE userId = ? ORDER BY id DESC`,
    [userId],
  );
};
const createReportSchedule = async (
  userId: number,
  row: {
    reportKey: string;
    cronExpr: string;
    payloadJson?: any;
    channel?: string;
  },
) => {
  await ensureReportSchedulesTable();
  const reportKey = String(row.reportKey || "").trim();
  const cronExpr = String(row.cronExpr || "").trim();
  const payloadJson =
    row.payloadJson != null ? JSON.stringify(row.payloadJson) : null;
  const channel = row.channel === "sms" ? "sms" : "telegram";
  if (!reportKey || !cronExpr)
    throw new Error("reportKey و cronExpr الزامی است.");
  // Validate cron (node-cron will throw if invalid)
  if (!cron.validate(cronExpr)) throw new Error("فرمت cronExpr نامعتبر است.");
  const r = await runAsync(
    `INSERT INTO report_schedules (userId, reportKey, cronExpr, payloadJson, channel, isEnabled) VALUES (?,?,?,?,?,1)`,
    [userId, reportKey, cronExpr, payloadJson, channel],
  );
  return r?.lastID;
};
const deleteReportSchedule = async (userId: number, id: number) => {
  await ensureReportSchedulesTable();
  await runAsync(`DELETE FROM report_schedules WHERE id = ? AND userId = ?`, [
    id,
    userId,
  ]);
};
// Scheduler runtime
const scheduleTasks = new Map<number, any>();
const buildScheduledTelegramReportText = async (
  reportKey: string,
  payloadJsonRaw?: any,
) => {
  // payloadJson is optional; default range = today (Shamsi)
  let payload: any = null;
  try {
    if (typeof payloadJsonRaw === "string" && payloadJsonRaw.trim())
      payload = JSON.parse(payloadJsonRaw);
    else if (payloadJsonRaw && typeof payloadJsonRaw === "object")
      payload = payloadJsonRaw;
  } catch {
    payload = null;
  }
  const nowJ = moment().locale("fa");
  const nowText = nowJ.format("jYYYY/jMM/jDD HH:mm");
  const fromJ = String(
    payload?.range?.fromJ ||
      payload?.range?.from ||
      nowJ.clone().format("jYYYY/jMM/jDD"),
  );
  const toJ = String(
    payload?.range?.toJ ||
      payload?.range?.to ||
      nowJ.clone().format("jYYYY/jMM/jDD"),
  );
  // ISO range (useful for some advanced reports)
  const fromISO = String(
    payload?.range?.fromISO || fromShamsiStringToISO(fromJ) || "",
  );
  const toISO = String(
    payload?.range?.toISO || fromShamsiStringToISO(toJ) || "",
  );
  const moneyFa = (n: any) => formatReportMoneyText(n);
  const settings = await getAllSettingsAsObject();
  const baseUrl = String((settings as any).app_base_url || "").trim();
  const keyPath = String(reportKey || "").trim();
  const isFinancialOverview = keyPath === "financial-overview";
  const fromParam = isFinancialOverview ? "from" : "fromDate";
  const toParam = isFinancialOverview ? "to" : "toDate";
  const link =
    baseUrl && keyPath
      ? `${baseUrl}/#/reports/${encodeURIComponent(keyPath)}?${fromParam}=${encodeURIComponent(fromJ)}&${toParam}=${encodeURIComponent(toJ)}`
      : "";
  // 1) Sales summary (Sales + Profit) – executive-friendly numbers
  if (keyPath === "sales-summary") {
    const data = await getSalesSummaryAndProfit(fromJ, toJ);
    const tplKey = "telegram_tpl_reports_sales-summary";
    const customTpl = String((settings as any)[tplKey] || "").trim();
    const vars = {
      title: "گزارش فروش و سود",
      fromDate: fromJ,
      toDate: toJ,
      totalRevenue: Number((data as any)?.totalRevenue) || 0,
      grossProfit: Number((data as any)?.grossProfit) || 0,
      totalTransactions: Number((data as any)?.totalTransactions) || 0,
      averageSaleValue: Number((data as any)?.averageSaleValue) || 0,
      link,
      // ✅ Telegram-facing timestamps should be Shamsi like the rest of the app
      now: nowText,
    };
    const defaultText = telegramCard(
      "گزارش فروش و سود",
      "📊",
      [
        `📅 <b>از:</b> ${fromJ}`,
        `📅 <b>تا:</b> ${toJ}`,
        `💰 <b>فروش کل:</b> ${moneyFa(vars.totalRevenue)}`,
        `📈 <b>سود ناخالص:</b> ${moneyFa(vars.grossProfit)}`,
        `🧾 <b>تعداد فاکتور/تراکنش:</b> ${formatExactNumberText(vars.totalTransactions)}`,
        `💳 <b>میانگین فروش:</b> ${moneyFa(vars.averageSaleValue)}`,
      ],
      link
        ? `🔗 <a href="${escapeHtml(link)}">مشاهده گزارش</a>`
        : "ℹ️ گزارش در همین پیام خلاصه شده است.",
    );
    return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
  }
  // 2) Financial overview – summary using invoices table (sales_orders)
  if (isFinancialOverview) {
    const fo = await (async () => {
      const ordersCountRow = await getAsync(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(grandTotal),0) AS totalSales
           FROM sales_orders
          WHERE date(transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO],
      );
      const productSalesRow = await getAsync(
        `SELECT COALESCE(SUM(soi.totalPrice),0) AS productSales
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
          WHERE soi.itemType='inventory'
            AND date(so.transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO],
      );
      const items = await allAsync(
        `SELECT soi.itemType, soi.itemId, soi.quantity, soi.totalPrice
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
          WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO],
      );
      const invIds = Array.from(
        new Set(
          (items as any[])
            .filter((i: any) => i.itemType === "inventory")
            .map((i: any) => i.itemId),
        ),
      );
      const phoneIds = Array.from(
        new Set(
          (items as any[])
            .filter((i: any) => i.itemType === "phone")
            .map((i: any) => i.itemId),
        ),
      );
      const [invRows, phoneRows] = await Promise.all([
        invIds.length
          ? allAsync(
              `SELECT id, purchasePrice FROM products WHERE id IN (${invIds.map(() => "?").join(",")})`,
              invIds,
            )
          : Promise.resolve([]),
        phoneIds.length
          ? allAsync(
              `SELECT id, COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0) AS purchasePrice FROM phones WHERE id IN (${phoneIds.map(() => "?").join(",")})`,
              phoneIds,
            )
          : Promise.resolve([]),
      ]);
      const invCost = new Map<number, number>(
        (invRows as any[]).map((r: any) => [
          Number(r.id),
          Number(r.purchasePrice) || 0,
        ]),
      );
      const phoneCost = new Map<number, number>(
        (phoneRows as any[]).map((r: any) => [
          Number(r.id),
          Number(r.purchasePrice) || 0,
        ]),
      );
      let profit = 0;
      for (const it of items as any[]) {
        const qty = Number(it.quantity) || 0;
        const rev = Number(it.totalPrice) || 0;
        let cost = 0;
        if (it.itemType === "inventory")
          cost = (invCost.get(Number(it.itemId)) || 0) * qty;
        if (it.itemType === "phone")
          cost = (phoneCost.get(Number(it.itemId)) || 0) * qty;
        profit += rev - cost;
      }
      const repairs = await getRepairFinancialSummary(fromISO, toISO);
      return {
        ordersCount: Number((ordersCountRow as any)?.cnt) || 0,
        totalSales: Number((ordersCountRow as any)?.totalSales) || 0,
        productSales: Number((productSalesRow as any)?.productSales) || 0,
        grossProfit: profit,
        repairs,
      };
    })();
    const tplKey = "telegram_tpl_reports_financial-overview";
    const customTpl = String((settings as any)[tplKey] || "").trim();
    const vars = {
      title: "نمای کلی مالی",
      fromDate: fromJ,
      toDate: toJ,
      sumSales: fo.totalSales,
      invoiceCount: fo.ordersCount,
      productSales: fo.productSales,
      grossProfit: fo.grossProfit,
      repairCount: Number((fo as any)?.repairs?.count || 0),
      repairRevenue: Number((fo as any)?.repairs?.revenue || 0),
      repairCosts: Number((fo as any)?.repairs?.costs || 0),
      repairProfit: Number((fo as any)?.repairs?.profit || 0),
      link,
      now: nowText,
    };
    const defaultText = telegramCard(
      "نمای کلی مالی",
      "📊",
      [
        `📅 <b>از:</b> ${fromJ}`,
        `📅 <b>تا:</b> ${toJ}`,
        `🧾 <b>تعداد فاکتور:</b> ${formatExactNumberText(fo.ordersCount)}`,
        `💰 <b>فروش کل:</b> ${moneyFa(fo.totalSales)}`,
        `📦 <b>فروش محصولات (بدون گوشی):</b> ${moneyFa(fo.productSales)}`,
        `🛠 <b>تعمیرات:</b> ${formatExactNumberText(Number((fo as any)?.repairs?.count || 0))} مورد`,
        `💵 <b>درآمد تعمیرات:</b> ${moneyFa(Number((fo as any)?.repairs?.revenue || 0))}`,
        `🧾 <b>هزینه تعمیرات:</b> ${moneyFa(Number((fo as any)?.repairs?.costs || 0))}`,
        `📈 <b>سود تعمیرات:</b> ${moneyFa(Number((fo as any)?.repairs?.profit || 0))}`,
        `📈 <b>سود ناخالص تقریبی:</b> ${moneyFa(fo.grossProfit)}`,
      ],
      link
        ? `🔗 <a href="${escapeHtml(link)}">مشاهده گزارش</a>`
        : "ℹ️ گزارش در همین پیام خلاصه شده است.",
    );
    return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
  }
  // 3) Fallback: link-only (works for ALL reports)
  const niceTitle = (keyPath || "گزارش").replace(/[-_/]/g, " ");
  const tplKey = `telegram_tpl_reports_${keyPath}`;
  const customTpl = String((settings as any)[tplKey] || "").trim();
  const vars = {
    title: niceTitle,
    reportKey: keyPath,
    fromDate: fromJ,
    toDate: toJ,
    link,
    now: nowText,
  };
  const defaultText = telegramCard(
    `گزارش ${niceTitle}`,
    "📊",
    [`📅 <b>از:</b> ${fromJ}`, `📅 <b>تا:</b> ${toJ}`],
    link
      ? `🔗 <a href="${escapeHtml(link)}">مشاهده گزارش</a>`
      : "ℹ️ گزارش در همین پیام خلاصه شده است.",
  );
  return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
};
const startReportSchedulers = async () => {
  await ensureReportSchedulesTable();
  // Respect local timezone for cron (defaults to Asia/Tehran).
  // This matters a lot when the server is running in UTC.
  let schedulerTz = "Asia/Tehran";
  try {
    const s = await getAllSettingsAsObject();
    schedulerTz = String(
      (s as any).report_scheduler_timezone ||
        (s as any).backup_timezone ||
        (s as any).app_timezone ||
        "Asia/Tehran",
    );
  } catch {}
  const rows = await allAsync(
    `SELECT * FROM report_schedules WHERE isEnabled = 1`,
  );
  for (const r of rows as any[]) {
    const id = Number(r.id);
    if (scheduleTasks.has(id)) continue;
    if (!cron.validate(String(r.cronExpr))) continue;
    const task = cron.schedule(
      String(r.cronExpr),
      async () => {
        try {
          const settings = await getAllSettingsAsObject();
          // ✅ scheduled jobs also need proxy (manual/check endpoints set it, but cron callbacks didn't)
          setTelegramProxy((settings as any).telegram_proxy);
          if (String(r.channel) === "telegram") {
            const okType = await isTopicTypeEnabled(
              "reports",
              String(r.reportKey),
            );
            if (!okType) return;
            const { botToken, chatIds } =
              await getTelegramTargetsForTopic("reports");
            if (botToken && chatIds.length) {
              const text = await buildScheduledTelegramReportText(
                String(r.reportKey),
                (r as any).payloadJson,
              );
              // Send per-chat to get real success/failure (sendTelegramMessages didn't validate TelegramResult.success)
              let sent = 0;
              const results: any[] = [];
              for (const cid of chatIds) {
                const rr = await sendTelegramMessage(
                  botToken,
                  cid,
                  sanitizeTelegramHtml(markdownishToHtml(text)),
                  { parseMode: "HTML" },
                );
                results.push({
                  chatId: cid,
                  success: !!(rr as any)?.success,
                  message: (rr as any)?.message,
                });
                if ((rr as any)?.success) sent++;
              }
              // Unified log viewer uses sms_logs even for telegram.
              try {
                await insertSmsLog({
                  provider: "telegram",
                  eventType: `REPORT_SCHEDULE:${String(r.reportKey)}`,
                  entityType: "report_schedule",
                  entityId: id,
                  recipient: chatIds.join(", "),
                  patternId: "TELEGRAM_REPORT_SCHEDULE",
                  tokens: [String(r.reportKey), String(r.cronExpr)],
                  success: sent > 0,
                  response: {
                    scheduleId: id,
                    reportKey: String(r.reportKey),
                    sent,
                    total: chatIds.length,
                    results,
                  },
                  error:
                    sent > 0 ? undefined : "No successful telegram deliveries",
                });
              } catch {}
            }
          } else if (String(r.channel) === "sms") {
            // SMS scheduling requires provider-specific templates; left as a safe no-op by default.
          }
        } catch (e) {
          // swallow scheduler errors to avoid crashing the process
          console.error("Report scheduler error:", e);
        }
      },
      { timezone: schedulerTz },
    );
    scheduleTasks.set(id, task);
  }
};
app.get(
  "/api/reports/schedules",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const data = await listReportSchedules(userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/reports/schedules",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const { reportKey, cronExpr, payloadJson, channel } = req.body || {};
      const id = await createReportSchedule(userId, {
        reportKey,
        cronExpr,
        payloadJson,
        channel,
      });
      // refresh schedulers
      await startReportSchedulers();
      res.json({ success: true, id });
    } catch (e) {
      next(e);
    }
  },
);
app.delete(
  "/api/reports/schedules/:id",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const id = Number(req.params.id);
      await deleteReportSchedule(userId, id);
      // stop task if exists
      const t = scheduleTasks.get(id);
      if (t) {
        try {
          t.stop();
        } catch {}
        scheduleTasks.delete(id);
      }
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
// -----------------------------------------------------
// Reports: Send to Telegram NOW (manual button on all report pages)
// -----------------------------------------------------
app.post(
  "/api/reports/send-telegram",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const userId = Number(
        (req as any).user?.id ||
          (req as any).currentUser?.id ||
          (req as any).authUser?.id,
      );
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "احراز هویت نامعتبر است." });
      const { reportKey, payloadJson } = req.body || {};
      const key = String(reportKey || "").trim();
      if (!key)
        return res
          .status(400)
          .json({ success: false, message: "reportKey الزامی است." });
      const settings = await getAllSettingsAsObject();
      setTelegramProxy((settings as any).telegram_proxy);
      const { botToken, chatIds } = await getTelegramTargetsForTopic("reports");
      if (!botToken)
        return res
          .status(400)
          .json({ success: false, message: "توکن تلگرام تنظیم نشده است." });
      if (!chatIds?.length)
        return res.status(400).json({
          success: false,
          message: "Chat ID برای گزارشات تنظیم نشده است.",
        });
      const text = await buildScheduledTelegramReportText(key, payloadJson);
      let sent = 0;
      const results: any[] = [];
      for (const cid of chatIds) {
        const rr = await sendTelegramMessage(
          botToken,
          cid,
          sanitizeTelegramHtml(markdownishToHtml(text)),
          { parseMode: "HTML" },
        );
        results.push({
          chatId: cid,
          success: !!(rr as any)?.success,
          message: (rr as any)?.message,
        });
        if ((rr as any)?.success) sent++;
      }
      try {
        await insertSmsLog({
          provider: "telegram",
          eventType: `REPORT_MANUAL:${key}`,
          entityType: "report_manual",
          entityId: 0,
          recipient: chatIds.join(", "),
          patternId: "TELEGRAM_REPORT_MANUAL",
          tokens: [key],
          success: sent > 0,
          response: { reportKey: key, sent, total: chatIds.length, results },
          error: sent > 0 ? undefined : "No successful telegram deliveries",
        });
      } catch {}
      res.json({
        success: true,
        data: { sent, total: chatIds.length, results },
      });
    } catch (e) {
      next(e);
    }
  },
);

  return { startReportSchedulers };
};

// Backward-compatible type aliases for older imports.
export type ReportAutomationRouteDeps = ReportAutomationRoutesDeps;
