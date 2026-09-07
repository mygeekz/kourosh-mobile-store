import type { Express, RequestHandler, Response } from "express";
import { allAsync, createTelegramLinkToken, getAllSettingsAsObject, getAsync, updateSetting } from "../database";
import { getTelegramBotInfo } from "../telegramService";
import { getBearerToken, requireAuth, revokeSession } from "../utils/sessionAuth";
import { revokeMiniAppStaffSessions } from "../miniapp/miniAppSession";
import { requireManagementPermission } from "../security/managementAuthorization";
import { createManagementRateLimiter } from "../middleware/managementRateLimiter";
import {
  getStaffTelegramStatus,
  listTelegramManagers,
  getTelegramBotUsername,
  issuePartnerTelegramLink,
  issuePartnerTelegramRelink,
  issueStaffTelegramLink,
  revokeManagerTelegramBinding,
  revokeStaffTelegramBinding,
  sendStaffTelegramTestMessage,
  unlinkStaffTelegram,
} from "../services/telegramIdentitySecurity.service";

type AuthorizeRole = (roles: string[]) => RequestHandler;
type RegisterTelegramLinkingDeps = { authorizeRole: AuthorizeRole };
const roles = ["Admin", "Manager"];
const noStore = (res: Response): void => { res.setHeader("Cache-Control", "no-store"); res.setHeader("Pragma", "no-cache"); };
const requireFreshStaffRole: RequestHandler = async (req, res, next) => {
  try {
    const row: any = await getAsync("SELECT r.name AS roleName FROM users u JOIN roles r ON r.id=u.roleId WHERE u.id=? LIMIT 1", [req.user?.id]);
    if (!req.user || !roles.includes(String(row?.roleName || ""))) {
      revokeSession(getBearerToken(req));
      if (req.user?.id) revokeMiniAppStaffSessions(req.user.id);
      return res.status(403).json({ success: false, message: "دسترسی سازمانی فعلی معتبر نیست." });
    }
    req.user.roleName = row.roleName;
    return next();
  } catch (error) { return next(error); }
};

export const registerTelegramLinkingRoutes = (app: Express, { authorizeRole }: RegisterTelegramLinkingDeps): void => {
  app.post("/api/telegram/partner-link-token", requireAuth, authorizeRole(roles), requireFreshStaffRole, async (req, res, next) => {
    noStore(res);
    try {
      const partnerId = Number(req.body?.partnerId || 0);
      if (!Number.isInteger(partnerId) || partnerId <= 0) return res.status(400).json({ success: false, message: "شناسه همکار معتبر نیست." });
      const created = await issuePartnerTelegramLink(partnerId, req.user!, req.body?.expiresMinutes);
      if (!created) return res.status(404).json({ success: false, message: "همکار پیدا نشد." });
      const botUsername = await getTelegramBotUsername();
      const deepLink = `https://t.me/${botUsername}?start=plink_${created.token}`;
      return res.json({ success: true, data: { partnerName: created.partnerName, botUsername, deepLink, qrData: deepLink, expiresAt: created.expiresAt, linked: created.linked } });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_BOT_USERNAME_MISSING") return res.status(400).json({ success: false, message: "نام کاربری ربات تلگرام ثبت نشده است." });
      if (error?.message === "TELEGRAM_PARTNER_ALREADY_LINKED") return res.status(409).json({ success: false, code: "PARTNER_TELEGRAM_ALREADY_LINKED", message: "این همکار قبلاً به تلگرام متصل است. برای تغییر حساب تلگرام از «اتصال مجدد امن» استفاده کنید." });
      return next(error);
    }
  });

  app.post("/api/telegram/partner-relink-token", requireAuth, authorizeRole(roles), requireFreshStaffRole, async (req, res, next) => {
    noStore(res);
    try {
      const partnerId = Number(req.body?.partnerId || 0);
      if (!Number.isInteger(partnerId) || partnerId <= 0) return res.status(400).json({ success: false, message: "شناسه همکار معتبر نیست." });
      const created = await issuePartnerTelegramRelink(partnerId, req.user!, req.body?.expiresMinutes);
      if (!created) return res.status(404).json({ success: false, message: "همکار پیدا نشد." });
      const botUsername = await getTelegramBotUsername();
      const deepLink = `https://t.me/${botUsername}?start=plink_${created.token}`;
      return res.json({ success: true, data: { partnerName: created.partnerName, botUsername, deepLink, qrData: deepLink, expiresAt: created.expiresAt, linked: true, rebind: true } });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_BOT_USERNAME_MISSING") return res.status(400).json({ success: false, message: "نام کاربری ربات تلگرام ثبت نشده است." });
      if (error?.message === "TELEGRAM_PARTNER_NOT_LINKED") return res.status(409).json({ success: false, code: "PARTNER_TELEGRAM_NOT_LINKED", message: "این همکار اتصال فعال ندارد؛ از اتصال عادی تلگرام استفاده کنید." });
      return next(error);
    }
  });

  app.get("/api/telegram/staff-link", requireAuth, authorizeRole(roles), requireFreshStaffRole, async (req, res, next) => {
    noStore(res);
    try { return res.json({ success: true, data: await getStaffTelegramStatus(req.user!.id) }); } catch (error) { return next(error); }
  });

  app.post("/api/telegram/staff-link-token", requireAuth, authorizeRole(roles), requireFreshStaffRole, async (req, res, next) => {
    noStore(res);
    try {
      // Self-link only: the subject always comes from the authenticated session.
      const created = await issueStaffTelegramLink(req.user!.id, req.user!);
      if (!created) return res.status(403).json({ success: false, message: "دسترسی سازمانی فعلی معتبر نیست." });
      const botUsername = await getTelegramBotUsername();
      const deepLink = `https://t.me/${botUsername}?start=staff_${created.token}`;
      return res.json({ success: true, data: { state: "pending", roleName: created.roleName, botUsername, deepLink, qrData: deepLink, expiresAt: created.expiresAt } });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_BOT_USERNAME_MISSING") return res.status(400).json({ success: false, message: "نام کاربری ربات تلگرام ثبت نشده است." });
      return next(error);
    }
  });

  app.delete("/api/telegram/staff-link", requireAuth, authorizeRole(roles), requireFreshStaffRole, async (req, res, next) => {
    noStore(res);
    try { await unlinkStaffTelegram(req.user!.id, req.user!); return res.json({ success: true, data: { state: "not_linked" } }); } catch (error) { return next(error); }
  });

  const parseManagerUserId = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const managerReadLimiter = createManagementRateLimiter({ scope: "telegram-manager-read", windowMs: 60_000, maxRequests: 120 });
  const managerWriteLimiter = createManagementRateLimiter({ scope: "telegram-manager-write", windowMs: 60_000, maxRequests: 20 });
  const managerBindingGuard = [requireAuth, requireManagementPermission("managers.manage"), managerReadLimiter] as const;
  const managerBindingWriteGuard = [requireAuth, requireManagementPermission("managers.manage"), managerWriteLimiter] as const;

  app.get("/api/telegram/managers", ...managerBindingGuard, async (_req, res, next) => {
    noStore(res);
    try {
      return res.json({ success: true, data: await listTelegramManagers() });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/telegram/managers/:userId", ...managerBindingGuard, async (req, res, next) => {
    noStore(res);
    try {
      const userId = parseManagerUserId(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه مدیر معتبر نیست." });
      const manager = (await listTelegramManagers()).find((item) => item.userId === userId);
      if (!manager) return res.status(404).json({ success: false, message: "کاربر دارای دسترسی مدیریتی پیدا نشد." });
      return res.json({ success: true, data: manager });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/telegram/managers/:userId/link-token", ...managerBindingWriteGuard, async (req, res, next) => {
    noStore(res);
    try {
      const userId = parseManagerUserId(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه مدیر معتبر نیست." });
      const created = await issueStaffTelegramLink(userId, req.user!);
      if (!created) return res.status(403).json({ success: false, code: "MANAGER_ACCESS_REQUIRED", message: "این کاربر دسترسی مدیریتی فعال ندارد." });
      const botUsername = await getTelegramBotUsername();
      const deepLink = `https://t.me/${botUsername}?start=staff_${created.token}`;
      return res.json({
        success: true,
        data: {
          userId,
          displayName: created.displayName,
          roleName: created.roleName,
          permissions: created.permissions,
          state: "pending",
          botUsername,
          deepLink,
          qrData: deepLink,
          expiresAt: created.expiresAt,
        },
      });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_BOT_USERNAME_MISSING") return res.status(400).json({ success: false, message: "نام کاربری ربات تلگرام ثبت نشده است." });
      return next(error);
    }
  });

  app.post("/api/telegram/managers/:userId/relink-token", ...managerBindingWriteGuard, async (req, res, next) => {
    noStore(res);
    try {
      const userId = parseManagerUserId(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه مدیر معتبر نیست." });
      await revokeManagerTelegramBinding(userId, req.user!);
      const created = await issueStaffTelegramLink(userId, req.user!);
      if (!created) return res.status(403).json({ success: false, code: "MANAGER_ACCESS_REQUIRED", message: "این کاربر دسترسی مدیریتی فعال ندارد." });
      const botUsername = await getTelegramBotUsername();
      const deepLink = `https://t.me/${botUsername}?start=staff_${created.token}`;
      return res.json({ success: true, data: { userId, displayName: created.displayName, state: "pending", botUsername, deepLink, qrData: deepLink, expiresAt: created.expiresAt } });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_BOT_USERNAME_MISSING") return res.status(400).json({ success: false, message: "نام کاربری ربات تلگرام ثبت نشده است." });
      if (error?.message === "TELEGRAM_MANAGER_ACCESS_REVOKED") return res.status(404).json({ success: false, code: "MANAGER_ACCESS_REQUIRED", message: "کاربر دارای دسترسی مدیریتی فعال در این فروشگاه پیدا نشد." });
      return next(error);
    }
  });

  app.delete("/api/telegram/managers/:userId/link", ...managerBindingWriteGuard, async (req, res, next) => {
    noStore(res);
    try {
      const userId = parseManagerUserId(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه مدیر معتبر نیست." });
      const manager = (await listTelegramManagers()).find((item) => item.userId === userId);
      if (!manager) return res.status(404).json({ success: false, message: "کاربر دارای دسترسی مدیریتی پیدا نشد." });
      const result = await revokeManagerTelegramBinding(userId, req.user!);
      return res.json({ success: true, data: { state: "not_linked", ...result } });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_MANAGER_ACCESS_REVOKED") return res.status(404).json({ success: false, code: "MANAGER_ACCESS_REQUIRED", message: "کاربر دارای دسترسی مدیریتی فعال در این فروشگاه پیدا نشد." });
      return next(error);
    }
  });

  app.post("/api/telegram/managers/:userId/test-message", ...managerBindingWriteGuard, async (req, res, next) => {
    noStore(res);
    try {
      const userId = parseManagerUserId(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه مدیر معتبر نیست." });
      const data = await sendStaffTelegramTestMessage(userId, req.user!);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === "TELEGRAM_MANAGER_USER_NOT_FOUND") return res.status(404).json({ success: false, message: "کاربر پیدا نشد." });
      if (error?.message === "TELEGRAM_MANAGER_ACCESS_REVOKED") return res.status(403).json({ success: false, message: "دسترسی مدیریتی این کاربر فعال نیست." });
      if (error?.message === "TELEGRAM_MANAGER_NOT_LINKED") return res.status(409).json({ success: false, message: "ابتدا اتصال تلگرام این مدیر را تکمیل کنید." });
      if (error?.message === "TELEGRAM_BOT_TOKEN_MISSING") return res.status(400).json({ success: false, message: "توکن ربات تلگرام تنظیم نشده است." });
      if (error?.message === "TELEGRAM_MANAGER_TEST_SEND_FAILED") return res.status(502).json({ success: false, message: "ارسال پیام آزمایشی به تلگرام انجام نشد. وضعیت اتصال و ربات را بررسی کنید." });
      return next(error);
    }
  });

  // Existing customer QR flow remains unchanged.
  app.post("/api/telegram/link-token", authorizeRole(roles), async (req, res, next) => {
    try {
      const customerId = Number(req.body?.customerId || 0);
      if (!customerId) return res.status(400).json({ success: false, message: "customerId الزامی است." });
      const created = await createTelegramLinkToken({ customerId, expiresMinutes: Number(req.body?.expiresMinutes ?? 60) });
      const settings = await getAllSettingsAsObject();
      let botUsername = String((settings as any).telegram_bot_username || "").trim().replace(/^@+/, "");
      const botToken = String((settings as any).telegram_bot_token || "").trim();
      if (!botUsername && botToken) {
        try { const me = await getTelegramBotInfo(botToken); botUsername = String((me as any)?.result?.username || "").trim().replace(/^@+/, ""); if (botUsername) await updateSetting("telegram_bot_username", botUsername); } catch {}
      }
      const deepLink = botUsername ? `https://t.me/${botUsername}?start=link_${created.token}` : "";
      return res.json({ success: true, data: { token: created.token, deepLink, expiresAt: created.expiresAtISO, expectedPhone: created.expectedPhone, botUsername } });
    } catch (error) { return next(error); }
  });

  app.get("/api/telegram/link-requests", authorizeRole(roles), async (_req, res, next) => {
    try {
      const rows = await allAsync(`SELECT id, phone, chat_id, telegram_user_id, expires_at, attempts, status, created_at, verified_at, last_error FROM telegram_link_requests ORDER BY id DESC LIMIT 200`, []);
      return res.json({ success: true, data: rows || [] });
    } catch (error) { return next(error); }
  });
};
