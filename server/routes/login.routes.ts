import type { Express } from "express";

import {
  hashPasswordForStorage,
  verifyStoredPassword,
} from "../auth/passwordCompatibility";
import { createLoginRateLimiter } from "../middleware/loginRateLimiter";
import { resolvePublicAvatarUrl } from "../utils/avatarAssets";

export type LoginUser = {
  id: number;
  username: string;
  passwordHash: string;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarPath?: string | null;
  dateAdded?: string | null;
};

export type LoginActiveSession = {
  userId: number;
  username: string;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  expires: number;
};

export type LoginRouteDeps = {
  activeSessions: Record<string, LoginActiveSession>;
  generateToken: () => string;
  sessionDurationMs: number;
  ensureDatabase: () => Promise<unknown>;
  isInitialSetupRequired: () => Promise<boolean>;
  findUserByUsername: (username: string) => Promise<LoginUser | null>;
  upgradeLegacyPasswordHash: (
    userId: number,
    expectedLegacyPassword: string,
    upgradedPasswordHash: string,
  ) => Promise<boolean>;
  markSuccessfulLogin: (userId: number) => Promise<unknown>;
  addAuditLog: (
    userId: number,
    username: string,
    roleName: string,
    action: string,
    entityType: string,
    entityId: number,
    description: string,
  ) => Promise<unknown>;
};

export const registerLoginRoutes = (
  app: Express,
  deps: LoginRouteDeps,
): void => {
  const loginRateLimiter = createLoginRateLimiter();
  app.post("/api/login", loginRateLimiter, async (req, res, next) => {
    try {
      await deps.ensureDatabase();
      if (await deps.isInitialSetupRequired()) {
        return res.status(428).json({
          success: false,
          code: "SETUP_REQUIRED",
          message: "ابتدا راه‌اندازی اولیه و ساخت حساب مدیر را انجام دهید.",
        });
      }

      const rawUsername =
        req.body?.username ??
        req.body?.userName ??
        req.body?.email ??
        req.body?.user ??
        null;
      const rawPassword = req.body?.password ?? req.body?.pass ?? null;
      const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
      const password = typeof rawPassword === "string" ? rawPassword : "";
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "نام کاربری و کلمه عبور الزامی هستند.",
        });
      }

      const user = await deps.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "نام کاربری یا کلمه عبور نامعتبر است.",
        });
      }
      const passwordHash =
        typeof user.passwordHash === "string" ? user.passwordHash : "";
      if (!passwordHash) {
        console.error("[login] User record has no password/passwordHash:", {
          userId: user.id,
          username: user.username,
        });
        return res.status(500).json({
          success: false,
          message:
            "اطلاعات کاربر ناقص است. رمز عبور این کاربر را از تنظیمات کاربران بازنشانی کنید.",
        });
      }

      const passwordVerification = await verifyStoredPassword(
        password,
        passwordHash,
      );
      if (!passwordVerification.verified) {
        return res.status(401).json({
          success: false,
          message: "نام کاربری یا کلمه عبور نامعتبر است.",
        });
      }
      if (passwordVerification.needsUpgrade) {
        try {
          const upgradedHash = await hashPasswordForStorage(password);
          const upgraded = await deps.upgradeLegacyPasswordHash(
            user.id,
            passwordHash,
            upgradedHash,
          );
          if (upgraded) {
            await deps.addAuditLog(
              user.id,
              user.username,
              user.roleName,
              "password_hash_upgraded",
              "user",
              user.id,
              "Legacy password storage upgraded after successful authentication.",
            );
          }
        } catch (upgradeError) {
          console.error("[login] legacy password upgrade failed", {
            userId: user.id,
            error:
              upgradeError instanceof Error
                ? upgradeError.name
                : "UnknownUpgradeError",
          });
        }
      }

      const token = deps.generateToken();
      const avatarUrl = resolvePublicAvatarUrl(user.avatarPath);
      await deps.markSuccessfulLogin(user.id);
      deps.activeSessions[token] = {
        userId: user.id,
        username: user.username,
        roleName: user.roleName,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        avatarUrl,
        expires: Date.now() + deps.sessionDurationMs,
      };
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          roleName: user.roleName,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          lastLogin: new Date().toISOString(),
          dateAdded: user.dateAdded,
          avatarUrl,
        },
      });
    } catch (err) {
      console.error("[login] unexpected error", err);
      next(err);
    }
  });
};
