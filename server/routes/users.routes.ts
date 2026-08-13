import type { Express, RequestHandler } from "express";
import {
  addUserToDb,
  deleteUserFromDb,
  getAllRoles,
  getAllUsersWithRoles,
  resetUserPasswordInDb,
  updateUserInDb,
  type UserUpdatePayload,
} from "../database";
import { revokeMiniAppStaffSessions } from "../miniapp/miniAppSession";
import { unlinkStaffTelegram } from "../services/telegramIdentitySecurity.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type UsersRouteDeps = {
  authorizeRole: AuthorizeRole;
  revokeUserSessions: (userId: number, exceptToken?: string | null) => number;
};

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeUsername = (value: unknown): string => String(value ?? "").trim();

const validateUsername = (username: string): string | null => {
  if (!username) return "نام کاربری الزامی است.";
  if (username.length < 3 || username.length > 64) return "نام کاربری باید بین ۳ تا ۶۴ کاراکتر باشد.";
  if (/\s/.test(username)) return "نام کاربری نباید فاصله داشته باشد.";
  return null;
};

const validatePassword = (password: string): string | null => {
  if (password.length < 6) return "کلمه عبور باید حداقل ۶ کاراکتر باشد.";
  if (password.length > 128) return "کلمه عبور حداکثر می‌تواند ۱۲۸ کاراکتر باشد.";
  return null;
};

const roleExists = async (roleId: number): Promise<boolean> => {
  const roles = await getAllRoles();
  return roles.some((role) => Number(role.id) === roleId);
};

export const registerUsersRoutes = (
  app: Express,
  { authorizeRole, revokeUserSessions }: UsersRouteDeps,
): void => {
  app.get("/api/roles", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getAllRoles() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getAllUsersWithRoles() });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", authorizeRole(["Admin"]), async (req, res, next) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = String(req.body?.password ?? "");
      const roleId = parsePositiveInt(req.body?.roleId);
      const usernameError = validateUsername(username);
      const passwordError = validatePassword(password);

      if (usernameError) return res.status(400).json({ success: false, message: usernameError });
      if (passwordError) return res.status(400).json({ success: false, message: passwordError });
      if (!roleId || !(await roleExists(roleId))) {
        return res.status(400).json({ success: false, message: "نقش انتخاب‌شده معتبر نیست." });
      }

      res.status(201).json({
        success: true,
        data: await addUserToDb(username, password, roleId),
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/users/:id", authorizeRole(["Admin"]), async (req, res, next) => {
    try {
      const userId = parsePositiveInt(req.params.id);
      const roleId = parsePositiveInt(req.body?.roleId);
      if (!userId) return res.status(400).json({ success: false, message: "شناسه کاربر معتبر نیست." });
      const currentUserId = Number((req as typeof req & { user?: { id?: number } }).user?.id || 0);
      if (currentUserId && userId === currentUserId) {
        return res.status(400).json({ success: false, message: "نقش حساب کاربری فعلی از این بخش قابل تغییر نیست." });
      }
      if (!roleId || !(await roleExists(roleId))) {
        return res.status(400).json({ success: false, message: "نقش انتخاب‌شده معتبر نیست." });
      }

      const data = await updateUserInDb(userId, { roleId } as UserUpdatePayload);
      revokeUserSessions(userId);
      revokeMiniAppStaffSessions(userId);
      const selectedRole = (await getAllRoles()).find((role) => Number(role.id) === roleId)?.name;
      if (selectedRole !== "Admin" && selectedRole !== "Manager") {
        await unlinkStaffTelegram(userId, req.user!);
      }
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    "/api/users/:id",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const userId = parsePositiveInt(req.params.id);
        if (!userId) return res.status(400).json({ success: false, message: "شناسه کاربر معتبر نیست." });
        const currentUserId = Number((req as typeof req & { user?: { id?: number } }).user?.id || 0);
        if (currentUserId && userId === currentUserId) {
          return res.status(400).json({ success: false, message: "امکان حذف حساب کاربری فعلی وجود ندارد." });
        }
        await deleteUserFromDb(userId);
        revokeUserSessions(userId);
        revokeMiniAppStaffSessions(userId);
        res.json({ success: true, message: "کاربر با موفقیت حذف شد." });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/users/:id/reset-password",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const userId = parsePositiveInt(req.params.id);
        const password = String(req.body?.password ?? "");
        if (!userId) return res.status(400).json({ success: false, message: "شناسه کاربر معتبر نیست." });
        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ success: false, message: passwordError });

        await resetUserPasswordInDb(userId, password);
        revokeUserSessions(userId);
        res.json({ success: true, message: "کلمه عبور با موفقیت بازنشانی شد." });
      } catch (error) {
        next(error);
      }
    },
  );
};
