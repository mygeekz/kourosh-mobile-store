import type { Express } from "express";
import {
  allAsync,
  getAllSettingsAsObject,
  getAsync,
  normalizeIranPhone,
  updateSetting,
} from "../database";
import {
  callTelegramBotApi,
  getTelegramBotInfo,
  setTelegramProxy,
} from "../telegramService";

type AuthorizeRole = (roles: string[]) => any;

type RegisterTelegramAdminDeps = {
  authorizeRole: AuthorizeRole;
  getPollingState: () => {
    started: boolean;
    offset: number | null;
    inFlight?: boolean;
    generation?: number;
    consecutiveFailures?: number;
    nextRetryDelayMs?: number;
    lastSuccessAt?: string | null;
    lastErrorAt?: string | null;
    lastErrorMessage?: string;
  };
  resetPollingStarted: () => void;
  startTelegramPolling: () => Promise<void>;
  resetTelegramCommandMenu: (botToken: string) => Promise<any>;
  ensureTelegramPersistentMenu: () => Promise<any>;
  sendBotMessage: (chatId: string, text: string, extra?: any) => Promise<any>;
  telegramCard: (
    title: string,
    icon: string,
    lines: string[],
    footer?: string,
  ) => string;
  buildContactKeyboard: () => any;
  handleTelegramUpdate: (update: any) => Promise<void>;
};

export const registerTelegramAdminRoutes = (
  app: Express,
  {
    authorizeRole,
    getPollingState,
    resetPollingStarted,
    startTelegramPolling,
    resetTelegramCommandMenu,
    ensureTelegramPersistentMenu,
    sendBotMessage,
    telegramCard,
    buildContactKeyboard,
    handleTelegramUpdate,
  }: RegisterTelegramAdminDeps,
): void => {
  // Admin debug endpoints (optional but helpful)
  app.get(
    "/api/telegram/debug/status",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(
          (settings as any).telegram_bot_token || "",
        ).trim();
        if (!botToken)
          return res.status(400).json({
            success: false,
            message: "telegram_bot_token تنظیم نشده است.",
          });

        const [me, webhook, commandsDefault, commandsFa, commandsEn, menuButton] =
          await Promise.allSettled([
            getTelegramBotInfo(botToken),
            callTelegramBotApi(botToken, "getWebhookInfo", {}),
            callTelegramBotApi(botToken, "getMyCommands", {
              scope: { type: "default" },
            }),
            callTelegramBotApi(botToken, "getMyCommands", {
              scope: { type: "default" },
              language_code: "fa",
            }),
            callTelegramBotApi(botToken, "getMyCommands", {
              scope: { type: "default" },
              language_code: "en",
            }),
            callTelegramBotApi(botToken, "getChatMenuButton", {}),
          ]);

        const unwrap = (x: PromiseSettledResult<any>) =>
          x.status === "fulfilled"
            ? x.value
            : {
                success: false,
                message: String(
                  (x as any).reason?.message || (x as any).reason || "failed",
                ),
              };
        const pollingState = getPollingState();
        res.json({
          success: true,
          data: {
            bot: unwrap(me),
            webhook: unwrap(webhook),
            commandsDefault: unwrap(commandsDefault),
            commandsFa: unwrap(commandsFa),
            commandsEn: unwrap(commandsEn),
            menuButton: unwrap(menuButton),
            local: {
              updateMode: String((settings as any).telegram_update_mode || ""),
              pollingEnabled: String(
                (settings as any).telegram_polling_enabled || "",
              ),
              pollingStarted: pollingState.started,
              pollingOffset: pollingState.offset,
              pollingInFlight: Boolean(pollingState.inFlight),
              pollingGeneration: Number(pollingState.generation || 0),
              pollingConsecutiveFailures: Number(pollingState.consecutiveFailures || 0),
              pollingNextRetryDelayMs: Number(pollingState.nextRetryDelayMs || 0),
              pollingLastSuccessAt: pollingState.lastSuccessAt || null,
              pollingLastErrorAt: pollingState.lastErrorAt || null,
              pollingLastErrorMessage: String(pollingState.lastErrorMessage || ""),
              lastWebhookAt: String(
                (settings as any).telegram_last_webhook_at || "",
              ),
            },
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/reset-bot-menu",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(
          (settings as any).telegram_bot_token || "",
        ).trim();
        if (!botToken)
          return res.status(400).json({
            success: false,
            message: "telegram_bot_token تنظیم نشده است.",
          });
        const resetResults = await resetTelegramCommandMenu(botToken);
        res.json({
          success: true,
          message:
            "منوی دستوری تلگرام پاک شد. حالا /start یا /restart را داخل ربات بزنید تا Reply Keyboard واقعی ساخته شود.",
          data: { resetResults },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/enable-polling",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(
          (settings as any).telegram_bot_token || "",
        ).trim();
        if (!botToken)
          return res.status(400).json({
            success: false,
            message: "telegram_bot_token تنظیم نشده است.",
          });

        const deleteWebhook = await callTelegramBotApi(
          botToken,
          "deleteWebhook",
          { drop_pending_updates: false },
        );
        await updateSetting("telegram_update_mode", "polling");
        await updateSetting("telegram_polling_enabled", "1");
        const resetResults = await resetTelegramCommandMenu(botToken);
        resetPollingStarted();
        await startTelegramPolling();

        res.json({
          success: true,
          message:
            "Polling فعال شد و webhook غیرفعال شد. حالا داخل تلگرام /start را بزنید.",
          data: {
            deleteWebhook,
            resetResults,
            pollingStarted: getPollingState().started,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/send-guest-menu-test",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const chatId = String(req.body?.chatId || req.query?.chatId || "").trim();
        if (!chatId)
          return res
            .status(400)
            .json({ success: false, message: "chatId الزامی است." });
        await ensureTelegramPersistentMenu().catch(() => {});
        await sendBotMessage(
          chatId,
          telegramCard(
            "پیش‌نمایش پنل تلگرام",
            "✨",
            ["پنل تلگرام با دکمه‌های پایین چت برای این کاربر ارسال شد."],
            "برای ورود امن، دکمه «📲 اتصال امن با شماره موبایل» را لمس کنید.",
          ),
          { reply_markup: buildContactKeyboard(), parse_mode: "HTML" },
        );
        res.json({ success: true, message: "پیش‌نمایش پنل تلگرام ارسال شد." });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/send-real-menu",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const chatId = String(req.body?.chatId || req.query?.chatId || "").trim();
        if (!chatId)
          return res
            .status(400)
            .json({ success: false, message: "chatId الزامی است." });
        const identities = await allAsync(
          `SELECT telegram_user_id AS user_id FROM customers
             WHERE COALESCE(telegram_chat_id,telegramChatId)=? AND NULLIF(TRIM(COALESCE(telegram_user_id,'')),'') IS NOT NULL
           UNION ALL
           SELECT telegram_user_id AS user_id FROM partners
             WHERE COALESCE(telegram_chat_id,telegramChatId)=? AND NULLIF(TRIM(COALESCE(telegram_user_id,'')),'') IS NOT NULL`,
          [chatId, chatId],
        );
        if (identities.length !== 1)
          return res.status(409).json({
            success: false,
            message: "برای ارسال منوی واقعی، دقیقاً یک هویت امن با این مقصد ارسال لازم است.",
          });
        const verifiedUserId = String((identities[0] as any).user_id || "").trim();
        await ensureTelegramPersistentMenu().catch(() => {});
        await handleTelegramUpdate({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            chat: { id: chatId, type: "private" },
            from: { id: verifiedUserId, is_bot: false },
            text: "/menu",
            date: Math.floor(Date.now() / 1000),
          },
        });
        res.json({
          success: true,
          message: "منوی واقعی به مقصد ارسال دارای هویت امن فرستاده شد.",
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/send-customer-menu",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const chatId = String(req.body?.chatId || req.query?.chatId || "").trim();
        const customerIdRaw = String(
          req.body?.customerId || req.query?.customerId || "",
        ).trim();
        const phoneRaw = String(req.body?.phone || req.query?.phone || "").trim();
        if (!chatId)
          return res
            .status(400)
            .json({ success: false, message: "Chat ID الزامی است." });
        let customer: any = null;
        if (customerIdRaw) {
          customer = await getAsync(
            `SELECT id,fullName,phoneNumber,telegram_user_id,COALESCE(telegram_chat_id,telegramChatId) AS delivery_chat_id FROM customers WHERE id=? LIMIT 1`,
            [Number(customerIdRaw)],
          );
        } else if (phoneRaw) {
          const normalizedPhone = normalizeIranPhone(phoneRaw);
          const rows = await allAsync(
            `SELECT id,fullName,phoneNumber,telegram_user_id,COALESCE(telegram_chat_id,telegramChatId) AS delivery_chat_id FROM customers WHERE COALESCE(phoneNumber,'') != ''`,
          ).catch(() => [] as any[]);
          const matches = (rows || []).filter(
            (r: any) =>
              normalizeIranPhone(String(r?.phoneNumber || "")) ===
              normalizedPhone,
          );
          if (matches.length > 1)
            return res.status(409).json({ success: false, message: "این شماره به بیش از یک پرونده مشتری مرتبط است؛ شناسه پرونده را مشخص کنید." });
          customer = matches[0] || null;
        }
        if (!customer?.id)
          return res.status(404).json({
            success: false,
            message: "مشتری با این شماره موبایل/شناسه پیدا نشد.",
          });
        const verifiedUserId = String(customer.telegram_user_id || "").trim();
        const deliveryChatId = String(customer.delivery_chat_id || "").trim();
        if (!verifiedUserId || !deliveryChatId) return res.status(409).json({ success: false, message: "ابتدا اتصال امن مشتری انجام شود." });
        if (chatId !== deliveryChatId) return res.status(409).json({ success: false, message: "Chat ID دستی با مقصد ارسال تأییدشده مطابقت ندارد." });

        await ensureTelegramPersistentMenu().catch(() => {});
        await handleTelegramUpdate({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            chat: { id: chatId, type: "private" },
            from: { id: verifiedUserId, is_bot: false },
            text: "/menu",
            date: Math.floor(Date.now() / 1000),
          },
        });

        res.json({
          success: true,
          message: `منوی مشتری برای ${customer.fullName || "مشتری"} به مقصد ارسال تأییدشده فرستاده شد.`,
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/telegram/admin/send-partner-menu",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const chatId = String(req.body?.chatId || req.query?.chatId || "").trim();
        const partnerIdRaw = String(
          req.body?.partnerId || req.query?.partnerId || "",
        ).trim();
        const phoneRaw = String(req.body?.phone || req.query?.phone || "").trim();
        if (!chatId)
          return res
            .status(400)
            .json({ success: false, message: "Chat ID الزامی است." });
        let partner: any = null;
        if (partnerIdRaw) {
          partner = await getAsync(
            `SELECT id,partnerName,phoneNumber,telegram_user_id,COALESCE(telegram_chat_id,telegramChatId) AS delivery_chat_id FROM partners WHERE id=? LIMIT 1`,
            [Number(partnerIdRaw)],
          );
        } else if (phoneRaw) {
          const normalizedPhone = normalizeIranPhone(phoneRaw);
          const rows = await allAsync(
            `SELECT id,partnerName,phoneNumber,telegram_user_id,COALESCE(telegram_chat_id,telegramChatId) AS delivery_chat_id FROM partners WHERE COALESCE(phoneNumber,'') != ''`,
          ).catch(() => [] as any[]);
          const matches = (rows || []).filter(
            (r: any) =>
              normalizeIranPhone(String(r?.phoneNumber || "")) ===
              normalizedPhone,
          );
          if (matches.length > 1)
            return res.status(409).json({ success: false, message: "این شماره به بیش از یک پرونده همکار مرتبط است؛ شناسه پرونده را مشخص کنید." });
          partner = matches[0] || null;
        }
        if (!partner?.id)
          return res.status(404).json({
            success: false,
            message: "همکار با این شماره موبایل/شناسه پیدا نشد.",
          });
        const verifiedUserId = String(partner.telegram_user_id || "").trim();
        const deliveryChatId = String(partner.delivery_chat_id || "").trim();
        if (!verifiedUserId || !deliveryChatId) return res.status(409).json({ success: false, message: "ابتدا لینک امن Partner صادر و تأیید شود." });
        if (chatId !== deliveryChatId) return res.status(409).json({ success: false, message: "Chat ID دستی با مقصد ارسال تأییدشده مطابقت ندارد." });

        await ensureTelegramPersistentMenu().catch(() => {});
        await handleTelegramUpdate({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            chat: { id: chatId, type: "private" },
            from: { id: verifiedUserId, is_bot: false },
            text: "/menu",
            date: Math.floor(Date.now() / 1000),
          },
        });

        res.json({
          success: true,
          message: `منوی همکار برای ${partner.partnerName || "همکار"} به مقصد ارسال تأییدشده فرستاده شد.`,
        });
      } catch (e) {
        next(e);
      }
    },
  );

};
