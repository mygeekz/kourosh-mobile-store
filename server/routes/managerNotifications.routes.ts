import type { Express, NextFunction, Request, Response } from "express";
import { addManagementAuditLog } from "../security/managementAudit";
import {
  listManagerNotificationPreferences,
  updateManagerNotificationPreferences,
} from "../db/domains/managerNotifications.db";
import { MANAGER_NOTIFICATION_CATALOG } from "../notifications/managerNotificationCatalog";
import { requireManagementPermission } from "../security/managementAuthorization";
import { createManagementRateLimiter } from "../middleware/managementRateLimiter";

const parseUserId = (req: Request): number => {
  const value = Number(req.params.userId || 0);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
};

const handleKnownError = (error: unknown, res: Response): Response | null => {
  const code = String((error as any)?.message || "");
  if (code === "MANAGER_NOTIFICATION_TARGET_FORBIDDEN") {
    return res.status(404).json({ success: false, code, message: "مدیر موردنظر در این فروشگاه دسترسی فعال ندارد." });
  }
  if (code === "MANAGER_NOTIFICATION_KEY_INVALID" || code === "MANAGER_NOTIFICATION_PREFERENCES_INVALID" || code === "MANAGER_NOTIFICATION_CONFIG_INVALID" || code === "MANAGER_NOTIFICATION_CONFIG_TOO_LARGE") {
    return res.status(400).json({ success: false, code, message: "تنظیمات اعلان ارسال‌شده معتبر نیست." });
  }
  return null;
};

export const registerManagerNotificationRoutes = (app: Express): void => {
  const permissionGuard = requireManagementPermission("notifications.manage");
  const readLimiter = createManagementRateLimiter({ scope: "manager-notification-read", windowMs: 60_000, maxRequests: 120 });
  const writeLimiter = createManagementRateLimiter({ scope: "manager-notification-write", windowMs: 60_000, maxRequests: 30 });
  const readGuard = [permissionGuard, readLimiter] as const;
  const writeGuard = [permissionGuard, writeLimiter] as const;

  app.get("/api/notifications/managers/catalog", ...readGuard, (_req, res) => {
    return res.json({ success: true, data: MANAGER_NOTIFICATION_CATALOG });
  });

  app.get("/api/notifications/managers/:userId/preferences", ...readGuard, async (req, res, next) => {
    try {
      const userId = parseUserId(req);
      if (!userId) return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "شناسه کاربر معتبر نیست." });
      return res.json({ success: true, data: await listManagerNotificationPreferences(userId) });
    } catch (error) {
      return handleKnownError(error, res) || next(error);
    }
  });

  app.put("/api/notifications/managers/:userId/preferences", ...writeGuard, async (req, res, next) => {
    try {
      const userId = parseUserId(req);
      if (!userId) return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "شناسه کاربر معتبر نیست." });
      const items = Array.isArray(req.body?.items) ? req.body.items : null;
      if (!items) return res.status(400).json({ success: false, code: "MANAGER_NOTIFICATION_PREFERENCES_INVALID", message: "لیست تنظیمات اعلان معتبر نیست." });
      const before = await listManagerNotificationPreferences(userId);
      const data = await updateManagerNotificationPreferences(userId, items, Number(req.user?.id || 0));
      if (req.user) {
        await addManagementAuditLog({
          actor: req.user,
          action: "MANAGER_NOTIFICATION_PREFERENCES_UPDATED",
          entityType: "manager_notification_preferences",
          entityId: userId,
          description: `به‌روزرسانی تنظیمات اعلان مدیر #${userId}`,
          source: "manager_settings",
          before: { items: before.items.map(({ key, telegramEnabled, inAppEnabled, config }) => ({ key, telegramEnabled, inAppEnabled, config })) },
          after: { items: data.items.map(({ key, telegramEnabled, inAppEnabled, config }) => ({ key, telegramEnabled, inAppEnabled, config })) },
          metadata: { changedKeys: items.map((item: any) => String(item?.key || "")).filter(Boolean) },
        }).catch(() => undefined);
      }
      return res.json({ success: true, data });
    } catch (error) {
      return handleKnownError(error, res) || next(error);
    }
  });
};
