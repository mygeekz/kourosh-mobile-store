import type { Express } from "express";
import fs from "fs";
import path, { join } from "path";
import type { ChangePasswordPayload } from "../../types";
import {
  addAuditLog,
  changePasswordInDb,
  findUserByUsername,
  getAsync,
  getDbInstance,
  runAsync,
  upgradeLegacyPasswordHashInDb,
  updateAvatarPathInDb,
  updateUserInDb,
} from "../database";
import { isInitialSetupRequired } from "../auth/initialSetup";
import { registerLoginRoutes } from "./login.routes";
import type { ActiveSession, SessionUserSnapshot } from "../utils/sessionAuth";
import { resolvePublicAvatarUrl } from "../utils/avatarAssets";
import {
  createStagedUpload,
  finalizeStagedUpload,
  removeStagedUpload,
  SafeUploadError,
  type FinalizedUpload,
} from "../upload";


export interface PublicAuthRouteDeps {
  activeSessions: Record<string, ActiveSession>;
  generateToken: () => string;
  sessionDurationMs: number;
}

export interface ProtectedAuthRouteDeps {
  activeSessions: Record<string, ActiveSession>;
  avatarsDir: string;
  revokeSession: (token: string | null | undefined) => boolean;
  revokeUserSessions: (userId: number, exceptToken?: string | null) => number;
  synchronizeSession: (
    token: string | null | undefined,
    user: SessionUserSnapshot,
  ) => boolean;
}

type AuthProfileRow = {
  id: number;
  username: string;
  roleName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateAdded: string;
  lastLoginAt?: string | null;
  avatarPath?: string | null;
};

type AvatarPathRow = { avatarPath?: string | null };

const getBearerToken = (authorization: unknown): string | null => {
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

export const registerPublicAuthRoutes = (
  app: Express,
  deps: PublicAuthRouteDeps,
): void => {
  registerLoginRoutes(app, {
    ...deps,
    ensureDatabase: getDbInstance,
    isInitialSetupRequired,
    findUserByUsername,
    upgradeLegacyPasswordHash: upgradeLegacyPasswordHashInDb,
    markSuccessfulLogin: (userId) =>
      runAsync(
        "UPDATE users SET lastLoginAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') WHERE id = ?",
        [userId],
      ),
    addAuditLog: (userId, username, roleName, action, entityType, entityId, description) =>
      addAuditLog(
        userId,
        username,
        roleName,
        action,
        entityType,
        entityId,
        description,
      ),
  });
};

export const registerProtectedAuthRoutes = (
  app: Express,
  deps: ProtectedAuthRouteDeps,
): void => {
  app.post("/api/logout", (req, res) => {
    deps.revokeSession(getBearerToken(req.headers.authorization));
    res.json({ success: true, message: "خروج با موفقیت انجام شد." });
  });

  app.get("/api/me", async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      if (!req.user)
        return res.status(401).json({
          success: false,
          code: "AUTH_REQUIRED",
          message: "برای ادامه وارد حساب کاربری شوید.",
        });
      const token = getBearerToken(req.headers.authorization);
      const row = (await getAsync(
        `SELECT u.id, u.username, u.firstName, u.lastName, u.dateAdded, u.lastLoginAt, u.avatarPath, r.name as roleName
        FROM users u
        LEFT JOIN roles r ON r.id = u.roleId
        WHERE u.id = ?`,
        [req.user.id],
      )) as AuthProfileRow | undefined;
      if (!row) {
        deps.revokeSession(token);
        return res.status(401).json({
          success: false,
          code: "AUTH_SESSION_USER_MISSING",
          message: "حساب این نشست دیگر در دسترس نیست. دوباره وارد شوید.",
        });
      }
      const user = {
        id: row.id,
        username: row.username,
        roleName: row.roleName || req.user.roleName,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        lastLogin: row.lastLoginAt ?? null,
        dateAdded: row.dateAdded,
        avatarUrl: resolvePublicAvatarUrl(row.avatarPath),
      };
      deps.synchronizeSession(token, {
        userId: user.id,
        username: user.username,
        roleName: user.roleName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      });
      return res.json({
        success: true,
        user,
      });
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/me/profile", async (req, res, next) => {
    try {
      if (!req.user)
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated" });
      const firstName =
        typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
      const lastName =
        typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
      if (firstName.length > 80 || lastName.length > 80) {
        return res.status(400).json({
          success: false,
          message: "نام و نام خانوادگی هرکدام باید حداکثر ۸۰ کاراکتر باشند.",
        });
      }
      const updated = await updateUserInDb(req.user.id, {
        firstName: firstName || null,
        lastName: lastName || null,
      });
      const token = getBearerToken(req.headers.authorization);
      deps.synchronizeSession(token, {
        userId: updated.id,
        username: updated.username,
        roleName: updated.roleName,
        firstName: updated.firstName ?? null,
        lastName: updated.lastName ?? null,
        avatarUrl: resolvePublicAvatarUrl(updated.avatarPath),
      });
      return res.json({
        success: true,
        message: "اطلاعات پروفایل ذخیره شد.",
        user: {
          id: updated.id,
          username: updated.username,
          roleName: updated.roleName,
          firstName: updated.firstName ?? null,
          lastName: updated.lastName ?? null,
          lastLogin: updated.lastLoginAt ?? null,
          dateAdded: updated.dateAdded,
          avatarUrl: resolvePublicAvatarUrl(updated.avatarPath),
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/me/change-password", async (req, res, next) => {
    try {
      if (!req.user)
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated" });
      const body = req.body as Partial<ChangePasswordPayload> | null | undefined;
      const oldPassword =
        typeof body?.oldPassword === "string" ? body.oldPassword : "";
      const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "اطلاعات ارائه‌شده برای تغییر رمز عبور نامعتبر است.",
        });
      }
      await changePasswordInDb(req.user.id, { oldPassword, newPassword });
      deps.revokeUserSessions(
        req.user.id,
        getBearerToken(req.headers.authorization),
      );
      res.json({ success: true, message: "کلمه عبور با موفقیت تغییر کرد." });
    } catch (e) {
      next(e);
    }
  });

  const avatarUpload = createStagedUpload(2 * 1024 * 1024);

  app.post(
    "/api/me/upload-avatar",
    avatarUpload.single("avatar"),
    async (req, res, next) => {
      let finalized: FinalizedUpload | null = null;
      try {
        if (!req.file)
          return res.status(400).json({
            success: false,
            message: "هیچ فایلی برای آپلود انتخاب نشده است.",
          });
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthenticated" });
        finalized = await finalizeStagedUpload(req.file, {
          destinationDir: deps.avatarsDir,
          prefix: `avatar-${req.user.id}`,
          allowedKinds: ["jpeg", "png", "webp"],
          publicAsset: true,
        });
        const existed = (await getAsync(
          "SELECT avatarPath FROM users WHERE id = ?",
          [req.user.id],
        )) as AvatarPathRow | undefined;
        const updated = await updateAvatarPathInDb(
          req.user.id,
          finalized.filename,
        );
        const previousAvatar = path.basename(String(existed?.avatarPath || ""));
        if (previousAvatar && previousAvatar !== finalized.filename && /^avatar-[a-z0-9-]+\.(?:jpe?g|png|gif|webp)$/i.test(previousAvatar)) {
          fs.unlink(join(deps.avatarsDir, previousAvatar), () => {});
        }
        const token = getBearerToken(req.headers.authorization);
        deps.synchronizeSession(token, {
          userId: updated.id,
          username: updated.username,
          roleName: updated.roleName,
          firstName: updated.firstName ?? null,
          lastName: updated.lastName ?? null,
          avatarUrl: resolvePublicAvatarUrl(updated.avatarPath),
        });
        res.json({
          success: true,
          message: "آواتار با موفقیت آپلود شد.",
          data: { avatarUrl: resolvePublicAvatarUrl(updated.avatarPath) },
        });
      } catch (e) {
        if (finalized?.absolutePath) await removeStagedUpload(finalized.absolutePath);
        if (e instanceof SafeUploadError) {
          return res.status(e.statusCode).json({
            success: false,
            message: "محتوای فایل آواتار معتبر نیست. فقط JPEG، PNG و WebP مجاز است.",
          });
        }
        next(e);
      }
    },
  );

  app.delete("/api/me/avatar", async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated" });
      }

      const existed = (await getAsync(
        "SELECT avatarPath FROM users WHERE id = ?",
        [req.user.id],
      )) as AvatarPathRow | undefined;
      const previousAvatar = path.basename(String(existed?.avatarPath || ""));
      const updated = await updateAvatarPathInDb(req.user.id, null);
      const token = getBearerToken(req.headers.authorization);

      deps.synchronizeSession(token, {
        userId: updated.id,
        username: updated.username,
        roleName: updated.roleName,
        firstName: updated.firstName ?? null,
        lastName: updated.lastName ?? null,
        avatarUrl: null,
      });

      if (
        previousAvatar &&
        /^avatar-[a-z0-9-]+\.(?:jpe?g|png|gif|webp)$/i.test(previousAvatar)
      ) {
        fs.unlink(join(deps.avatarsDir, previousAvatar), () => {});
      }

      return res.json({
        success: true,
        message: "تصویر پروفایل حذف شد.",
        data: { avatarUrl: null },
      });
    } catch (e) {
      next(e);
    }
  });
};
