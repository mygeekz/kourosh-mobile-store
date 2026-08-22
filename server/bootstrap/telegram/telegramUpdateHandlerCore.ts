import moment from "jalali-moment";
import {
  createTelegramOtpHelpers,
  TG_OTP_MAX_ATTEMPTS,
} from "../../utils/telegramOtpHelpers";
import { telegramCard } from "../../utils/messagingFormatters";
import {
  buildContactKeyboard,
  sendBotMessage as defaultSendBotMessage,
  sendBotRichCard,
  telegramLog,
  ensureTelegramPersistentMenu,
} from "../../utils/telegramBotHelpers";
import { ensureTelegramInboxTable } from "../../utils/notificationSchemaHelpers";
import { formatReportMoneyText } from "../../utils/productSalesReportHelpers";
import { serializeMiniAppStartParam } from "../../../miniapp/startParam";
import { buildTelegramMiniAppLaunchButton } from "../../utils/telegramMiniApp";
import {
  getPartnerByIdFromDb,
  getLedgerForPartnerFromDb,
  getPurchasedItemsFromPartnerDb,
  getAllSettingsAsObject,
  getAsync,
  runAsync,
  allAsync,
  normalizeIranPhone,
  upsertTelegramLinkRequest,
  getPendingTelegramLinkRequestByChatId,
  bumpTelegramLinkRequestAttempt,
  markTelegramLinkRequestVerified,
  getTelegramLinkTokenByPlainToken,
  getPendingTelegramLinkTokenByChatId,
  markTelegramLinkTokenStatus,
} from "../../database";
import {
  auditLegacyTelegramAuthRejected,
  linkCustomerTelegramIdentityById,
  linkCustomerTelegramIdentityByPhone,
  linkPartnerTelegramIdentityByPhone,
  unlinkCustomerTelegramIdentity,
  unlinkPartnerTelegramIdentity,
} from "../../services/telegramIdentitySecurity.service";

import type { TelegramUpdateHandler, TelegramUpdateHandlerDeps } from './telegramHandlerCoreTypes';
export type { TelegramUpdateHandler, TelegramUpdateHandlerDeps } from './telegramHandlerCoreTypes';

export const createTelegramUpdateHandler = ({
  trySendSmsNow,
  securityLinking,
  sendBotMessage = defaultSendBotMessage,
  sendSecurityMessage = sendBotMessage,
}: TelegramUpdateHandlerDeps): TelegramUpdateHandler => {
  // =====================================================
  // Telegram Bot Webhook (Model A - OTP Linking)
  // =====================================================
  // NOTE:
  //  - Telegram bots cannot message users by phone number.
  //  - User must interact with the bot first (e.g. /start).
  //  - We collect chat_id + verified phone via SMS OTP.
  //
  // Settings used:
  //  - telegram_bot_token (required)
  //  - telegram_webhook_secret (optional, recommended): compared with header `x-telegram-bot-api-secret-token`
  //  - sms_otp_* template settings (optional, depends on SMS provider)
  // Default OTP TTL for Telegram linking (minutes). Can be overridden by Settings key: sms_otp_exp_minutes
  const {
    getOtpTtlMinutes,
    isTelegramLinkOtpEnabled,
    hashOtp,
    generateOtp,
    sendOtpSms,
  } = createTelegramOtpHelpers({
    getAllSettingsAsObject,
    trySendSmsNow: (payload: any) => trySendSmsNow(payload),
  });
  // -----------------------------------------------------
  // Telegram bot: Webhook + Polling (for local servers)
  // -----------------------------------------------------
  const handleTelegramUpdate = async (update: any) => {
    try {
      // Support both message and callback_query updates
      const msg =
        update?.message ||
        update?.edited_message ||
        update?.callback_query?.message;
      const cb = update?.callback_query;
      if (!msg) return;
      const chatId = String(msg.chat?.id ?? "").trim();
      const fromId = String(cb?.from?.id ?? msg.from?.id ?? "").trim();
      if (!chatId || !fromId) return;
      const incomingText = String(
        cb?.data ? cb.data : msg?.text || msg?.contact?.phone_number || "",
      ).trim();
      // Security-link commands are handled before inbox persistence or any
      // customer/partner lookup. This prevents legacy guessed-ID payloads from
      // disclosing whether a record exists or mutating a mapping.
      const startPayload = /^\/start(?:\s+([^\s]+))?\s*$/i.exec(incomingText)?.[1] || "";
      if (startPayload.startsWith("partner_")) {
        await sendSecurityMessage(chatId, "این لینک دیگر معتبر نیست. لطفاً یک لینک امن جدید دریافت کنید.");
        return;
      }
      if (startPayload.startsWith("plink_") || startPayload.startsWith("staff_")) {
        const isPartner = startPayload.startsWith("plink_");
        const opaque = startPayload.slice(isPartner ? "plink_".length : "staff_".length);
        try {
          const result = securityLinking
            ? await (isPartner ? securityLinking.redeemPartner : securityLinking.redeemStaff)(opaque, fromId, chatId, msg.chat?.type === "private")
            : { ok: false };
          if (!result.ok) {
            await sendSecurityMessage(chatId, "این لینک معتبر نیست یا اعتبار آن پایان یافته است. لطفاً لینک امن جدید دریافت کنید.");
            return;
          }
          await sendSecurityMessage(chatId, isPartner
            ? "اتصال امن حساب همکار با موفقیت انجام شد."
            : "هویت سازمانی تلگرام شما با موفقیت تأیید شد.");
        } catch {
          await sendSecurityMessage(chatId, "اتصال امن در حال حاضر انجام نشد. لطفاً بعداً دوباره تلاش کنید.");
        }
        return;
      }
      if (msg.chat?.type && msg.chat.type !== "private") {
        await sendSecurityMessage(chatId, "این بخش فقط در گفت‌وگوی خصوصی با ربات قابل استفاده است.");
        return;
      }
      const botSettings = await getAllSettingsAsObject().catch(() => ({}) as any);
      telegramLog("update received", {
        updateId: update?.update_id,
        chatId,
        fromId,
        kind: cb?.data ? "callback" : msg?.contact ? "contact" : "message",
        text: incomingText,
      });
      // Record received updates for support (Telegram Inbox)
      try {
        await ensureTelegramInboxTable();
        const kind = cb?.data ? "callback" : msg?.contact ? "contact" : "message";
        const text = cb?.data
          ? String(cb.data || "")
          : String(msg.text || "").trim();
        const payloadJson = JSON.stringify({
          update_id: update?.update_id,
          message: update?.message,
          callback_query: update?.callback_query,
          edited_message: update?.edited_message,
        });
        await runAsync(
          `INSERT INTO telegram_inbox (chatId, fromId, kind, text, payloadJson) VALUES (?,?,?,?,?)`,
          [chatId, fromId, kind, text || null, payloadJson],
        );
        // keep DB small (last 2000)
        await runAsync(
          `DELETE FROM telegram_inbox WHERE id NOT IN (SELECT id FROM telegram_inbox ORDER BY id DESC LIMIT 2000)`,
        );
      } catch {
        // ignore logging failures
      }
      // ---------- helpers (local to telegram handler) ----------
      const getLinkedCustomer = async () => getAsync(
        `SELECT id,fullName,phoneNumber,COALESCE(telegram_opted_out,0) AS telegram_opted_out,
                telegram_chat_id AS tg_chat_id,telegram_user_id
         FROM customers WHERE telegram_user_id=? LIMIT 1`,
        [fromId],
      );
      const getLinkedPartner = async () => {
        return getAsync(`SELECT id,partnerName,phoneNumber,telegramChatId,telegram_chat_id,telegram_user_id,telegram_linked_at FROM partners WHERE telegram_user_id=? LIMIT 1`, [fromId]);
      };
      const getLegacyDeliveryKind = async (): Promise<"customer" | "partner" | null> => {
        const partner: any = await getAsync("SELECT id FROM partners WHERE COALESCE(telegram_chat_id,telegramChatId)=? AND NULLIF(TRIM(COALESCE(telegram_user_id,'')),'') IS NULL LIMIT 1", [chatId]).catch(() => null);
        if (partner?.id) return "partner";
        const customer: any = await getAsync("SELECT id FROM customers WHERE COALESCE(telegram_chat_id,telegramChatId)=? AND NULLIF(TRIM(COALESCE(telegram_user_id,'')),'') IS NULL LIMIT 1", [chatId]).catch(() => null);
        return customer?.id ? "customer" : null;
      };

      const findCustomersByNormalizedPhone = async (phone: string) => {
        const normalized = normalizeIranPhone(String(phone || ""));
        if (!normalized) return [];
        const rows = await allAsync(
          `SELECT id, fullName, phoneNumber FROM customers WHERE COALESCE(phoneNumber,'') != ''`,
        ).catch(() => [] as any[]);
        return (rows || []).filter(
            (r: any) =>
              normalizeIranPhone(String(r?.phoneNumber || "")) === normalized,
        );
      };
      const findPartnersByNormalizedPhone = async (phone: string) => {
        const normalized = normalizeIranPhone(String(phone || ""));
        if (!normalized) return [];
        const rows = await allAsync(
          `SELECT id, partnerName, phoneNumber FROM partners WHERE COALESCE(phoneNumber,'') != ''`,
        ).catch(() => [] as any[]);
        return (rows || []).filter(
          (r: any) => normalizeIranPhone(String(r?.phoneNumber || "")) === normalized,
        );
      };
      const setOptedOut = async (customerId: number, optedOut: 0 | 1) => {
        try {
          await runAsync(`UPDATE customers SET telegram_opted_out=? WHERE id=?`, [
            Number(optedOut),
            Number(customerId),
          ]);
        } catch {
          // ignore if column does not exist
        }
      };
      const formatMoney = (v: any) => {
        const n = Number(v || 0);
        try {
          return n.toLocaleString("fa-IR");
        } catch {
          return String(n);
        }
      };
      const esc = (s: any) => {
        const t = String(s ?? "");
        return t
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      };
      const prettyRepairStatus = (raw: any) => {
        const s = String(raw ?? "").trim();
        if (!s) return { icon: "ℹ️", label: "نامشخص" };
        const lc = s.toLowerCase();
        // English-ish
        if (lc.includes("ready")) return { icon: "✅", label: "آماده تحویل" };
        if (lc.includes("progress")) return { icon: "🧰", label: "در حال تعمیر" };
        if (lc.includes("wait")) return { icon: "⏳", label: "در انتظار قطعه" };
        if (lc.includes("deliver") || lc.includes("done"))
          return { icon: "📦", label: "تحویل شد" };
        // Persian-ish
        if (s.includes("آماده")) return { icon: "✅", label: s };
        if (s.includes("انتظار") || s.includes("قطعه"))
          return { icon: "⏳", label: s };
        if (s.includes("در حال") || s.includes("تعمیر"))
          return { icon: "🧰", label: s };
        if (s.includes("تحویل")) return { icon: "📦", label: s };
        if (s.includes("پذیرش") || s.includes("دریافت"))
          return { icon: "📥", label: s };
        return { icon: "ℹ️", label: s };
      };
      const buildMainMenuKeyboard = () => ({
        inline_keyboard: [
          [
            { text: "📌 وضعیت حساب", callback_data: "MENU_BALANCE" },
            { text: "🧾 اقساط من", callback_data: "MENU_INSTALLMENTS" },
          ],
          [
            { text: "🛠 پیگیری تعمیرات من", callback_data: "MENU_REPAIRS" },
            { text: "🧾 خریدهای اخیر من", callback_data: "MENU_INVOICES" },
          ],
          [
            { text: "🔔 اعلان‌ها", callback_data: "MENU_NOTIFS" },
            { text: "ℹ️ راهنمای ورود", callback_data: "MENU_HELP" },
          ],
          [
            { text: "💬 ارتباط با فروشگاه", callback_data: "MENU_SUPPORT" },
            { text: "🌐 ورود به سایت فروشگاه", callback_data: "MENU_SITE" },
          ],
          [
            { text: "🏠 منوی اصلی", callback_data: "MENU_HOME" },
            { text: "🔗 قطع اتصال", callback_data: "MENU_UNLINK" },
          ],
        ],
      });

      const buildMainReplyKeyboard = () => ({
        keyboard: [
          [{ text: "💎 نمای مالی من" }, { text: "📆 برنامه اقساط من" }],
          [{ text: "🛠 پیگیری تعمیرات" }, { text: "🧾 خریدهای اخیر من" }],
          [{ text: "🔔 تنظیم اعلان‌ها" }, { text: "💬 راهنمای سریع" }],
          [{ text: "💬 ارتباط با فروشگاه" }, { text: "🌐 سایت فروشگاه" }],
          [{ text: "🏠 منوی اصلی" }, { text: "✨ تازه‌سازی اطلاعات" }],
          [{ text: "🔓 خروج از حساب تلگرام" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        is_persistent: true,
        input_field_placeholder: "یک گزینه از پنل مشتریان کوروش انتخاب کنید…",
      });
      const clearReplyKeyboard = async () => {
        await sendBotMessage(chatId, "​", {
          reply_markup: { remove_keyboard: true },
          parse_mode: undefined,
        });
      };
      const buildPartnerMenuKeyboard = () => ({
        inline_keyboard: [
          [
            { text: "📱 موجودی گوشی‌های من", callback_data: "PARTNER_PHONES" },
            { text: "📒 گردش حساب شما", callback_data: "PARTNER_LEDGER" },
          ],
          [
            { text: "💰 وضعیت حساب شما", callback_data: "PARTNER_BALANCE" },
            { text: "ℹ️ راهنمای ورود", callback_data: "PARTNER_HELP" },
          ],
          [
            { text: "💬 ارتباط با فروشگاه", callback_data: "PARTNER_SUPPORT" },
            { text: "🌐 ورود به سایت فروشگاه", callback_data: "PARTNER_SITE" },
          ],
          [
            { text: "🏠 منوی اصلی", callback_data: "PARTNER_HOME" },
            { text: "🔗 قطع اتصال", callback_data: "PARTNER_UNLINK" },
          ],
        ],
      });

      const buildPartnerReplyKeyboard = () => ({
        keyboard: [
          [{ text: "📱 موجودی گوشی‌های من" }, { text: "📒 گردش حساب من" }],
          [{ text: "💎 نمای همکاری من" }, { text: "💬 راهنمای سریع" }],
          [{ text: "💬 ارتباط با فروشگاه" }, { text: "🌐 سایت فروشگاه" }],
          [{ text: "🏠 منوی اصلی" }, { text: "✨ تازه‌سازی اطلاعات" }],
          [{ text: "🔓 خروج از حساب تلگرام" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        is_persistent: true,
        input_field_placeholder: "یک گزینه از پنل همکاران کوروش انتخاب کنید…",
      });
      const formatJalaliDate = (value: any, withTime = true) => {
        const raw = String(value ?? "").trim();
        if (!raw) return "—";
        const m = moment(raw);
        if (!m.isValid()) return raw;
        try {
          return withTime
            ? m.locale("fa").format("jYYYY/jMM/jDD HH:mm")
            : m.locale("fa").format("jYYYY/jMM/jDD");
        } catch {
          return raw;
        }
      };
      const neonLine = "━━━━━━━━━━━━━━━━━━━━";
      const softLine = "────────────────────";
      const compactDescription = (value: any, maxLen = 90) => {
        const clean = String(value ?? "")
          .replace(/\s+/g, " ")
          .replace(/[()]/g, "")
          .trim();
        if (!clean) return "گردش حساب";
        return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
      };
      const ledgerIconFor = (description: any, debit: number, credit: number) => {
        const text = String(description ?? "").toLowerCase();
        if (text.includes("حذف")) return "🛒";
        if (text.includes("دریافت") || text.includes("گوشی")) return "📱";
        if (
          text.includes("واریز") ||
          text.includes("پرداخت") ||
          text.includes("تسویه")
        )
          return "👛";
        if (credit > 0) return "🟢";
        if (debit > 0) return "🔴";
        return "💠";
      };
      const ledgerBadgeFor = (
        description: any,
        debit: number,
        credit: number,
      ) => {
        const text = String(description ?? "").toLowerCase();
        if (text.includes("حذف")) return "خرید اولیه";
        if (text.includes("دریافت") || text.includes("گوشی"))
          return "دریافت گوشی";
        if (text.includes("واریز") || text.includes("پرداخت")) return "واریز وجه";
        if (text.includes("تسویه")) return "تسویه حساب";
        if (credit > 0) return "بستانکاری";
        if (debit > 0) return "بدهکاری";
        return "گردش مالی";
      };
      const parsePartnerLedgerMetaForTelegram = (description?: any) => {
        const raw = String(description || "").trim();
        const imei = (raw.match(/IMEI[:：]\s*([^,)\-\n•]+)/i)?.[1] || "").trim();
        const identifier = (
          raw.match(/شناسه(?:\s*گوشی|\s*سیستم)?[:：]\s*([^,)\-\n•]+)/i)?.[1] || ""
        ).trim();
        const saleId = (
          raw.match(/شناسه\s*فروش[:：]\s*(\d+)/i)?.[1] || ""
        ).trim();
        const amountText = (
          raw.match(/به\s*ارزش\s*([\d٬,۰-۹٠-٩]+)\s*تومان/i)?.[1] ||
          raw.match(/ارزش\s*([\d٬,۰-۹٠-٩]+)\s*تومان/i)?.[1] ||
          ""
        ).trim();
        const firstLine = raw.split(/[\n\r]/)[0] || raw;
        const summary = firstLine
          .replace(/\(\s*شناسه\s*فروش:\s*\d+\s*\)/gi, "")
          .replace(/\(.*?\)/g, "")
          .replace(/IMEI[:：]\s*[^•,\n]+/gi, "")
          .replace(/شناسه(?:\s*گوشی|\s*سیستم)?[:：]\s*[^•,\n]+/gi, "")
          .replace(/\s*به\s*ارزش\s*[\d٬,۰-۹٠-٩]+\s*(?:تومان)?/gi, "")
          .replace(/\s*•\s*/g, " ")
          .replace(/[-–—]\s*$/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return {
          raw,
          summary: summary || "گردش مالی ثبت‌شده",
          imei,
          identifier,
          saleId,
          amountText,
        };
      };
      const smartLedgerAmountLine = (debit: number, credit: number) => {
        if (credit > 0)
          return `🟢 <b>بستانکار:</b> <code>${esc(formatReportMoneyText(credit))}</code>`;
        if (debit > 0)
          return `🔴 <b>بدهکار:</b> <code>${esc(formatReportMoneyText(debit))}</code>`;
        return "⚪ <b>مبلغ:</b> بدون تغییر مستقیم";
      };
      const smartLedgerBalanceLine = (balance: number) => {
        if (balance > 0)
          return `🔻 <b>مانده بدهکاری:</b> <code>${esc(formatReportMoneyText(Math.abs(balance)))}</code>`;
        if (balance < 0)
          return `🔺 <b>مانده بستانکاری:</b> <code>${esc(formatReportMoneyText(Math.abs(balance)))}</code>`;
        return "✅ <b>مانده حساب:</b> تسویه کامل";
      };
      const commercialHeader = (title: string, subtitle: string, icon = "💎") =>
        [
          `<b>${icon} ${esc(title)}</b>`,
          `<i>${esc(subtitle)}</i>`,
          neonLine,
        ].join("\n");
      const showMainMenu = async (customer?: any) => {
        await ensureTelegramPersistentMenu(chatId).catch(() => {});
        const name = String(customer?.fullName || "").trim();
        const greet = name ? `سلام ${name} عزیز 👋` : "سلام 👋";
        const text = [
          commercialHeader(
            "به دستیار هوشمند فروشگاه کوروش ورود به دستیار کوروش",
            greet,
            "✨",
          ),
          "💠 <b>پنل اختصاصی شما فعال شد.</b>",
          "",
          "از منوی پایین، وضعیت مالی، اقساط، تعمیرات و خریدهای اخیرتان را با چند لمس بررسی کنید.",
          "",
          "🔹 نمایش اطلاعات فقط برای شماره تأییدشده شما انجام می‌شود.",
        ].join("\n");
        await sendBotMessage(chatId, text, {
          reply_markup: buildMainReplyKeyboard(),
          parse_mode: "HTML",
        });
      };
      const showPartnerMenu = async (partner?: any, intro?: string) => {
        await ensureTelegramPersistentMenu(chatId).catch(() => {});
        const name = String(partner?.partnerName || "").trim();
        const greet = name ? `سلام ${name} عزیز 👋` : "سلام عزیز 👋";
        const text = [
          commercialHeader("پنل هوشمند همکاران کوروش", intro || greet, "💎"),
          "✨ <b>نمای همکاری شما آماده است.</b>",
          "",
          "از منوی پایین، موجودی گوشی‌ها، گردش حساب و نمای مالی همکاری را سریع بررسی کنید.",
          "",
          "🔐 دسترسی این پنل فقط برای شماره تأییدشده شما فعال است.",
        ].join("\n");
        await sendBotMessage(chatId, text, {
          reply_markup: buildPartnerReplyKeyboard(),
          parse_mode: "HTML",
        });
      };
      const buildSmartSummaryText = (
        title: string,
        subtitle: string,
        icon: string,
        sections: string[],
        footer?: string,
      ) =>
        [
          commercialHeader(title, subtitle, icon),
          ...sections.filter(Boolean),
          softLine,
          footer ||
            "✨ برای دریافت آخرین وضعیت، دکمه «تازه‌سازی اطلاعات» را انتخاب کنید.",
        ]
          .filter(Boolean)
          .join("\n\n");
      const statBlock = (
        icon: string,
        label: string,
        value: string,
        hint?: string,
      ) =>
        [
          `${icon} <b>${esc(label)}</b>`,
          `<code>${esc(value)}</code>`,
          hint ? `<i>${esc(hint)}</i>` : "",
        ]
          .filter(Boolean)
          .join("\n");
      const sendPartnerBalance = async (partnerId: number) => {
        const partner = await getPartnerByIdFromDb(partnerId).catch(
          () => null as any,
        );
        if (!partner?.id) {
          await sendBotMessage(
            chatId,
            telegramCard(
              "ورود امن لازم است",
              "🔒",
              [
                "برای نمایش اطلاعات همکاری، ابتدا ورود امن با شماره موبایل را کامل کنید.",
              ],
              "پس از تأیید، پنل اختصاصی همکاران برای شما فعال می‌شود.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        const currentBalance = Number(partner.currentBalance || 0);
        const balanceState =
          currentBalance > 0
            ? "بستانکار از فروشگاه"
            : currentBalance < 0
              ? "بدهکار به فروشگاه"
              : "تسویه کامل";
        const balanceIcon =
          currentBalance > 0 ? "🟢" : currentBalance < 0 ? "🔴" : "✅";
        const ledgerStats: any = await getAsync(
          `SELECT COUNT(*) AS totalCount,
                  MAX(COALESCE(transactionDate, createdAt, updatedAt)) AS lastActivity
           FROM partner_ledger
           WHERE partnerId=?`,
          [Number(partnerId)],
        ).catch(() => null);
        const inventoryRows: any[] = await getPurchasedItemsFromPartnerDb(
          partnerId,
        ).catch(() => [] as any[]);
        const phoneRows = (inventoryRows || []).filter(
          (r: any) => String(r?.type || "").trim() === "phone",
        );
        const soldPhones = phoneRows.filter((r: any) =>
          String(r?.status || "").includes("فروخته"),
        ).length;
        const activePhones = Math.max(0, phoneRows.length - soldPhones);
        const sections = [
          statBlock(
            balanceIcon,
            "مانده حساب",
            formatReportMoneyText(Math.abs(currentBalance)),
            balanceState,
          ),
          statBlock(
            "📒",
            "تعداد گردش‌های ثبت‌شده",
            `${formatMoney(ledgerStats?.totalCount || 0)} رکورد`,
            ledgerStats?.lastActivity
              ? `آخرین فعالیت: ${formatJalaliDate(ledgerStats.lastActivity, true)}`
              : "هنوز گردش جدیدی برای این حساب ثبت نشده است",
          ),
          statBlock(
            "📱",
            "وضعیت گوشی‌ها",
            `${formatMoney(phoneRows.length)} دستگاه`,
            `فعال: ${formatMoney(activePhones)} | فروخته‌شده: ${formatMoney(soldPhones)}`,
          ),
          statBlock(
            "🔐",
            "وضعیت دسترسی ربات",
            "فعال و تأییدشده",
            partner.telegram_linked_at
              ? `اتصال: ${formatJalaliDate(partner.telegram_linked_at, true)}`
              : "اتصال تلگرام برقرار است",
          ),
        ];
        const name = String(partner.partnerName || "همکار گرامی").trim();
        const text = buildSmartSummaryText(
          "خلاصه وضعیت همکاری شما",
          `${name} عزیز، نمای سریع حساب شما آماده است.`,
          "💎",
          sections,
          "📌 برای جزئیات کامل‌تر، «📒 گردش حساب من» یا «📱 موجودی گوشی‌های من» را انتخاب کنید.",
        );
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildPartnerQuickActionsKeyboard("summary"),
            parse_mode: "HTML",
          },
          {
            title: "💎 نمای همکاری کوروش",
            subtitle: "خلاصه مالی و وضعیت همکاری شما",
          },
        );
      };
      const sendPartnerPhones = async (partnerId: number) => {
        const rows = await getPurchasedItemsFromPartnerDb(partnerId).catch(
          () => [] as any[],
        );
        const phones = (rows || [])
          .filter((r: any) => String(r?.type || "").trim() === "phone")
          .slice(0, 8);
        if (!phones.length) {
          await sendBotMessage(
            chatId,
            [
              commercialHeader(
                "گوشی‌های من",
                "هنوز گوشی مرتبطی برای حساب شما ثبت نشده است.",
                "📱",
              ),
              "پس از ثبت موجودی یا فروش، اطلاعات این بخش تکمیل می‌شود.",
            ].join("\n"),
            {
              reply_markup: buildPartnerQuickActionsKeyboard("phones"),
              parse_mode: "HTML",
            },
          );
          return;
        }
        const lines = phones.map((r: any) => {
          const name = String(r?.name || "گوشی").trim();
          const imei = String(r?.identifier || "").trim();
          const sold = ["فروخته شده", "فروخته شده (قسطی)"].includes(
            String(r?.status || "").trim(),
          );
          const paymentMethod = String(r?.salePaymentMethod || "").trim();
          const state = sold
            ? paymentMethod.includes("اقساط")
              ? "فروخته‌شده اقساطی"
              : "فروخته‌شده نقدی"
            : "فروخته‌نشده";
          const icon = sold
            ? paymentMethod.includes("اقساط")
              ? "🧾"
              : "💵"
            : "📦";
          const ref = String(r?.saleReferenceLabel || "").trim();
          const when = formatJalaliDate(
            r?.soldAt || r?.purchaseDate || null,
            false,
          );
          return `${icon} <b>${esc(name)}</b>${imei ? ` — <code>${esc(imei)}</code>` : ""}
  ${esc(state)}${ref ? ` • ${esc(ref)}` : ""}${
            when && when !== "—"
              ? `
  🕒 ${esc(when)}`
              : ""
          }`;
        });
        const text = [
          commercialHeader(
            "گوشی‌های من",
            "آخرین گوشی‌های مرتبط با حساب همکاری شما",
            "📱",
          ),
          ...lines,
          softLine,
          "✨ برای تازه‌سازی لیست، دکمه «دریافت تازه‌سازی» را بزنید.",
        ].join("\n\n");
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildPartnerQuickActionsKeyboard("phones"),
            parse_mode: "HTML",
          },
          {
            title: "📱 موجودی گوشی‌های همکار",
            subtitle: "نمای مرتب از گوشی‌های مرتبط با حساب شما",
          },
        );
      };
      const safePageNumber = (value: any) => {
        const n = Math.floor(Number(value));
        return Number.isFinite(n) && n >= 0 ? n : 0;
      };
      const buildPaginationLabel = (page: number, totalPages: number) =>
        `${esc(formatMoney(page + 1))} / ${esc(formatMoney(totalPages))}`;
      const buildTelegramActionRows = (rows: any[][]) => ({
        inline_keyboard: rows.filter(
          (row) => Array.isArray(row) && row.length > 0,
        ),
      });
      const buildCustomerQuickActionsKeyboard = (
        active:
          | "summary"
          | "installments"
          | "repairs"
          | "invoices"
          | "support"
          | "site"
          | "home" = "home",
        page = 0,
      ) => {
        const refreshTarget =
          active === "installments"
            ? `MENU_INSTALLMENTS_PAGE:${safePageNumber(page)}`
            : active === "repairs"
              ? "MENU_REPAIRS"
              : active === "invoices"
                ? "MENU_INVOICES"
                : active === "support"
                  ? "MENU_SUPPORT"
                  : active === "site"
                    ? "MENU_SITE"
                    : active === "summary"
                      ? "MENU_BALANCE"
                      : "MENU_HOME";
        const miniAppPage = active === "summary"
          ? "account"
          : active === "installments"
            ? "installments"
            : active === "invoices"
              ? "purchases"
              : null;
        const miniAppButton = miniAppPage
          ? buildTelegramMiniAppLaunchButton(
              botSettings,
              serializeMiniAppStartParam({ version: "v1", role: "customer", page: miniAppPage }),
            )
          : null;
        return buildTelegramActionRows([
          miniAppButton ? [miniAppButton] : [],
          [
            { text: "✨ تازه‌سازی همین گزارش", callback_data: refreshTarget },
            { text: "🏠 منوی اصلی", callback_data: "MENU_HOME" },
          ],
        ]);
      };
      const buildPartnerQuickActionsKeyboard = (
        active:
          | "summary"
          | "ledger"
          | "phones"
          | "support"
          | "site"
          | "home" = "home",
        page = 0,
      ) => {
        const refreshTarget =
          active === "ledger"
            ? `PARTNER_LEDGER_PAGE:${safePageNumber(page)}`
            : active === "phones"
              ? "PARTNER_PHONES"
              : active === "support"
                ? "PARTNER_SUPPORT"
                : active === "site"
                  ? "PARTNER_SITE"
                  : active === "summary"
                    ? "PARTNER_BALANCE"
                    : "PARTNER_HOME";
        const miniAppPage = active === "summary"
          ? "home"
          : active === "ledger"
            ? "ledger"
            : active === "phones"
              ? "phones"
              : null;
        const miniAppButton = miniAppPage
          ? buildTelegramMiniAppLaunchButton(
              botSettings,
              serializeMiniAppStartParam({ version: "v1", role: "partner", page: miniAppPage }),
            )
          : null;
        return buildTelegramActionRows([
          miniAppButton ? [miniAppButton] : [],
          [
            { text: "✨ تازه‌سازی همین گزارش", callback_data: refreshTarget },
            { text: "🏠 منوی اصلی همکاران", callback_data: "PARTNER_HOME" },
          ],
        ]);
      };
      const buildPartnerLedgerPaginationKeyboard = (
        page: number,
        totalPages: number,
      ) => {
        const prev = Math.max(0, page - 1);
        const next = Math.min(totalPages - 1, page + 1);
        const nav: any[] = [];
        if (page > 0)
          nav.push({
            text: "⬅️ صفحه قبل",
            callback_data: `PARTNER_LEDGER_PAGE:${prev}`,
          });
        nav.push({
          text: `💎 ${buildPaginationLabel(page, totalPages)}`,
          callback_data: `PARTNER_LEDGER_PAGE:${page}`,
        });
        if (page < totalPages - 1)
          nav.push({
            text: "صفحه بعد ➡️",
            callback_data: `PARTNER_LEDGER_PAGE:${next}`,
          });
        const actions = buildPartnerQuickActionsKeyboard(
          "ledger",
          page,
        ).inline_keyboard;
        return { inline_keyboard: [nav, ...actions] };
      };
      const buildInstallmentsPaginationKeyboard = (
        page: number,
        totalPages: number,
      ) => {
        const prev = Math.max(0, page - 1);
        const next = Math.min(totalPages - 1, page + 1);
        const nav: any[] = [];
        if (page > 0)
          nav.push({
            text: "⬅️ صفحه قبل",
            callback_data: `MENU_INSTALLMENTS_PAGE:${prev}`,
          });
        nav.push({
          text: `💎 ${buildPaginationLabel(page, totalPages)}`,
          callback_data: `MENU_INSTALLMENTS_PAGE:${page}`,
        });
        if (page < totalPages - 1)
          nav.push({
            text: "صفحه بعد ➡️",
            callback_data: `MENU_INSTALLMENTS_PAGE:${next}`,
          });
        const actions = buildCustomerQuickActionsKeyboard(
          "installments",
          page,
        ).inline_keyboard;
        return { inline_keyboard: [nav, ...actions] };
      };
      const sendPartnerLedger = async (partnerId: number, page = 0) => {
        const rows = await getLedgerForPartnerFromDb(partnerId).catch(
          () => [] as any[],
        );
        const pageSize = 4;
        const totalRows = (rows || []).length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        const safePage = Math.min(safePageNumber(page), totalPages - 1);
        const ledgerRows = (rows || []).slice(
          safePage * pageSize,
          safePage * pageSize + pageSize,
        );
        if (!ledgerRows.length) {
          await sendBotMessage(
            chatId,
            [
              commercialHeader(
                "گردش حساب من",
                "هنوز گردش مالی ثبت‌شده‌ای برای حساب شما وجود ندارد.",
                "📒",
              ),
              "",
              "💠 بعد از ثبت اولین خرید، فروش یا تسویه، گزارش حساب شما همین‌جا به‌صورت خوانا نمایش داده می‌شود.",
            ].join("\n"),
            {
              reply_markup: buildPartnerQuickActionsKeyboard("ledger"),
              parse_mode: "HTML",
            },
          );
          return;
        }
        const cards = ledgerRows.map((r: any, index: number) => {
          const dt = formatJalaliDate(
            r?.transactionDate || r?.createdAt || r?.updatedAt || null,
            true,
          );
          const debit = Number(r?.debit || 0);
          const credit = Number(r?.credit || 0);
          const balance = Number(r?.balance || 0);
          const meta = parsePartnerLedgerMetaForTelegram(r?.description || "");
          const badge = ledgerBadgeFor(meta.raw || meta.summary, debit, credit);
          const icon = ledgerIconFor(meta.raw || meta.summary, debit, credit);
          const title = compactDescription(meta.summary, 76);
          const details = [
            meta.identifier
              ? `🆔 <b>شناسه سیستم:</b> <code>${esc(meta.identifier)}</code>`
              : "",
            meta.imei ? `🔑 <b>IMEI:</b> <code>${esc(meta.imei)}</code>` : "",
            meta.saleId
              ? `🧾 <b>شناسه فروش:</b> <code>#${esc(meta.saleId)}</code>`
              : "",
            meta.amountText
              ? `💵 <b>ارزش ثبت‌شده:</b> <code>${esc(meta.amountText)}</code> تومان`
              : "",
          ].filter(Boolean);
          return [
            `💎 <b>کارت ${esc(formatMoney(index + 1))}</b>`,
            `${icon} <b>${esc(badge)}</b>`,
            `📝 ${esc(title)}`,
            "",
            smartLedgerAmountLine(debit, credit),
            smartLedgerBalanceLine(balance),
            details.length ? "" : "",
            ...details,
            "",
            `🕒 <code>${esc(dt)}</code>`,
          ]
            .filter((line) => line !== "")
            .join("\n");
        });
        const text = [
          commercialHeader(
            "گزارش گردش حساب شما",
            "آخرین تراکنش‌های حساب همکاری، مرتب و خلاصه‌شده",
            "📒",
          ),
          `📌 <b>نمایش صفحه:</b> ${buildPaginationLabel(safePage, totalPages)}  •  <b>کل گردش‌ها:</b> ${esc(formatMoney(totalRows))}`,
          "",
          cards.join(`\n\n${neonLine}\n\n`),
          "",
          softLine,
          "✨ برای دریافت آخرین وضعیت، دکمه «دریافت تازه‌سازی» را از منوی پایین بزنید.",
        ].join("\n");
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildPartnerLedgerPaginationKeyboard(
              safePage,
              totalPages,
            ),
            parse_mode: "HTML",
          },
          {
            title: "📒 گردش حساب همکار",
            subtitle: "کارت‌های مالی خوانا با مانده هر تراکنش",
          },
        );
      };
      const sendBalance = async (customerId: number) => {
        const customer: any = await getLinkedCustomer().catch(() => null);
        const latestLedger: any = await getAsync(
          `SELECT balance, transactionDate, description
           FROM customer_ledger
           WHERE customerId=?
           ORDER BY (transactionDate IS NULL), transactionDate DESC, id DESC
           LIMIT 1`,
          [Number(customerId)],
        ).catch(() => null);
        const installmentStats: any = await getAsync(
          `SELECT COUNT(*) AS openCount, COALESCE(SUM(p.amountDue),0) AS openAmount,
                  MIN(p.dueDate) AS nextDue
           FROM installment_payments p
           JOIN installment_sales s ON s.id = p.saleId
           WHERE s.customerId=? AND COALESCE(s.status,'active') = 'active' AND (p.status IS NULL OR p.status != 'paid')`,
          [Number(customerId)],
        ).catch(() => null);
        const repairStats: any = await getAsync(
          `SELECT COUNT(*) AS activeCount, MAX(COALESCE(dateReceived, createdAt)) AS lastRepair
           FROM repairs
           WHERE customerId=? AND (status IS NULL OR status NOT IN ('delivered','done','تحویل شد','تکمیل شد'))`,
          [Number(customerId)],
        ).catch(() => null);
        const invoiceStats: any = await getAsync(
          `SELECT COUNT(*) AS invoiceCount, MAX(transactionDate) AS lastInvoice
           FROM invoices
           WHERE customerId=?`,
          [Number(customerId)],
        ).catch(() => null);
        const bal = Number(latestLedger?.balance || 0);
        const status =
          bal > 0 ? "بدهی فعال" : bal < 0 ? "طلب از فروشگاه" : "تسویه کامل";
        const headIcon = bal > 0 ? "🔴" : bal < 0 ? "🟢" : "✅";
        const nextDue = installmentStats?.nextDue
          ? formatJalaliDate(installmentStats.nextDue, false)
          : "بدون سررسید فعال";
        const name = String(customer?.fullName || "مشتری گرامی").trim();
        const sections = [
          statBlock(
            headIcon,
            "وضعیت مالی",
            formatReportMoneyText(Math.abs(bal)),
            status,
          ),
          statBlock(
            "🗓️",
            "اقساط باز",
            `${formatMoney(installmentStats?.openCount || 0)} قسط`,
            `مبلغ باز: ${formatReportMoneyText(installmentStats?.openAmount || 0)} | بعدی: ${nextDue}`,
          ),
          statBlock(
            "🛠️",
            "تعمیرات فعال",
            `${formatMoney(repairStats?.activeCount || 0)} مورد`,
            repairStats?.lastRepair
              ? `آخرین پذیرش: ${formatJalaliDate(repairStats.lastRepair, false)}`
              : "مورد فعالی ثبت نشده است",
          ),
          statBlock(
            "🧾",
            "فاکتورهای ثبت‌شده",
            `${formatMoney(invoiceStats?.invoiceCount || 0)} فاکتور`,
            invoiceStats?.lastInvoice
              ? `آخرین فاکتور: ${formatJalaliDate(invoiceStats.lastInvoice, false)}`
              : "هنوز فاکتوری ثبت نشده است",
          ),
          latestLedger?.description
            ? statBlock(
                "📝",
                "آخرین توضیح حساب",
                compactDescription(latestLedger.description, 80),
                latestLedger?.transactionDate
                  ? `تازه‌سازی: ${formatJalaliDate(latestLedger.transactionDate, true)}`
                  : undefined,
              )
            : "",
        ];
        const text = buildSmartSummaryText(
          "خلاصه وضعیت حساب شما",
          `${name} عزیز، نمای سریع حساب فروشگاهی شما آماده است.`,
          "💼",
          sections,
          "📌 برای مشاهده جزئیات، از «📆 برنامه اقساط من»، «🛠 پیگیری تعمیرات» یا «🧾 خریدهای اخیر من» استفاده کنید.",
        );
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildCustomerQuickActionsKeyboard("summary"),
            parse_mode: "HTML",
          },
          {
            title: "💼 نمای مالی مشتری",
            subtitle: "خلاصه وضعیت حساب، اقساط و پیگیری‌ها",
          },
        );
      };
      const parseTelegramDueMoment = (value: any) => {
        const raw = String(value ?? "").trim();
        if (!raw) return null;
        const candidates = [
          moment(raw, "jYYYY/jMM/jDD", true),
          moment(raw, "jYYYY-jMM-jDD", true),
          moment(raw, "YYYY-MM-DD", true),
          moment(raw),
        ];
        const found = candidates.find((m) => m.isValid());
        return found || null;
      };
      const installmentStatusInfo = (row: any) => {
        const dueMoment = parseTelegramDueMoment(row?.dueDate);
        const today = moment().startOf("day");
        if (!dueMoment)
          return {
            icon: "ℹ️",
            label: "در انتظار تاریخ",
            tone: "neutral",
            hint: "تاریخ سررسید این قسط کامل ثبت نشده است.",
          };
        const due = dueMoment.clone().startOf("day");
        const days = due.diff(today, "days");
        if (days < 0)
          return {
            icon: "🔴",
            label: "معوق",
            tone: "danger",
            hint: `${formatMoney(Math.abs(days))} روز از سررسید گذشته است.`,
          };
        if (days === 0)
          return {
            icon: "🟠",
            label: "سررسید امروز",
            tone: "warning",
            hint: "امروز زمان پرداخت این قسط است.",
          };
        if (days <= 7)
          return {
            icon: "🟡",
            label: "نزدیک سررسید",
            tone: "soon",
            hint: `${formatMoney(days)} روز تا سررسید باقی مانده است.`,
          };
        return {
          icon: "🟢",
          label: "در برنامه پرداخت",
          tone: "ok",
          hint: `${formatMoney(days)} روز تا سررسید باقی مانده است.`,
        };
      };
      const buildInstallmentSmartCard = (row: any, index: number) => {
        const status = installmentStatusInfo(row);
        const due = row?.dueDate
          ? formatJalaliDate(row.dueDate, false)
          : "ثبت نشده";
        const item = compactDescription(
          row?.itemsSummary ||
            row?.phoneModel ||
            row?.saleTitle ||
            "فروش اقساطی فروشگاه",
          76,
        );
        const amount = Number(row?.amountDue || 0);
        const total = Number(row?.actualSalePrice || 0);
        const paidAmount =
          Number(row?.paidAmount || 0) + Number(row?.downPayment || 0);
        const remainingSale = Math.max(0, total - paidAmount);
        const paidCount = Number(row?.paidCount || 0);
        const totalCount = Number(row?.numberOfInstallments || 0);
        const progressText =
          totalCount > 0
            ? `${formatMoney(paidCount)} از ${formatMoney(totalCount)} قسط پرداخت‌شده`
            : `${formatMoney(paidCount)} پرداخت ثبت‌شده`;
        return [
          `💎 <b>کارت قسط ${esc(formatMoney(index + 1))}</b>  •  <code>#${esc(row?.saleId || "-")}</code>`,
          `${status.icon} <b>${esc(status.label)}</b>`,
          `<i>${esc(status.hint)}</i>`,
          softLine,
          `🧾 <b>پرونده فروش:</b> ${esc(item)}`,
          `🔢 <b>شماره قسط:</b> <code>${esc(row?.installmentNumber ?? "-")}</code>`,
          `📅 <b>سررسید:</b> <code>${esc(due)}</code>`,
          `💳 <b>مبلغ قسط:</b> <code>${esc(formatReportMoneyText(amount))}</code>`,
          total > 0
            ? `💰 <b>مبلغ کل فروش:</b> <code>${esc(formatReportMoneyText(total))}</code>`
            : "",
          total > 0
            ? `✅ <b>پرداخت‌شده:</b> <code>${esc(formatReportMoneyText(paidAmount))}</code>`
            : "",
          total > 0
            ? `⏳ <b>مانده تقریبی پرونده:</b> <code>${esc(formatReportMoneyText(remainingSale))}</code>`
            : "",
          `📊 <b>پیشرفت پرداخت:</b> ${esc(progressText)}`,
        ]
          .filter(Boolean)
          .join("\n");
      };
      const sendInstallments = async (customerId: number, page = 0) => {
        const rows = await allAsync(
          `SELECT p.id, p.saleId, p.installmentNumber, p.dueDate, p.amountDue, p.status,
                  s.itemsSummary, s.actualSalePrice, s.downPayment, s.numberOfInstallments, s.installmentAmount, s.saleType, s.dateCreated,
                  COALESCE((SELECT SUM(COALESCE(pp.amountDue, 0)) FROM installment_payments pp WHERE pp.saleId = s.id AND (LOWER(COALESCE(pp.status,'')) IN ('paid','پرداخت شده','پرداخت‌شده') OR pp.paymentDate IS NOT NULL)), 0) AS paidAmount,
                  COALESCE((SELECT COUNT(*) FROM installment_payments pc WHERE pc.saleId = s.id AND (LOWER(COALESCE(pc.status,'')) IN ('paid','پرداخت شده','پرداخت‌شده') OR pc.paymentDate IS NOT NULL)), 0) AS paidCount
           FROM installment_payments p
           JOIN installment_sales s ON s.id = p.saleId
           WHERE s.customerId=?
             AND COALESCE(s.status,'active') = 'active'
             AND NOT (LOWER(COALESCE(p.status,'')) IN ('paid','پرداخت شده','پرداخت‌شده') OR p.paymentDate IS NOT NULL)
           ORDER BY (p.dueDate IS NULL), p.dueDate ASC, p.installmentNumber ASC, p.id ASC`,
          [Number(customerId)],
        ).catch((err: any) => {
          console.error(
            "[telegram installments smart cards] query failed:",
            err?.message || err,
          );
          return [];
        });
        if (!rows?.length) {
          const text = [
            commercialHeader(
              "اقساط من",
              "در حال حاضر قسط بازی برای حساب شما ثبت نشده است.",
              "🗓️",
            ),
            "✅ <b>وضعیت:</b> پرداخت‌های ثبت‌شده شما منظم و بدون قسط باز هستند.",
            "",
            "هر فروش اقساطی جدید، با سررسید و مبلغ هر قسط در همین بخش نمایش داده می‌شود.",
            softLine,
            "☎️ برای هماهنگی پرداخت یا رفع مغایرت، «ارتباط با فروشگاه» را انتخاب کنید.",
          ].join("\n");
          await sendBotMessage(chatId, text, {
            reply_markup: buildCustomerQuickActionsKeyboard("installments"),
            parse_mode: "HTML",
          });
          return;
        }
        const pageSize = 3;
        const totalRows = rows.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        const safePage = Math.min(safePageNumber(page), totalPages - 1);
        const pageRows = rows.slice(
          safePage * pageSize,
          safePage * pageSize + pageSize,
        );
        const overdueCount = rows.filter(
          (r: any) => installmentStatusInfo(r).tone === "danger",
        ).length;
        const dueSoonCount = rows.filter((r: any) =>
          ["warning", "soon"].includes(installmentStatusInfo(r).tone),
        ).length;
        const totalOpenAmount = rows.reduce(
          (sum: number, r: any) => sum + Number(r?.amountDue || 0),
          0,
        );
        const cards = pageRows.map((r: any, index: number) =>
          buildInstallmentSmartCard(r, safePage * pageSize + index),
        );
        const text = [
          commercialHeader(
            "نمای هوشمند اقساط شما",
            "سررسیدها، مبلغ‌ها و وضعیت پرداخت در یک نمای مرتب و قابل پیگیری",
            "🗓️",
          ),
          `📌 <b>نمایش صفحه:</b> ${buildPaginationLabel(safePage, totalPages)}  •  <b>کل اقساط باز:</b> ${esc(formatMoney(totalRows))}`,
          `💳 <b>مجموع مبلغ اقساط باز:</b> <code>${esc(formatReportMoneyText(totalOpenAmount))}</code>`,
          overdueCount > 0
            ? `🔴 <b>معوق:</b> ${esc(formatMoney(overdueCount))} قسط`
            : "",
          dueSoonCount > 0
            ? `🟡 <b>نزدیک سررسید:</b> ${esc(formatMoney(dueSoonCount))} قسط`
            : "",
          "",
          cards.join(`\n\n${neonLine}\n\n`),
          "",
          softLine,
          "✨ پس از ثبت پرداخت، وضعیت اقساط به‌صورت خودکار به‌روزرسانی می‌شود.",
          "☎️ برای هماهنگی پرداخت یا رفع مغایرت، «ارتباط با فروشگاه» را انتخاب کنید.",
        ]
          .filter((line) => line !== "")
          .join("\n");
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildInstallmentsPaginationKeyboard(
              safePage,
              totalPages,
            ),
            parse_mode: "HTML",
          },
          {
            title: "🗓️ برنامه اقساط",
            subtitle: "سررسیدها، هشدارها و مانده پرداخت در یک نگاه",
          },
        );
      };
      const repairProgressLabel = (statusInfo: {
        icon: string;
        label: string;
      }) => {
        const label = String(statusInfo?.label || "").trim();
        if (label.includes("آماده")) return "آماده تحویل";
        if (label.includes("تحویل") || label.includes("تکمیل")) return "بسته‌شده";
        if (label.includes("انتظار") || label.includes("قطعه"))
          return "در انتظار قطعه";
        if (label.includes("پذیرش") || label.includes("دریافت"))
          return "پذیرش‌شده";
        if (label.includes("در حال") || label.includes("تعمیر"))
          return "در حال انجام";
        return label || "در حال بررسی";
      };
      const repairCostLine = (row: any) => {
        const finalCost = Number(row?.finalCost || 0);
        const estimatedCost = Number(row?.estimatedCost || 0);
        const laborFee = Number(row?.laborFee || 0);
        if (finalCost > 0)
          return `💵 <b>هزینه نهایی:</b> <code>${esc(formatReportMoneyText(finalCost))}</code>`;
        if (estimatedCost > 0)
          return `💰 <b>برآورد هزینه:</b> <code>${esc(formatReportMoneyText(estimatedCost))}</code>`;
        if (laborFee > 0)
          return `🧾 <b>اجرت ثبت‌شده:</b> <code>${esc(formatReportMoneyText(laborFee))}</code>`;
        return "💳 <b>هزینه:</b> در انتظار اعلام فروشگاه";
      };
      const repairDeviceLine = (row: any) => {
        const model = String(row?.deviceModel || "دستگاه شما").trim();
        const color = String(row?.deviceColor || "").trim();
        const serial = String(row?.serialNumber || "").trim();
        return [
          `📱 <b>دستگاه:</b> ${esc(model)}${color ? ` • ${esc(color)}` : ""}`,
          serial ? `🔑 <b>سریال / IMEI:</b> <code>${esc(serial)}</code>` : "",
        ]
          .filter(Boolean)
          .join("\n");
      };
      const buildRepairSmartCard = (row: any, index: number) => {
        const statusInfo = prettyRepairStatus(row?.status);
        const progress = repairProgressLabel(statusInfo);
        const receivedAt = row?.dateReceived
          ? formatJalaliDate(row.dateReceived, true)
          : "ثبت نشده";
        const completedAt = row?.dateCompleted
          ? formatJalaliDate(row.dateCompleted, true)
          : "";
        const technician = String(row?.technicianName || "").trim();
        const problem = compactDescription(row?.problemDescription || "", 110);
        const notes = compactDescription(row?.technicianNotes || "", 90);
        const partsCount = Number(row?.partsCount || 0);
        const lines = [
          `💎 <b>کارت تعمیر ${esc(formatMoney(index + 1))}</b>  •  <code>#${esc(row?.id || "-")}</code>`,
          `${statusInfo.icon} <b>${esc(progress)}</b>`,
          softLine,
          repairDeviceLine(row),
          problem && problem !== "گردش حساب"
            ? `🧩 <b>شرح مشکل:</b> ${esc(problem)}`
            : "",
          repairCostLine(row),
          technician
            ? `👨‍🔧 <b>مسئول پیگیری:</b> ${esc(technician)}`
            : "👨‍🔧 <b>مسئول پیگیری:</b> تیم خدمات فروشگاه",
          partsCount > 0
            ? `🧰 <b>قطعات مصرفی:</b> ${esc(formatMoney(partsCount))} مورد`
            : "",
          notes && notes !== "گردش حساب"
            ? `📝 <b>یادداشت فنی:</b> ${esc(notes)}`
            : "",
          "",
          `📥 <b>تاریخ پذیرش:</b> <code>${esc(receivedAt)}</code>`,
          completedAt
            ? `📦 <b>تاریخ تحویل:</b> <code>${esc(completedAt)}</code>`
            : "",
        ];
        return lines.filter((line) => line !== "").join("\n");
      };
      const sendRepairs = async (customerId: number) => {
        const rows = await allAsync(
          `SELECT r.id, r.deviceModel, r.deviceColor, r.serialNumber,
                  r.problemDescription, r.technicianNotes, r.status,
                  r.estimatedCost, r.finalCost, r.laborFee,
                  r.dateReceived, r.dateCompleted,
                  t.partnerName AS technicianName,
                  (SELECT COUNT(*) FROM repair_parts rp WHERE rp.repairId = r.id) AS partsCount
           FROM repairs r
           LEFT JOIN partners t ON t.id = r.technicianId
           WHERE r.customerId=?
           ORDER BY (r.dateReceived IS NULL), r.dateReceived DESC, r.id DESC
           LIMIT 8`,
          [Number(customerId)],
        ).catch((err: any) => {
          console.error(
            "[telegram repairs smart cards] query failed:",
            err?.message || err,
          );
          return [];
        });
        if (!rows?.length) {
          const text = [
            commercialHeader(
              "پیگیری تعمیرات من",
              "در حال حاضر پرونده تعمیراتی فعالی برای شما ثبت نشده است.",
              "🛠️",
            ),
            "✅ <b>وضعیت:</b> بدون پرونده فعال",
            "",
            "پرونده‌های تعمیر جدید، با وضعیت پذیرش، هزینه و آماده‌تحویل بودن دستگاه در همین بخش نمایش داده می‌شوند.",
            softLine,
            "☎️ برای ثبت یا پیگیری تعمیر، «ارتباط با فروشگاه» را انتخاب کنید.",
          ].join("\n");
          await sendBotRichCard(
            chatId,
            text,
            {
              reply_markup: buildCustomerQuickActionsKeyboard("repairs"),
              parse_mode: "HTML",
            },
            {
              title: "🛠️ پیگیری تعمیرات",
              subtitle: "پرونده‌های تعمیراتی با وضعیت، هزینه و زمان‌بندی",
            },
          );
          return;
        }
        const cards = rows.map((r: any, index: number) => buildRepairSmartCard(r, index));
        const activeCount = rows.filter((r: any) => {
          const label = String(prettyRepairStatus(r?.status).label || "");
          return !(
            label.includes("تحویل") ||
            label.includes("تکمیل") ||
            label.toLowerCase().includes("done")
          );
        }).length;
        const readyCount = rows.filter((r: any) =>
          String(prettyRepairStatus(r?.status).label || "").includes("آماده"),
        ).length;
        const text = [
          commercialHeader(
            "نمای هوشمند تعمیرات شما",
            "پرونده‌های تعمیراتی شما، مرتب، شفاف و قابل پیگیری",
            "🛠️",
          ),
          `📌 <b>تعداد نمایش:</b> ${esc(formatMoney(rows.length))} پرونده اخیر`,
          `🟢 <b>پرونده‌های در جریان:</b> ${esc(formatMoney(activeCount))} مورد`,
          readyCount > 0
            ? `✅ <b>آماده تحویل:</b> ${esc(formatMoney(readyCount))} دستگاه`
            : "",
          "",
          cards.join(`\n\n${neonLine}\n\n`),
          "",
          softLine,
          "✨ برای مشاهده تازه‌ترین وضعیت، «تازه‌سازی اطلاعات» را انتخاب کنید.",
          "☎️ برای هماهنگی تحویل یا اعلام مشکل، «ارتباط با فروشگاه» را انتخاب کنید.",
        ]
          .filter((line) => line !== "")
          .join("\n");
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildCustomerQuickActionsKeyboard("repairs"),
            parse_mode: "HTML",
          },
          {
            title: "🛠️ پیگیری تعمیرات",
            subtitle: "پرونده‌های تعمیراتی با وضعیت، هزینه و زمان‌بندی",
          },
        );
      };
      const sendInvoices = async (customerId: number) => {
        const rows = await allAsync(
          `SELECT id, grandTotal, transactionDate, status
           FROM sales_orders
           WHERE customerId=?
           ORDER BY (transactionDate IS NULL), transactionDate DESC, id DESC
           LIMIT 8`,
          [Number(customerId)],
        ).catch(() => []);
        if (!rows?.length) {
          await sendBotMessage(
            chatId,
            telegramCard(
              "خریدهای اخیر من",
              "🧾",
              ["در حال حاضر خرید ثبت‌شده‌ای برای حساب شما پیدا نشد."],
              "برای بازگشت، «🏠 منوی اصلی» را انتخاب کنید.",
            ),
            {
              reply_markup: buildCustomerQuickActionsKeyboard("invoices"),
              parse_mode: "HTML",
            },
          );
          return;
        }
        const lines = rows.map((r: any) => {
          const d = r?.transactionDate ? String(r.transactionDate) : "-";
          const t = formatMoney(r?.grandTotal);
          const st = String(r?.status || "").trim();
          return [
            `🧾 <b>خرید #${esc(r.id)}</b>`,
            `🕒 تاریخ: <code>${esc(d)}</code>`,
            `💰 مبلغ: <code>${esc(t)}</code> تومان${st ? ` • ${esc(st)}` : ""}`,
          ].join("\n");
        });
        const text = [
          commercialHeader(
            "خریدهای اخیر من",
            "آخرین خریدها و اسناد مالی ثبت‌شده برای حساب شما",
            "🧾",
          ),
          ...lines.map((x: string, i: number) => `${i ? softLine + "\n" : ""}${x}`),
          softLine,
          "✨ برای دریافت جزئیات کامل خرید، با فروشگاه تماس بگیرید.",
        ].join("\n\n");
        await sendBotRichCard(
          chatId,
          text,
          {
            reply_markup: buildCustomerQuickActionsKeyboard("invoices"),
            parse_mode: "HTML",
          },
          {
            title: "🧾 خریدهای اخیر",
            subtitle: "اسناد مالی و خریدهای ثبت‌شده برای حساب شما",
          },
        );
      };
      const getStoreTelegramInfoLines = async () => {
        const settings = await getAllSettingsAsObject().catch(() => ({}) as any);
        const storeName = String(
          (settings as any).store_name || "فروشگاه کوروش",
        ).trim();
        const phone = String((settings as any).store_phone || "").trim();
        const email = String((settings as any).store_email || "").trim();
        const address = [
          String((settings as any).store_address_line1 || "").trim(),
          String((settings as any).store_address_line2 || "").trim(),
          String((settings as any).store_city_state_zip || "").trim(),
        ]
          .filter(Boolean)
          .join(" - ");
        const site = String((settings as any).qr_public_base_url || "").trim();
        return { storeName, phone, email, address, site };
      };
      const sendSupportInfo = async (replyMarkup: any) => {
        const info = await getStoreTelegramInfoLines();
        const lines = [
          `🏪 <b>فروشگاه:</b> ${esc(info.storeName)}`,
          info.phone
            ? `☎️ <b>شماره تماس:</b> ${esc(info.phone)}`
            : "☎️ شماره تماس در تنظیمات فروشگاه ثبت نشده است.",
          info.email ? `✉️ <b>ایمیل:</b> ${esc(info.email)}` : "",
          info.address ? `📍 <b>آدرس:</b> ${esc(info.address)}` : "",
        ];
        await sendBotMessage(
          chatId,
          telegramCard(
            "ارتباط با فروشگاه",
            "☎️",
            lines,
            "برای بازگشت، «🏠 منوی اصلی» را انتخاب کنید.",
          ),
          { reply_markup: replyMarkup, parse_mode: "HTML" },
        );
      };
      const sendSiteInfo = async (replyMarkup: any) => {
        const info = await getStoreTelegramInfoLines();
        const lines = [
          info.site
            ? `🌐 <b>سایت فروشگاه:</b> ${esc(info.site)}`
            : "🌐 ورود به سایت فروشگاه/دامنه عمومی هنوز در تنظیمات فروشگاه ثبت نشده است.",
          "برای فعال‌سازی لینک سایت، دامنه عمومی فروشگاه را در تنظیمات تکمیل کنید.",
        ];
        await sendBotMessage(
          chatId,
          telegramCard(
            "سایت فروشگاه",
            "🌐",
            lines,
            "برای بازگشت، «🏠 منوی اصلی» را انتخاب کنید.",
          ),
          { reply_markup: replyMarkup, parse_mode: "HTML" },
        );
      };
      // Handle callback buttons
      if (cb?.data) {
        const data = String(cb.data || "").trim();
        const customer = await getLinkedCustomer();
        const partner = await getLinkedPartner();

        if (data.startsWith("PARTNER_")) {
          if (!partner?.id) {
            if (customer?.id) {
              await showMainMenu(customer);
              return;
            }
            await sendBotMessage(
              chatId,
              telegramCard(
                "ورود امن لازم است",
                "🔒",
                [
                  "برای نمایش اطلاعات همکاری، ابتدا ورود امن با شماره موبایل را کامل کنید.",
                ],
                "پس از تأیید، پنل اختصاصی همکاران برای شما فعال می‌شود.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          const pid = Number(partner.id);
          if (data === "PARTNER_HOME") {
            await showPartnerMenu(partner);
            return;
          }
          if (data === "PARTNER_PHONES") {
            await sendPartnerPhones(pid);
            return;
          }
          if (data === "PARTNER_LEDGER") {
            await sendPartnerLedger(pid, 0);
            return;
          }
          if (data.startsWith("PARTNER_LEDGER_PAGE:")) {
            await sendPartnerLedger(pid, Number(data.split(":")[1] || 0));
            return;
          }
          if (data === "PARTNER_BALANCE") {
            await sendPartnerBalance(pid);
            return;
          }
          if (data === "PARTNER_SUPPORT") {
            await sendSupportInfo(buildPartnerMenuKeyboard());
            return;
          }
          if (data === "PARTNER_SITE") {
            await sendSiteInfo(buildPartnerMenuKeyboard());
            return;
          }
          if (data === "PARTNER_HELP") {
            const helpText = telegramCard(
              "راهنمای سریع همکار",
              "ℹ️",
              [
                "• موجودی گوشی‌های من: گوشی‌های مرتبط با حساب همکاری",
                "• گردش حساب من: مشاهده گردش‌ها با تاریخ شمسی و مانده هر رکورد",
                "• نمای همکاری من: مانده، گوشی‌ها و آخرین فعالیت در یک نگاه",
              ],
              "برای بازگشت به منوی همکار، از دکمه «🏠 منو» استفاده کنید.",
            );
            await sendBotMessage(chatId, helpText, {
              reply_markup: buildPartnerReplyKeyboard(),
              parse_mode: "HTML",
            });
            return;
          }
          if (data === "PARTNER_UNLINK") {
            await unlinkPartnerTelegramIdentity(pid);
            await sendBotMessage(
              chatId,
              telegramCard(
                "خروج از حساب انجام شد",
                "🔗",
                ["حساب تلگرام شما از پرونده همکار جدا شد."],
                "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          await showPartnerMenu(partner);
          return;
        }

        if (!customer?.id) {
          if (partner?.id) {
            await showPartnerMenu(partner);
            return;
          }
          await sendBotMessage(
            chatId,
            telegramCard(
              "ورود امن لازم است",
              "🔒",
              [
                "برای استفاده از منو، ابتدا /start را بزنید و شماره موبایل را تأیید کنید.",
              ],
              "پس از تأیید، پنل اختصاصی شما فعال می‌شود.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }

        const cid = Number(customer.id);
        if (data === "MENU_BALANCE") return await sendBalance(cid);
        if (data === "MENU_HOME") return await showMainMenu(customer);
        if (data === "MENU_INSTALLMENTS") return await sendInstallments(cid, 0);
        if (data.startsWith("MENU_INSTALLMENTS_PAGE:"))
          return await sendInstallments(cid, Number(data.split(":")[1] || 0));
        if (data === "MENU_REPAIRS") return await sendRepairs(cid);
        if (data === "MENU_INVOICES") return await sendInvoices(cid);
        if (data === "MENU_SUPPORT")
          return await sendSupportInfo(buildMainMenuKeyboard());
        if (data === "MENU_SITE")
          return await sendSiteInfo(buildMainMenuKeyboard());
        if (data === "MENU_HELP") {
          const helpText = telegramCard(
            "راهنمای سریع ربات",
            "ℹ️",
            [
              "• نمای مالی من: مشاهده مانده حساب و وضعیت مالی",
              "• برنامه اقساط من: سررسیدها و پرداخت‌های باز",
              "• پیگیری تعمیرات: آخرین وضعیت پذیرش، هزینه و تحویل",
              "• خریدهای اخیر من: مرور اسناد مالی",
            ],
            "برای بازگشت به منوی اصلی، از دکمه «🏠 منو» استفاده کنید.",
          );
          await sendBotMessage(chatId, helpText, {
            reply_markup: buildMainReplyKeyboard(),
            parse_mode: "HTML",
          });
          return;
        }
        if (data === "MENU_NOTIFS") {
          const cur = Number((customer as any).telegram_opted_out || 0) ? 1 : 0;
          const next = cur ? 0 : 1;
          await setOptedOut(cid, next as any);
          await sendBotMessage(
            chatId,
            next
              ? telegramCard(
                  "اعلان‌ها خاموش شد",
                  "🔕",
                  ["دریافت اعلان‌های خودکار برای این حساب متوقف شد."],
                  "برای فعال‌سازی دوباره، از همین منو استفاده کنید.",
                )
              : telegramCard(
                  "اعلان‌ها روشن شد",
                  "🔔",
                  ["دریافت اعلان‌های خودکار برای این حساب فعال شد."],
                  "از این پس پیام‌ها طبق تنظیمات شما ارسال می‌شوند.",
                ),
            { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        if (data === "MENU_UNLINK") {
          await unlinkCustomerTelegramIdentity(cid);
          await sendBotMessage(
            chatId,
            telegramCard(
              "خروج از حساب انجام شد",
              "🔗",
              ["حساب تلگرام شما از پرونده فروشگاه جدا شد."],
              "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        // Unknown callback
        if (partner?.id) {
          await showPartnerMenu(partner);
          return;
        }
        await showMainMenu(customer);
        return;
      }
      // /start -> ask for contact
      const msgText = String(msg.text || "").trim();
      const restartBotForChat = async () => {
        await ensureTelegramPersistentMenu(chatId).catch(() => {});
        const customer = await getLinkedCustomer();
        if (customer?.id) {
          await showMainMenu(customer);
          return;
        }
        const partner = await getLinkedPartner();
        if (partner?.id) {
          await showPartnerMenu(partner);
          return;
        }
        const legacyKind = await getLegacyDeliveryKind();
        if (legacyKind) {
          await auditLegacyTelegramAuthRejected(legacyKind, "DELIVERY_CHAT_ID_ONLY");
          await sendBotMessage(chatId, legacyKind === "partner"
            ? "لینک امن اتصال همکار را از فروشگاه دریافت کنید."
            : "برای ادامه، اتصال امن حساب تلگرام خود را تأیید کنید.",
          );
          return;
        }
        await sendBotMessage(
          chatId,
          telegramCard(
            "شروع دوباره دستیار",
            "🔄",
            [
              "پنل تلگرام تازه‌سازی شد. برای ورود امن، شماره موبایل ثبت‌شده در فروشگاه را ارسال کنید.",
            ],
            "دکمه «📲 اتصال امن با شماره موبایل» را لمس کنید.",
          ),
          { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
        );
      };
      if (
        msgText.startsWith("/restart") ||
        msgText === "🔄 شروع دوباره" ||
        msgText.includes("تازه‌سازی اطلاعات") ||
        msgText.includes("دریافت تازه‌سازی")
      ) {
        await restartBotForChat();
        return;
      }
      if (msgText && !msgText.startsWith("/")) {
        const customer = await getLinkedCustomer();
        const partner = await getLinkedPartner();
        const normalized = msgText.replace(/\s+/g, " ").trim();

        if (!customer?.id && !partner?.id) {
          if (
            normalized.includes("راهنمای ورود") ||
            normalized.includes("راهنمای سریع") ||
            normalized.includes("راهنمای اتصال") ||
            normalized.includes("راهنمای استفاده")
          ) {
            await sendBotMessage(
              chatId,
              telegramCard(
                "راهنمای سریع اتصال",
                "ℹ️",
                [
                  "۱. دکمه «📲 اتصال امن با شماره موبایل» را لمس کنید.",
                  "۲. شماره‌ای را بفرستید که در پرونده مشتری یا همکار ثبت شده است.",
                  "۳. بعد از تأیید، منوی اختصاصی شما نمایش داده می‌شود.",
                ],
                "اگر پرونده پیدا نشد، ابتدا آن را در پرونده فروشگاه ثبت کنید.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          if (
            normalized.includes("ارتباط با فروشگاه") ||
            normalized.includes("پشتیبانی فروشگاه")
          ) {
            await sendSupportInfo(buildContactKeyboard());
            return;
          }
          if (
            normalized.includes("سایت فروشگاه") ||
            normalized.includes("وب‌سایت فروشگاه")
          ) {
            await sendSiteInfo(buildContactKeyboard());
            return;
          }
        }

        if (partner?.id) {
          const pid = Number(partner.id);
          if (
            normalized.includes("موجودی گوشی‌های من") ||
            normalized.includes("گوشی‌های من")
          ) {
            await sendPartnerPhones(pid);
            return;
          }
          if (
            normalized.includes("گردش حساب شما") ||
            normalized.includes("گردش حساب من")
          ) {
            await sendPartnerLedger(pid, 0);
            return;
          }
          if (
            normalized.includes("نمای همکاری") ||
            normalized.includes("وضعیت حساب شما") ||
            normalized.includes("خلاصه وضعیت من")
          ) {
            await sendPartnerBalance(pid);
            return;
          }
          if (
            normalized.includes("ارتباط با فروشگاه") ||
            normalized.includes("پشتیبانی فروشگاه")
          ) {
            await sendSupportInfo(buildPartnerReplyKeyboard());
            return;
          }
          if (
            normalized.includes("سایت فروشگاه") ||
            normalized.includes("وب‌سایت فروشگاه")
          ) {
            await sendSiteInfo(buildPartnerReplyKeyboard());
            return;
          }
          if (
            normalized.includes("راهنمای ورود") ||
            normalized.includes("راهنمای سریع") ||
            normalized.includes("راهنمای اتصال") ||
            normalized.includes("راهنمای استفاده")
          ) {
            const helpText = telegramCard(
              "راهنمای سریع همکار",
              "ℹ️",
              [
                "• موجودی گوشی‌های من: گوشی‌های مرتبط با حساب همکاری",
                "• گردش حساب من: مشاهده گردش‌ها با تاریخ شمسی و مانده هر رکورد",
                "• نمای همکاری من: مانده، گوشی‌ها و آخرین فعالیت در یک نگاه",
              ],
              "برای بازگشت، دکمه «🏠 منوی اصلی» را بزنید.",
            );
            await sendBotMessage(chatId, helpText, {
              reply_markup: buildPartnerReplyKeyboard(),
              parse_mode: "HTML",
            });
            return;
          }
          if (
            normalized.includes("خروج از حساب") ||
            normalized.includes("قطع اتصال") ||
            normalized.includes("قطع اتصال حساب")
          ) {
            await unlinkPartnerTelegramIdentity(pid);
            await sendBotMessage(
              chatId,
              telegramCard(
                "خروج از حساب انجام شد",
                "🔗",
                ["حساب تلگرام شما از پرونده همکار جدا شد."],
                "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          if (
            normalized.includes("منوی اصلی") ||
            normalized.includes("صفحه اصلی") ||
            normalized === "منو"
          ) {
            await showPartnerMenu(partner);
            return;
          }
          await showPartnerMenu(partner);
          return;
        }
        const legacyKind = await getLegacyDeliveryKind();
        if (legacyKind) {
          await auditLegacyTelegramAuthRejected(legacyKind, "DELIVERY_CHAT_ID_ONLY");
          await sendBotMessage(chatId, legacyKind === "partner" ? "لینک امن اتصال همکار را از فروشگاه دریافت کنید." : "برای ادامه، اتصال امن حساب تلگرام خود را تأیید کنید.");
          return;
        }

        if (customer?.id) {
          const cid = Number(customer.id);
          if (
            normalized.includes("نمای مالی") ||
            normalized.includes("وضعیت حساب")
          ) {
            await sendBalance(cid);
            return;
          }
          if (
            normalized.includes("برنامه اقساط") ||
            normalized.includes("اقساط من")
          ) {
            await sendInstallments(cid, 0);
            return;
          }
          if (
            normalized.includes("پیگیری تعمیرات") ||
            normalized.includes("تعمیرات من")
          ) {
            await sendRepairs(cid);
            return;
          }
          if (
            normalized.includes("خریدهای اخیر") ||
            normalized.includes("فاکتورهای اخیر")
          ) {
            await sendInvoices(cid);
            return;
          }
          if (
            normalized.includes("ارتباط با فروشگاه") ||
            normalized.includes("پشتیبانی فروشگاه")
          ) {
            await sendSupportInfo(buildMainReplyKeyboard());
            return;
          }
          if (
            normalized.includes("سایت فروشگاه") ||
            normalized.includes("وب‌سایت فروشگاه")
          ) {
            await sendSiteInfo(buildMainReplyKeyboard());
            return;
          }
          if (
            normalized.includes("راهنمای ورود") ||
            normalized.includes("راهنمای سریع") ||
            normalized.includes("راهنمای اتصال") ||
            normalized.includes("راهنمای استفاده")
          ) {
            const helpText = telegramCard(
              "راهنمای سریع ربات",
              "ℹ️",
              [
                "• نمای مالی من: مشاهده مانده حساب و وضعیت مالی",
                "• برنامه اقساط من: سررسیدها و پرداخت‌های باز",
                "• پیگیری تعمیرات: آخرین وضعیت پذیرش، هزینه و تحویل",
                "• خریدهای اخیر من: مرور اسناد مالی",
              ],
              "برای بازگشت، دکمه «🏠 منوی اصلی» را بزنید.",
            );
            await sendBotMessage(chatId, helpText, {
              reply_markup: buildMainReplyKeyboard(),
              parse_mode: "HTML",
            });
            return;
          }
          if (
            normalized.includes("اعلان‌ها") ||
            normalized.includes("تنظیم اعلان") ||
            normalized.includes("مدیریت اعلان‌ها")
          ) {
            const cur = Number((customer as any).telegram_opted_out || 0) ? 1 : 0;
            const next = cur ? 0 : 1;
            await setOptedOut(cid, next as any);
            await sendBotMessage(
              chatId,
              next
                ? telegramCard(
                    "اعلان‌ها خاموش شد",
                    "🔕",
                    ["دریافت اعلان‌های خودکار برای این حساب متوقف شد."],
                    "برای فعال‌سازی دوباره، از همین منو استفاده کنید.",
                  )
                : telegramCard(
                    "اعلان‌ها روشن شد",
                    "🔔",
                    ["دریافت اعلان‌های خودکار برای این حساب فعال شد."],
                    "از این پس پیام‌ها طبق تنظیمات شما ارسال می‌شوند.",
                  ),
              { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          if (
            normalized.includes("خروج از حساب") ||
            normalized.includes("قطع اتصال") ||
            normalized.includes("قطع اتصال حساب")
          ) {
            await unlinkCustomerTelegramIdentity(cid);
            await sendBotMessage(
              chatId,
              telegramCard(
                "خروج از حساب انجام شد",
                "🔗",
                ["حساب تلگرام شما از پرونده فروشگاه جدا شد."],
                "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          if (
            normalized.includes("منوی اصلی") ||
            normalized.includes("صفحه اصلی") ||
            normalized === "منو"
          ) {
            await showMainMenu(customer);
            return;
          }
          await showMainMenu(customer);
          return;
        }
      }
      if (msgText.startsWith("/start")) {
        await ensureTelegramPersistentMenu(chatId).catch(() => {});
        const parts = msgText.split(" ").filter(Boolean);
        const payload = String(parts[1] || "").trim();
        // One-tap QR linking: /start link_<token>
        if (payload.startsWith("link_")) {
          const token = payload.slice("link_".length).trim();
          const row: any = await getTelegramLinkTokenByPlainToken(token);
          if (!row?.id) {
            await sendBotMessage(
              chatId,
              "این لینک دیگر معتبر نیست. لطفاً یک QR جدید از فروشگاه دریافت کنید.",
            );
            return;
          }
          if (String(row.status || "") === "used") {
            await sendBotMessage(
              chatId,
              "این لینک قبلاً استفاده شده است. برای اتصال دوباره، QR جدید دریافت کنید.",
            );
            return;
          }
          if (String(row.status || "") === "expired") {
            await sendBotMessage(
              chatId,
              "اعتبار این لینک پایان یافته است. لطفاً QR جدید دریافت کنید.",
            );
            return;
          }
          const customerRow: any = await getAsync(
            `SELECT id, fullName, phoneNumber FROM customers WHERE id=? LIMIT 1`,
            [Number(row.customer_id)],
          );
          if (!customerRow?.id) {
            await markTelegramLinkTokenStatus(Number(row.id), "canceled", {
              chatId,
              telegramUserId: fromId,
              err: "Customer not found",
            });
            await sendBotMessage(
              chatId,
              "پرونده مشتری مربوط به این لینک پیدا نشد. لطفاً با فروشگاه تماس بگیرید.",
            );
            return;
          }
          // If customer has a phone on file, request contact for verification; otherwise link immediately.
          const expectedPhone = customerRow?.phoneNumber
            ? normalizeIranPhone(String(customerRow.phoneNumber))
            : "";
          if (expectedPhone) {
            await markTelegramLinkTokenStatus(Number(row.id), "await_contact", {
              chatId,
              telegramUserId: fromId,
            });
            await sendBotMessage(
              chatId,
              telegramCard(
                "تأیید اتصال",
                "🔐",
                [
                  `سلام ${esc(customerRow.fullName || "")} 👋`,
                  "برای ادامه، لطفاً شماره موبایل خودتان را با دکمه زیر ارسال کنید.",
                ],
                "⚠️ فقط شماره‌ای که متعلق به خودتان باشد پذیرفته می‌شود.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          const linked = await linkCustomerTelegramIdentityById(Number(customerRow.id), fromId, chatId);
          if (!linked.ok) {
            await markTelegramLinkTokenStatus(Number(row.id), "canceled", { chatId, telegramUserId: fromId, err: linked.reason });
            await sendBotMessage(chatId, "اتصال امن انجام نشد. برای بررسی مالکیت حساب با فروشگاه تماس بگیرید.");
            return;
          }
          await markTelegramLinkTokenStatus(Number(row.id), "used", {
            chatId,
            telegramUserId: fromId,
          });
          await sendBotMessage(chatId, "​", {
            reply_markup: { remove_keyboard: true },
            parse_mode: undefined,
          });
          await sendBotMessage(
            chatId,
            telegramCard(
              "ورود امن تکمیل شد",
              "✅",
              ["حساب تلگرام شما با موفقیت به پرونده فروشگاه متصل شد."],
              "از پنل پایین، گزارش‌های مالی و پیگیری‌های خود را مشاهده کنید.",
            ),
            { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
          );
          const customer = await getLinkedCustomer();
          await showMainMenu(customer);
          return;
        }
        // Normal /start flow
        const customer = await getLinkedCustomer();
        if (customer?.id) {
          await showMainMenu(customer);
          return;
        }
        const partner = await getLinkedPartner();
        if (partner?.id) {
          await showPartnerMenu(partner);
          return;
        }
        const legacyKind = await getLegacyDeliveryKind();
        if (legacyKind) {
          await auditLegacyTelegramAuthRejected(legacyKind, "start_with_delivery_mapping_only");
          await sendBotMessage(
            chatId,
            telegramCard(
              "تأیید امن لازم است",
              "🔒",
              ["این مقصد ارسال از نسخه قدیمی حفظ شده، اما برای دسترسی به اطلاعات حساب معتبر نیست."],
              legacyKind === "partner"
                ? "از فروشگاه بخواهید لینک امن جدید همکار را صادر کند."
                : "لینک امن یا شماره موبایل متعلق به خودتان را دوباره تأیید کنید.",
            ),
            { reply_markup: legacyKind === "customer" ? buildContactKeyboard() : { remove_keyboard: true }, parse_mode: "HTML" },
          );
          return;
        }
        await sendBotMessage(
          chatId,
          telegramCard(
            "ورود به دستیار کوروش",
            "👋",
            [
              "برای فعال‌سازی پنل اختصاصی و مشاهده گزارش‌های حساب، شماره موبایل ثبت‌شده در فروشگاه را ارسال کنید.",
            ],
            "دکمه «📲 اتصال امن با شماره موبایل» را لمس کنید.",
          ),
          { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
        );
        return;
      }
      if (msgText.startsWith("/help") || msgText.startsWith("/menu")) {
        const customer = await getLinkedCustomer();
        if (customer?.id) {
          await showMainMenu(customer);
          return;
        }
        const partner = await getLinkedPartner();
        if (partner?.id) {
          await showPartnerMenu(partner);
          return;
        }
        const legacyKind = await getLegacyDeliveryKind();
        if (legacyKind) {
          await auditLegacyTelegramAuthRejected(legacyKind, "menu_with_delivery_mapping_only");
          await sendBotMessage(
            chatId,
            "این Chat ID فقط مقصد ارسال قدیمی است و دسترسی تعاملی ندارد. لطفاً اتصال امن را دوباره تأیید کنید.",
            { reply_markup: legacyKind === "customer" ? buildContactKeyboard() : { remove_keyboard: true } },
          );
          return;
        }
        await sendBotMessage(
          chatId,
          telegramCard(
            "ورود امن لازم است",
            "🔒",
            [
              "برای نمایش اطلاعات حساب، ابتدا ورود امن با شماره موبایل را کامل کنید.",
            ],
            "پس از تأیید، پنل اختصاصی شما فعال می‌شود.",
          ),
          { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
        );
        return;
      }
      if (msgText.startsWith("/stop")) {
        const customer = await getLinkedCustomer();
        if (customer?.id) {
          await setOptedOut(Number(customer.id), 1);
          await sendBotMessage(
            chatId,
            telegramCard(
              "اعلان‌ها متوقف شد",
              "🔕",
              ["ارسال اعلان‌های خودکار برای این حساب متوقف شد."],
              "برای فعال‌سازی دوباره، از منوی اصلی وارد تنظیم اعلان‌ها شوید.",
            ),
            { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        const partner = await getLinkedPartner();
        if (partner?.id) {
          await sendBotMessage(
            chatId,
            telegramCard(
              "راهنمای سریع",
              "ℹ️",
              ["تنظیم اعلان‌های همکار از پنل فروشگاه مدیریت می‌شود."],
              "برای بازگشت، منوی اصلی را انتخاب کنید.",
            ),
            { reply_markup: buildPartnerReplyKeyboard(), parse_mode: "HTML" },
          );
        } else {
          await sendBotMessage(
            chatId,
            telegramCard(
              "اتصال لازم است",
              "🔒",
              ["ابتدا /start را بزنید تا اتصال انجام شود."],
              "پس از اتصال، می‌توانید /menu را باز کنید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
        }
        return;
      }
      if (msgText.startsWith("/unlink")) {
        const customer = await getLinkedCustomer();
        if (customer?.id) {
          await unlinkCustomerTelegramIdentity(Number(customer.id));
          await sendBotMessage(
            chatId,
            telegramCard(
              "خروج از حساب انجام شد",
              "🔗",
              ["حساب تلگرام شما از پرونده فروشگاه جدا شد."],
              "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        const partner = await getLinkedPartner();
        if (partner?.id) {
          await unlinkPartnerTelegramIdentity(Number(partner.id));
          await sendBotMessage(
            chatId,
            telegramCard(
              "خروج از حساب انجام شد",
              "🔗",
              ["حساب تلگرام شما از پرونده همکار جدا شد."],
              "برای اتصال دوباره، ورود امن را از ابتدا انجام دهید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
        } else {
          await sendBotMessage(
            chatId,
            telegramCard(
              "اتصال فعالی پیدا نشد",
              "ℹ️",
              ["در حال حاضر اتصال فعالی برای قطع کردن وجود ندارد."],
              "اگر قبلاً متصل بوده‌اید، شماره موبایل ثبت‌شده یا QR جدید را بررسی کنید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
        }
        return;
      }
      // Contact share
      const contact = msg.contact;
      if (contact?.phone_number) {
        // Authentication accepts only Telegram's verified self-contact button.
        const contactUserId = String(contact.user_id ?? "").trim();
        if (!contactUserId || contactUserId !== fromId) {
          await auditLegacyTelegramAuthRejected("customer", contactUserId ? "FOREIGN_CONTACT" : "CONTACT_USER_ID_MISSING");
          await sendBotMessage(
            chatId,
            telegramCard(
              "تأیید امنیتی",
              "🛡️",
              ["برای تأیید شماره، از دکمه رسمی ارسال شماره خودتان استفاده کنید."],
              "ارسال دستی یا شماره متعلق به فرد دیگر قابل پذیرش نیست.",
            ),
            { parse_mode: "HTML" },
          );
          return;
        }
        const phone = normalizeIranPhone(String(contact.phone_number));
        if (!phone) {
          await sendBotMessage(
            chatId,
            telegramCard(
              "شماره نامعتبر",
              "⚠️",
              ["شماره ارسال‌شده معتبر نیست. لطفاً دوباره تلاش کنید."],
              "از دکمه «📲 اتصال امن با شماره موبایل» استفاده کنید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        const [customerCandidates, partnerCandidates]: [any[], any[]] = await Promise.all([
          findCustomersByNormalizedPhone(phone),
          findPartnersByNormalizedPhone(phone),
        ]);
        const totalCandidateCount = customerCandidates.length + partnerCandidates.length;
        if (customerCandidates.length > 1 || partnerCandidates.length > 1 || totalCandidateCount > 1) {
          await auditLegacyTelegramAuthRejected("customer", "DUPLICATE_PHONE");
          await auditLegacyTelegramAuthRejected("partner", "DUPLICATE_PHONE");
          await sendBotMessage(
            chatId,
            telegramCard(
              "اتصال انجام نشد",
              "🔒",
              ["این شماره به بیش از یک پرونده مشتری/همکار مرتبط است و انتخاب خودکار مجاز نیست."],
              "شماره باید فقط به یک پرونده یکتا در فروشگاه تعلق داشته باشد.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }
        const customerCandidate: any = customerCandidates[0] || null;
        const partnerCandidate: any = partnerCandidates[0] || null;
        if (!customerCandidate?.id && !partnerCandidate?.id) {
          await auditLegacyTelegramAuthRejected("customer", "PHONE_NOT_FOUND");
          await auditLegacyTelegramAuthRejected("partner", "PHONE_NOT_FOUND");
          await sendBotMessage(
            chatId,
            telegramCard(
              "دسترسی فعال نشد",
              "🔒",
              ["این شماره موبایل در پرونده مشتریان یا همکاران فروشگاه ثبت نشده است."],
              "شماره ارسال‌شده را با شماره ثبت‌شده در پرونده فروشگاه بررسی کنید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }

        // Telegram's request_contact button supplies the authenticated user's own
        // contact (user_id was verified above). For a unique Partner phone this is
        // sufficient to complete the same identity binding without pretending the
        // record is a Customer. Customer OTP policy remains unchanged below.
        if (partnerCandidate?.id) {
          const linked = await linkPartnerTelegramIdentityByPhone(phone, fromId, chatId);
          if (!linked.ok) {
            await sendBotMessage(
              chatId,
              telegramCard(
                "اتصال همکار انجام نشد",
                "🔒",
                ["شماره پیدا شد اما اتصال امن حساب همکار قابل تکمیل نبود."],
                linked.reason === "rebind_rejected"
                  ? "این پرونده قبلاً به حساب تلگرام دیگری متصل شده است."
                  : "لطفاً وضعیت اتصال پرونده همکار را در فروشگاه بررسی کنید.",
              ),
              { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
            );
            return;
          }
          await sendBotMessage(chatId, "​", {
            reply_markup: { remove_keyboard: true },
            parse_mode: undefined,
          });
          await sendBotMessage(
            chatId,
            telegramCard(
              "ورود امن همکار تکمیل شد",
              "✅",
              ["شماره موبایل با پرونده همکار تطبیق داده شد و پنل همکاری شما فعال شد."],
              "از پنل پایین، موجودی گوشی‌ها و گردش حساب خود را مشاهده کنید.",
            ),
            { reply_markup: buildPartnerReplyKeyboard(), parse_mode: "HTML" },
          );
          const partner = await getLinkedPartner();
          await showPartnerMenu(partner);
          return;
        }

        const otpEnabled = await isTelegramLinkOtpEnabled();
        if (!otpEnabled) {
          if (customerCandidate?.id) {
            const linked = await linkCustomerTelegramIdentityByPhone(phone, fromId, chatId);
            if (!linked.ok) {
              await sendBotMessage(
                chatId,
                telegramCard(
                  "پرونده پیدا نشد",
                  "⚠️",
                  ["این شماره در پرونده مشتریان فروشگاه ثبت نشده است."],
                  "لطفاً ابتدا شماره را در پرونده فروشگاه ثبت کنید و سپس دوباره تلاش کنید.",
                ),
                { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
              );
              return;
            }
            await sendBotMessage(chatId, "​", {
              reply_markup: { remove_keyboard: true },
              parse_mode: undefined,
            });
            await sendBotMessage(
              chatId,
              telegramCard(
                "ورود امن تکمیل شد",
                "✅",
                [
                  "شماره موبایل با پرونده مشتری تطبیق داده شد و ورود امن شما تکمیل شد.",
                ],
                "از پنل پایین، گزارش‌های مالی و پیگیری‌های خود را مشاهده کنید.",
              ),
              { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
            );
            const customer = await getLinkedCustomer();
            await showMainMenu(customer);
            return;
          }
          await sendBotMessage(
            chatId,
            telegramCard(
              "پرونده پیدا نشد",
              "⚠️",
              ["این شماره در پرونده مشتریان فروشگاه ثبت نشده است."],
              "لطفاً ابتدا شماره را در پرونده فروشگاه ثبت کنید و سپس دوباره تلاش کنید.",
            ),
            { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
          );
          return;
        }

        // If a QR link token is pending for this chat, verify phone and link without OTP when possible.
        const pendingToken: any =
          await getPendingTelegramLinkTokenByChatId(chatId);
        if (pendingToken?.id && pendingToken?.customer_id) {
          const expected = pendingToken.expected_phone
            ? normalizeIranPhone(String(pendingToken.expected_phone))
            : "";
          if (expected && phone === expected) {
            const linked = await linkCustomerTelegramIdentityById(Number(pendingToken.customer_id), fromId, chatId);
            if (!linked.ok) {
              await sendBotMessage(chatId, "اتصال امن انجام نشد. برای بررسی مالکیت حساب با فروشگاه تماس بگیرید.");
              return;
            }
            await markTelegramLinkTokenStatus(Number(pendingToken.id), "used", {
              chatId,
              telegramUserId: fromId,
            });
            await sendBotMessage(chatId, "​", {
              reply_markup: { remove_keyboard: true },
              parse_mode: undefined,
            });
            await sendBotMessage(
              chatId,
              telegramCard(
                "ورود امن تکمیل شد",
                "✅",
                ["حساب تلگرام شما با موفقیت به پرونده فروشگاه متصل شد."],
                "از پنل پایین، گزارش‌های مالی و پیگیری‌های خود را مشاهده کنید.",
              ),
              { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
            );
            const customer = await getLinkedCustomer();
            await showMainMenu(customer);
            return;
          }
          // Mismatch: use OTP only if needed (send OTP to expected phone on file)
          if (expected && phone !== expected) {
            await markTelegramLinkTokenStatus(
              Number(pendingToken.id),
              "await_otp",
              { chatId, telegramUserId: fromId, err: "Phone mismatch" },
            );
            await sendBotMessage(
              chatId,
              `شماره ارسال‌شده با شماره ثبت‌شده در فروشگاه همخوانی ندارد.
  برای تأیید، کد پیامکی به شماره ${expected} ارسال می‌شود.`,
            );
            // fall-through to OTP flow but force OTP target to expected phone
            // (we keep "phone" as the contact phone for logging, but OTP should go to expected)
            // We'll overwrite below before sending.
          }
        }
        if (customerCandidate?.id) {
          const otpTarget =
            typeof pendingToken !== "undefined" &&
            pendingToken?.id &&
            pendingToken?.expected_phone &&
            normalizeIranPhone(String(pendingToken.expected_phone)) &&
            normalizeIranPhone(String(pendingToken.expected_phone)) !== phone
              ? normalizeIranPhone(String(pendingToken.expected_phone))
              : phone;
          const otp = generateOtp();
          const ttlMin = await getOtpTtlMinutes();
          const expiresAt = moment().add(ttlMin, "minutes").toISOString();
          const codeHash = hashOtp(otp);
          await upsertTelegramLinkRequest({
            phone: otpTarget,
            chatId,
            telegramUserId: fromId,
            codeHash,
            expiresAtISO: expiresAt,
          });
          const sms = await sendOtpSms(otpTarget, otp);
          if (!sms?.success) {
            await sendBotMessage(
              chatId,
              `ارسال پیامک تأیید با خطا در عملیات مواجه شد.
  ${sms?.message || ""}

  اگر پیامک دریافت نشد، با فروشگاه تماس بگیرید.`,
            );
            return;
          }
          await sendBotMessage(
            chatId,
            `کد تأیید برای شماره ${otpTarget} ارسال شد.
  لطفاً کد ۶ رقمی را همین‌جا ارسال کنید.
  (اعتبار: ${ttlMin} دقیقه)`,
          );
          return;
        }
        await sendBotMessage(
          chatId,
          telegramCard(
            "دسترسی فعال نشد",
            "🔒",
            [
              "این شماره موبایل در پرونده مشتریان یا همکاران فروشگاه ثبت نشده است.",
            ],
            "برای فعال‌سازی دستیار، شماره شما باید قبلاً در سیستم فروشگاه ثبت شده باشد.",
          ),
          { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
        );
        return;
      }
      // OTP verification message (digits only)
      if (/^\d{4,8}$/.test(msgText)) {
        const pending = await getPendingTelegramLinkRequestByChatId(chatId);
        if (!pending) {
          await sendBotMessage(
            chatId,
            "درخواست فعالی برای ورود پیدا نشد. لطفاً از منوی شروع دوباره استفاده کنید.",
          );
          return;
        }
        if (pending.telegram_user_id !== fromId) {
          await sendBotMessage(
            chatId,
            "این کد برای حساب دیگری صادر شده است. لطفاً ورود را دوباره شروع کنید.",
          );
          return;
        }
        if (pending.attempts >= TG_OTP_MAX_ATTEMPTS) {
          await sendBotMessage(
            chatId,
            "تعداد تلاش‌ها بیش از حد مجاز شد. لطفاً چند دقیقه بعد دوباره ورود را شروع کنید.",
          );
          return;
        }
        const ok = hashOtp(msgText) === String(pending.code_hash || "");
        if (!ok) {
          await bumpTelegramLinkRequestAttempt(pending.id, "Invalid OTP");
          await sendBotMessage(
            chatId,
            "کد واردشده صحیح نیست. لطفاً دوباره تلاش کنید.",
          );
          return;
        }
        const linked = await linkCustomerTelegramIdentityByPhone(pending.phone, fromId, chatId);
        if (!linked.ok) {
          await bumpTelegramLinkRequestAttempt(pending.id, "Customer not found");
          await sendBotMessage(
            chatId,
            "شماره شما در سیستم مشتریان پیدا نشد.\nلطفاً ابتدا در فروشگاه به‌عنوان مشتری ثبت شوید و دوباره /start کنید.",
          );
          return;
        }
        await markTelegramLinkRequestVerified(pending.id);
        // If this OTP was triggered from a QR token flow, mark that token as used.
        try {
          const t = await getPendingTelegramLinkTokenByChatId(chatId);
          if (t?.id)
            await markTelegramLinkTokenStatus(Number(t.id), "used", {
              chatId,
              telegramUserId: fromId,
            });
        } catch {}
        await sendBotMessage(
          chatId,
          telegramCard(
            "ورود امن تکمیل شد",
            "✅",
            ["حساب تلگرام شما با موفقیت به پرونده فروشگاه متصل شد."],
            "از پنل پایین، گزارش‌های مالی و پیگیری‌های خود را مشاهده کنید.",
          ),
          { reply_markup: buildMainReplyKeyboard(), parse_mode: "HTML" },
        );
        // Show main menu right away
        const customer = await getLinkedCustomer();
        await showMainMenu(customer);
        return;
      }
    } catch (e: any) {
      try {
        console.error("[TelegramBot] handler failed:", e?.message || e);
      } catch {}
      // never crash bot handler
    }
  };

  return handleTelegramUpdate;
};
