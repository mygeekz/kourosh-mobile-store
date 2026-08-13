import type { Express } from "express";
import moment from "jalali-moment";
import {
  getAllSettingsAsObject,
  getAsync,
  updateMultipleSettings,
  type SettingItem,
} from "../database";
import { sendTelegramMessage, setTelegramProxy } from "../telegramService";

type AuthorizeRole = (roles: string[]) => any;
type TelegramTopic = "reports" | "installments" | "sales" | "notifications";

type RegisterTelegramTopicConfigDeps = {
  authorizeRole: AuthorizeRole;
  getTelegramTargetsForTopic: (
    topic: TelegramTopic,
  ) => Promise<{ botToken: string; chatIds: string[] }>;
  sanitizeTelegramHtml: (html: string) => string;
  markdownishToHtml: (text: string) => string;
};

const TOPIC_CHATID_KEYS: Record<string, string> = {
  reports: "telegram_chat_ids_reports",
  installments: "telegram_chat_ids_installments",
  sales: "telegram_chat_ids_sales",
  notifications: "telegram_chat_ids_notifications",
};

const TOPIC_TYPES_KEYS: Record<string, string> = {
  reports: "telegram_topic_types_reports",
  installments: "telegram_topic_types_installments",
  sales: "telegram_topic_types_sales",
  notifications: "telegram_topic_types_notifications",
};

const safeReplaceTemplate = (
  tpl: string,
  vars: Record<string, any>,
): string => {
  const raw = String(tpl || "");
  return raw.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
};

const tplKey = (topic: string, type: string) =>
  `telegram_tpl_${topic}_${type}`.toLowerCase();

const getTopicTemplates = async (topic: string, types: string[]) => {
  const settings = await getAllSettingsAsObject();
  const out: Record<string, string> = {};
  for (const t of types) {
    const k = tplKey(topic, t);
    out[t] = String((settings as any)[k] || "");
  }
  return out;
};

const upsertTopicTemplates = async (
  topic: string,
  templates: Record<string, string>,
) => {
  const settingsArray: SettingItem[] = Object.keys(templates).map((t) => ({
    key: tplKey(topic, t),
    value: String(templates[t] ?? ""),
  }));
  if (settingsArray.length) await updateMultipleSettings(settingsArray);
};

const getSampleVarsForTopic = async (topic: string) => {
  try {
    const nowText = moment().locale("fa").format("jYYYY/jMM/jDD HH:mm");
    if (topic === "sales") {
      const inv = await getAsync(
        `SELECT * FROM invoices ORDER BY id DESC LIMIT 1`,
      );
      const cust = inv?.customerId
        ? await getAsync(`SELECT * FROM customers WHERE id=?`, [inv.customerId])
        : null;
      const invoiceNo =
        inv?.invoiceNumber || (inv?.id ? `INV-${inv.id}` : "INV-1001");
      const total = Number(inv?.grandTotal || inv?.subtotal || 0);
      const customerName = cust?.name || cust?.fullName || "مشتری پیش‌نمایش";
      const customerPhone = cust?.phone || cust?.mobile || "";
      return {
        invoiceId: inv?.id ?? 0,
        invoiceNo,
        total,
        subtotal: Number(inv?.subtotal || 0),
        discount: Number(inv?.discountAmount || 0),
        customerId: cust?.id ?? inv?.customerId ?? 0,
        customerName,
        customerPhone,
        date: inv?.date || new Date().toISOString(),
      };
    }
    if (topic === "installments") {
      const sale = await getAsync(
        `SELECT * FROM installment_sales ORDER BY id DESC LIMIT 1`,
      );
      const cust = sale?.customerId
        ? await getAsync(`SELECT * FROM customers WHERE id=?`, [
            sale.customerId,
          ])
        : null;
      const customerName = cust?.name || cust?.fullName || "مشتری پیش‌نمایش";
      const customerPhone = cust?.phone || cust?.mobile || "";
      return {
        installmentSaleId: sale?.id ?? 0,
        customerId: cust?.id ?? sale?.customerId ?? 0,
        customerName,
        customerPhone,
        amount: Number(sale?.installmentAmount || 0),
        installments: Number(sale?.numberOfInstallments || 0),
        startDate: String(sale?.installmentsStartDate || "1405/01/01"),
        downPayment: Number(sale?.downPayment || 0),
        total: Number(sale?.actualSalePrice || 0),
        saleType: String(sale?.saleType || "installment"),
      };
    }
    if (topic === "reports") {
      const to = new Date();
      const from = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);
      const fromJ = moment(fromIso).locale("fa").format("jYYYY/jMM/jDD");
      const toJ = moment(toIso).locale("fa").format("jYYYY/jMM/jDD");
      const row = await getAsync(
        `SELECT COALESCE(SUM(grandTotal),0) as sumSales, COUNT(*) as countInv FROM invoices WHERE date(date) BETWEEN date(?) AND date(?)`,
        [fromIso, toIso],
      );
      return {
        fromDate: fromJ,
        toDate: toJ,
        fromISO: fromIso,
        toISO: toIso,
        sumSales: Number(row?.sumSales || 0),
        invoiceCount: Number(row?.countInv || 0),
      };
    }
    return { now: nowText };
  } catch {
    const nowText = moment().locale("fa").format("jYYYY/jMM/jDD HH:mm");
    return { now: nowText };
  }
};

export const registerTelegramTopicConfigRoutes = (
  app: Express,
  {
    authorizeRole,
    getTelegramTargetsForTopic,
    sanitizeTelegramHtml,
    markdownishToHtml,
  }: RegisterTelegramTopicConfigDeps,
): void => {
  app.get(
    "/api/telegram/topic-config/:topic",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const settings = await getAllSettingsAsObject();
        const chatIdsText = String(
          (settings as any)[TOPIC_CHATID_KEYS[topic]] || "",
        );
        const typesKey = TOPIC_TYPES_KEYS[topic];
        let enabledTypes: string[] = [];
        const raw = String((settings as any)[typesKey] || "").trim();
        if (raw) {
          try {
            enabledTypes = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
          } catch {
            enabledTypes = raw
              .split(/[,\n\r\t\s]+/g)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
        return res.json({ success: true, data: { chatIdsText, enabledTypes } });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/topic-config/:topic",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const chatIdsText = String(req.body?.chatIdsText || "");
        const enabledTypes = Array.isArray(req.body?.enabledTypes)
          ? (req.body.enabledTypes as any[]).map((x) => String(x))
          : [];
        const payload: any = {};
        payload[TOPIC_CHATID_KEYS[topic]] = chatIdsText;
        payload[TOPIC_TYPES_KEYS[topic]] = enabledTypes.length
          ? JSON.stringify(enabledTypes)
          : "";
        const settingsArray: SettingItem[] = Object.keys(payload).map((key) => ({
          key,
          value: payload[key],
        }));
        await updateMultipleSettings(settingsArray);
        return res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/telegram/topic-config/:topic/templates",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const rawTypes = String(req.query.types || "").trim();
        const types = rawTypes
          ? rawTypes
              .split(/[\n\t\s,]+/g)
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const templates = types.length
          ? await getTopicTemplates(topic, types)
          : {};
        const sample = await getSampleVarsForTopic(topic);
        return res.json({ success: true, data: { templates, sample } });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/topic-config/:topic/templates",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const templates =
          req.body?.templates && typeof req.body.templates === "object"
            ? req.body.templates
            : {};
        await upsertTopicTemplates(topic, templates);
        return res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/topic-config/:topic/preview",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const type = String(req.body?.type || "").trim();
        const tpl = String(req.body?.template || "").trim();
        if (!type)
          return res
            .status(400)
            .json({ success: false, message: "نوع پیام مشخص نیست." });
        const sample = await getSampleVarsForTopic(topic);
        const settings = await getAllSettingsAsObject();
        const baseUrl = String(settings.app_base_url || "").trim();
        const link =
          topic === "sales"
            ? `${baseUrl}/#/sales`
            : topic === "installments"
              ? `${baseUrl}/#/installment-sales`
              : `${baseUrl}/#/reports`;
        const vars = {
          ...sample,
          link,
          now: moment().locale("fa").format("jYYYY/jMM/jDD HH:mm"),
        };
        const text = safeReplaceTemplate(tpl, vars);
        return res.json({ success: true, data: { text, sample: vars } });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/topic-config/:topic/check",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const topic = String(req.params.topic || "").trim();
        if (!TOPIC_CHATID_KEYS[topic])
          return res
            .status(400)
            .json({ success: false, message: "Topic نامعتبر است." });
        const type = String(req.body?.type || "").trim();
        const tpl = String(req.body?.template || "").trim();
        if (!type)
          return res
            .status(400)
            .json({ success: false, message: "نوع پیام مشخص نیست." });
        const settings = await getAllSettingsAsObject();
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(settings.telegram_bot_token || "").trim();
        if (!botToken)
          return res
            .status(400)
            .json({ success: false, message: "توکن تلگرام تنظیم نشده است." });
        const { chatIds } = await getTelegramTargetsForTopic(topic as TelegramTopic);
        if (!chatIds.length)
          return res.status(400).json({
            success: false,
            message: "Chat ID مقصد برای این بخش تنظیم نشده است.",
          });
        const sample = await getSampleVarsForTopic(topic);
        const baseUrl = String(settings.app_base_url || "").trim();
        const link =
          topic === "sales"
            ? `${baseUrl}/#/sales`
            : topic === "installments"
              ? `${baseUrl}/#/installment-sales`
              : `${baseUrl}/#/reports`;
        const vars = {
          ...sample,
          link,
          now: moment().locale("fa").format("jYYYY/jMM/jDD HH:mm"),
        };
        const text = safeReplaceTemplate(tpl, vars);
        const results: any[] = [];
        let sent = 0;
        for (const cid of chatIds) {
          const r = await sendTelegramMessage(
            botToken,
            cid,
            sanitizeTelegramHtml(markdownishToHtml(text)),
            { parseMode: "HTML" },
          );
          results.push({
            chatId: cid,
            success: !!(r as any)?.success,
            message: (r as any)?.message,
          });
          if ((r as any)?.success) sent++;
        }
        return res.json({
          success: true,
          data: { sent, total: chatIds.length, results },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
