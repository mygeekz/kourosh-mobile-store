import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import {
  getAsync,
  runAsync,
  allAsync,
  getOverdueInstallmentsFromDb,
  getPendingInstallmentChecksWithCustomer,
} from "../database";

type ReminderMatchType = "days_until" | "overdue_days";
type ReminderChannel = "telegram" | "sms";
type ReminderTargetType = "both" | "installment" | "check";

type ReminderRuleRow = {
  id: number;
  name: string;
  enabled: number;
  channel: ReminderChannel;
  matchType: ReminderMatchType;
  value: number;
  template: string;
  installmentTemplate?: string;
  checkTemplate?: string;
  targetType?: ReminderTargetType;
  createdAt: string;
  updatedAt: string;
  matchedCount?: number;
};

type ReminderConfigRow = {
  id: number;
  sendStartHour: number;
  sendEndHour: number;
  maxPerDayPerCustomer: number;
  timezone: string;
};

type ReminderRulesRouteDeps = {
  authorizeRole: (roles: string[]) => RequestHandler;
};

const ensureReminderRulesTables = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sendStartHour INTEGER NOT NULL DEFAULT 10,
      sendEndHour INTEGER NOT NULL DEFAULT 21,
      maxPerDayPerCustomer INTEGER NOT NULL DEFAULT 1,
      timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(`INSERT OR IGNORE INTO reminder_config (id) VALUES (1);`);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      channel TEXT NOT NULL DEFAULT 'telegram',
      matchType TEXT NOT NULL,
      value INTEGER NOT NULL,
      template TEXT NOT NULL,
      installmentTemplate TEXT,
      checkTemplate TEXT,
      targetType TEXT NOT NULL DEFAULT 'both',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  try {
    const cols: any[] = await allAsync(`PRAGMA table_info(reminder_rules)`).catch(() => []);
    const has = (name: string) =>
      cols.some((c: any) => String(c?.name || "").toLowerCase() === name.toLowerCase());
    if (!has("installmentTemplate"))
      await runAsync(`ALTER TABLE reminder_rules ADD COLUMN installmentTemplate TEXT`).catch(() => {});
    if (!has("checkTemplate"))
      await runAsync(`ALTER TABLE reminder_rules ADD COLUMN checkTemplate TEXT`).catch(() => {});
    if (!has("targetType"))
      await runAsync(`ALTER TABLE reminder_rules ADD COLUMN targetType TEXT NOT NULL DEFAULT 'both'`).catch(() => {});
  } catch {}
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_daily_cap (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayKey TEXT NOT NULL,
      channel TEXT NOT NULL,
      customerId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(dayKey, channel, customerId)
    );
  `);
};

const getReminderConfig = async (): Promise<ReminderConfigRow> => {
  const row = await getAsync(`SELECT * FROM reminder_config WHERE id=1 LIMIT 1`, []).catch(() => null);
  return {
    id: 1,
    sendStartHour: Number(row?.sendStartHour ?? 10),
    sendEndHour: Number(row?.sendEndHour ?? 21),
    maxPerDayPerCustomer: Math.max(1, Number(row?.maxPerDayPerCustomer ?? 1)),
    timezone: String(row?.timezone || "Asia/Tehran"),
  };
};

const getReminderRules = async (): Promise<ReminderRuleRow[]> => {
  const rows = await allAsync(`SELECT * FROM reminder_rules ORDER BY id DESC`, []).catch(() => []);
  return (rows || []) as any;
};

const normalizeReminderTargetType = (value: any): ReminderTargetType => {
  const v = String(value || "").trim();
  if (v === "installment" || v === "check" || v === "both") return v as ReminderTargetType;
  return "both";
};

const reminderTargetsInstallments = (rule: Pick<ReminderRuleRow, "targetType">) =>
  normalizeReminderTargetType((rule as any).targetType) !== "check";

const reminderTargetsChecks = (rule: Pick<ReminderRuleRow, "targetType">) =>
  normalizeReminderTargetType((rule as any).targetType) !== "installment";

const parseAnyDate = (s: any) => {
  const raw = String(s ?? "").trim();
  if (!raw) return null;
  const j = moment(raw, "jYYYY/jMM/jDD", true);
  const m = j.isValid() ? j : moment(raw);
  return m.isValid() ? m : null;
};

const countRuleMatches = async (
  rule: Pick<ReminderRuleRow, "matchType" | "value">,
): Promise<number> => {
  const now = moment();
  const today = now.clone().startOf("day");
  const allUnpaid = await getOverdueInstallmentsFromDb();
  const allChecks = await getPendingInstallmentChecksWithCustomer().catch(() => []);
  const matchedCustomerIds = new Set<number>();
  const scanDueItems = (items: any[] | undefined) => {
    for (const item of items || []) {
      const due = parseAnyDate(item?.dueDate);
      if (!due) continue;
      const daysUntil = due.clone().startOf("day").diff(today, "days");
      const matched =
        rule.matchType === "days_until"
          ? Number(daysUntil) === Number(rule.value)
          : Number(daysUntil) === -Math.abs(Number(rule.value));
      if (!matched) continue;
      const customerId = Number(item?.customerId || 0);
      if (customerId > 0) matchedCustomerIds.add(customerId);
    }
  };
  if (reminderTargetsInstallments(rule as any)) scanDueItems(allUnpaid as any[]);
  if (reminderTargetsChecks(rule as any)) scanDueItems(allChecks as any[]);
  return matchedCustomerIds.size;
};

const renderTpl = (tpl: string, vars: Record<string, any>) => {
  const src = String(tpl ?? "");
  return src.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = (vars as any)[k];
    return v === undefined || v === null ? "" : String(v);
  });
};

const escapeHtml = (s: any) => {
  const t = String(s ?? "");
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderTplHtml = (tpl: string, vars: Record<string, any>) => {
  const safeVars: Record<string, any> = {};
  for (const k of Object.keys(vars || {})) safeVars[k] = escapeHtml((vars as any)[k]);
  return renderTpl(String(tpl ?? ""), safeVars);
};

const markdownishToHtml = (tpl: string) => {
  const s = String(tpl ?? "");
  const b = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return b.replace(/__(.+?)__/g, "<i>$1</i>");
};

const formatMoneyFa = (v: any) => {
  const n = Number(v ?? 0);
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
};

export const registerReminderRulesRoutes = (
  app: Express,
  { authorizeRole }: ReminderRulesRouteDeps,
): void => {

  // Reminder Rules API (Installments CRM-style)
  // =====================================================
  app.get(
    "/api/reminders/config",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const cfg = await getReminderConfig();
        res.json({ success: true, data: cfg });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/reminders/config",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const sendStartHour = Math.max(
          0,
          Math.min(23, Number(req.body?.sendStartHour ?? 10)),
        );
        const sendEndHour = Math.max(
          0,
          Math.min(23, Number(req.body?.sendEndHour ?? 21)),
        );
        const maxPerDayPerCustomer = Math.max(
          1,
          Number(req.body?.maxPerDayPerCustomer ?? 1),
        );
        const timezone = String(req.body?.timezone || "Asia/Tehran");
        await runAsync(
          `UPDATE reminder_config
            SET sendStartHour=?, sendEndHour=?, maxPerDayPerCustomer=?, timezone=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
          WHERE id=1`,
          [sendStartHour, sendEndHour, maxPerDayPerCustomer, timezone],
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.get(
    "/api/reminders/rules",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const rules = await getReminderRules();
        const rulesWithCounts = await Promise.all(
          (rules || []).map(async (rule) => ({
            ...rule,
            matchedCount: await countRuleMatches(rule),
          })),
        );
        res.json({ success: true, data: rulesWithCounts });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/reminders/rules",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const name = String(req.body?.name || "").trim() || "قانون جدید";
        const enabled = Number(req.body?.enabled ? 1 : 0);
        const channel = String(req.body?.channel || "telegram");
        const matchType = String(req.body?.matchType || "days_until");
        const value = Number(req.body?.value ?? 0);
        const installmentTemplate = String(
          req.body?.installmentTemplate || req.body?.template || "",
        ).trim();
        const checkTemplate = String(
          req.body?.checkTemplate || req.body?.template || "",
        ).trim();
        const targetType = normalizeReminderTargetType(req.body?.targetType);
        const template = installmentTemplate || checkTemplate;
        if (!template)
          return res.status(400).json({
            success: false,
            message: "حداقل یکی از متن‌های قسط یا چک باید وارد شود.",
          });
        if (matchType !== "days_until" && matchType !== "overdue_days") {
          return res
            .status(400)
            .json({ success: false, message: "matchType نامعتبر است." });
        }
        const r = await runAsync(
          `INSERT INTO reminder_rules (name, enabled, channel, matchType, value, template, installmentTemplate, checkTemplate, targetType)
         VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            name,
            enabled,
            channel,
            matchType,
            Math.trunc(value),
            template,
            installmentTemplate,
            checkTemplate,
            targetType,
          ],
        );
        res.json({ success: true, data: { id: r.lastID } });
      } catch (e) {
        next(e);
      }
    },
  );
  app.put(
    "/api/reminders/rules/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const id = Number(req.params.id || 0);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: "id نامعتبر است." });
        const name = String(req.body?.name || "").trim() || "قانون";
        const enabled = Number(req.body?.enabled ? 1 : 0);
        const channel = String(req.body?.channel || "telegram");
        const matchType = String(req.body?.matchType || "days_until");
        const value = Number(req.body?.value ?? 0);
        const installmentTemplate = String(
          req.body?.installmentTemplate || req.body?.template || "",
        ).trim();
        const checkTemplate = String(
          req.body?.checkTemplate || req.body?.template || "",
        ).trim();
        const targetType = normalizeReminderTargetType(req.body?.targetType);
        const template = installmentTemplate || checkTemplate;
        if (!template)
          return res.status(400).json({
            success: false,
            message: "حداقل یکی از متن‌های قسط یا چک باید وارد شود.",
          });
        if (matchType !== "days_until" && matchType !== "overdue_days") {
          return res
            .status(400)
            .json({ success: false, message: "matchType نامعتبر است." });
        }
        await runAsync(
          `UPDATE reminder_rules
            SET name=?, enabled=?, channel=?, matchType=?, value=?, template=?, installmentTemplate=?, checkTemplate=?, targetType=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
          WHERE id=?`,
          [
            name,
            enabled,
            channel,
            matchType,
            Math.trunc(value),
            template,
            installmentTemplate,
            checkTemplate,
            targetType,
            id,
          ],
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.delete(
    "/api/reminders/rules/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const id = Number(req.params.id || 0);
        await runAsync(`DELETE FROM reminder_rules WHERE id=?`, [id]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/reminders/rules/preview",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const matchType = String(
          req.body?.matchType || "days_until",
        ) as ReminderMatchType;
        const value = Math.trunc(Number(req.body?.value ?? 0));
        const installmentTemplate = String(
          req.body?.installmentTemplate || req.body?.template || "",
        ).trim();
        const checkTemplate = String(
          req.body?.checkTemplate || req.body?.template || "",
        ).trim();
        const targetType = normalizeReminderTargetType(req.body?.targetType);
        if (!installmentTemplate && !checkTemplate)
          return res
            .status(400)
            .json({ success: false, message: "متن پیام خالی است." });

        const now = moment();
        const today = now.clone().startOf("day");
        const installmentHtmlTemplate = markdownishToHtml(
          installmentTemplate || checkTemplate,
        );
        const checkHtmlTemplate = markdownishToHtml(
          checkTemplate || installmentTemplate,
        );

        const buildDateMeta = (rawDate: any) => {
          const due = parseAnyDate(rawDate);
          if (!due) return null;
          const daysUntil = due.clone().startOf("day").diff(today, "days");
          const matched =
            matchType === "days_until"
              ? Number(daysUntil) === Number(value)
              : Number(daysUntil) === -Math.abs(Number(value));
          return {
            due,
            daysUntil,
            matched,
            dueDate: String(rawDate || "").trim(),
          };
        };

        const installmentRowsRaw =
          targetType !== "check" ? await getOverdueInstallmentsFromDb() : [];
        const installmentRows = (installmentRowsRaw || [])
          .map((item: any) => {
            const meta = buildDateMeta(item?.dueDate);
            if (!meta) return null;
            const name = item?.customerFullName || "مشتری";
            const amount = formatMoneyFa(item?.amountDue);
            const vars = {
              name,
              amount,
              dueDate: meta.dueDate,
              days: String(meta.daysUntil),
              saleId: String(item?.saleId ?? ""),
              type: "قسط",
            };
            const text = renderTplHtml(installmentHtmlTemplate, vars);
            return {
              type: "installment",
              paymentId: Number(item?.id ?? 0) || null,
              checkId: null,
              saleId: Number(item?.saleId ?? 0) || null,
              customerId: Number(item?.customerId ?? 0) || null,
              customerName: name,
              phone: String(item?.customerPhoneNumber || "").trim(),
              chatId: String(item?.telegramChatId || "").trim(),
              dueDate: meta.dueDate,
              amount,
              daysUntil: meta.daysUntil,
              matched: meta.matched,
              title: "قسط",
              text,
            };
          })
          .filter(Boolean) as any[];

        const checkRowsRaw =
          targetType !== "installment"
            ? await getPendingInstallmentChecksWithCustomer()
            : [];
        const checkRows = (checkRowsRaw || [])
          .map((item: any) => {
            const meta = buildDateMeta(item?.dueDate);
            if (!meta) return null;
            const name = item?.customerFullName || "مشتری";
            const amount = formatMoneyFa(item?.amount);
            const vars = {
              name,
              amount,
              dueDate: meta.dueDate,
              days: String(meta.daysUntil),
              saleId: String(item?.saleId ?? ""),
              checkNumber: String(item?.checkNumber || "").trim(),
              bank: String(item?.bankName || "").trim(),
              type: "چک",
            };
            const text = renderTplHtml(checkHtmlTemplate, vars);
            return {
              type: "check",
              paymentId: null,
              checkId: Number(item?.checkId ?? 0) || null,
              saleId: Number(item?.saleId ?? 0) || null,
              customerId: Number(item?.customerId ?? 0) || null,
              customerName: name,
              phone: String(item?.customerPhoneNumber || "").trim(),
              chatId: String(item?.telegramChatId || "").trim(),
              dueDate: meta.dueDate,
              amount,
              daysUntil: meta.daysUntil,
              matched: meta.matched,
              checkNumber: String(item?.checkNumber || "").trim(),
              bankName: String(item?.bankName || "").trim(),
              title: "چک",
              text,
            };
          })
          .filter(Boolean) as any[];

        const installmentMatched = installmentRows.filter((r) => r.matched);
        const checkMatched = checkRows.filter((r) => r.matched);
        const previews = [
          ...installmentMatched.slice(0, 3),
          ...checkMatched.slice(0, 3),
        ];

        const fallbackDays =
          matchType === "overdue_days"
            ? -Math.abs(Number(value || 0))
            : Number(value || 0);
        const fallbackDueDate = moment()
          .add(Math.max(0, value || 0), "days")
          .format("jYYYY/jMM/jDD");
        const fallbackInstallmentVars = {
          name: "مشتری پیش‌نمایش",
          amount: formatMoneyFa(1250000),
          dueDate: fallbackDueDate,
          days: String(fallbackDays),
          saleId: "1024",
          type: "قسط",
        };
        const fallbackCheckVars = {
          name: "مشتری پیش‌نمایش",
          amount: formatMoneyFa(10000000),
          dueDate: fallbackDueDate,
          days: String(fallbackDays),
          saleId: "1024",
          checkNumber: "۱۲۳۴۵۶",
          bank: "ملت",
          type: "چک",
        };

        return res.json({
          success: true,
          data: {
            matchType,
            value,
            targetType,
            totalMatched: installmentMatched.length + checkMatched.length,
            totalInstallmentMatched: installmentMatched.length,
            totalCheckMatched: checkMatched.length,
            previews,
            installmentPreviews: installmentMatched.slice(0, 5),
            checkPreviews: checkMatched.slice(0, 5),
            fallback: {
              vars: fallbackInstallmentVars,
              text: renderTplHtml(
                installmentHtmlTemplate,
                fallbackInstallmentVars,
              ),
            },
            installmentFallback: {
              vars: fallbackInstallmentVars,
              text: renderTplHtml(
                installmentHtmlTemplate,
                fallbackInstallmentVars,
              ),
            },
            checkFallback: {
              vars: fallbackCheckVars,
              text: renderTplHtml(checkHtmlTemplate, fallbackCheckVars),
            },
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post(
    "/api/reminders/rules/seed-defaults",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        await ensureReminderRulesTables();
        const cnt = await getAsync(
          `SELECT COUNT(1) as cnt FROM reminder_rules`,
          [],
        ).catch(() => ({ cnt: 0 }));
        if (Number(cnt?.cnt || 0) > 0) {
          return res.json({ success: true, message: "قوانین موجود هستند." });
        }
        const tplA =
          "🔔 <b>یادآوری قسط</b> (۳ روز مانده)\nسلام {name} 👋\nقسط شما به مبلغ <b>{amount} تومان</b> در تاریخ <b>{dueDate}</b> سررسید می‌شود.";
        const chkA =
          "🔔 <b>یادآوری چک</b> (۳ روز مانده)\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> به مبلغ <b>{amount} تومان</b> در تاریخ <b>{dueDate}</b> سررسید می‌شود.";
        const tplB =
          "⏰ <b>سررسید قسط امروز</b>\n{name} عزیز، قسط <b>{amount} تومان</b> امروز (<b>{dueDate}</b>) سررسید است.";
        const chkB =
          "⏰ <b>سررسید چک امروز</b>\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> به مبلغ <b>{amount} تومان</b> امروز (<b>{dueDate}</b>) سررسید است.";
        const tplC =
          "⚠️ <b>قسط معوق</b> (۷ روز)\n{name} عزیز، قسط <b>{amount} تومان</b> با سررسید <b>{dueDate}</b> هنوز ثبت نشده است.";
        const chkC =
          "⚠️ <b>چک معوق</b> (۷ روز)\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> با سررسید <b>{dueDate}</b> هنوز وصول نشده است.";
        await runAsync(
          `INSERT INTO reminder_rules (name, enabled, channel, matchType, value, template, installmentTemplate, checkTemplate, targetType) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            "۳ روز مانده",
            1,
            "telegram",
            "days_until",
            3,
            tplA,
            tplA,
            chkA,
            "both",
          ],
        );
        await runAsync(
          `INSERT INTO reminder_rules (name, enabled, channel, matchType, value, template, installmentTemplate, checkTemplate, targetType) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            "روز سررسید",
            1,
            "telegram",
            "days_until",
            0,
            tplB,
            tplB,
            chkB,
            "both",
          ],
        );
        await runAsync(
          `INSERT INTO reminder_rules (name, enabled, channel, matchType, value, template, installmentTemplate, checkTemplate, targetType) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            "۷ روز معوق",
            1,
            "telegram",
            "overdue_days",
            7,
            tplC,
            tplC,
            chkC,
            "both",
          ],
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );
};
