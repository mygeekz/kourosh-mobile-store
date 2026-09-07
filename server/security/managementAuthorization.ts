import type { NextFunction, Request, RequestHandler, Response } from "express";
import { resolveUserTenantAuthorization, type TenantUserAuthorization } from "../db/domains/accessControl.db";
import type { ManagementPermission } from "./managementAccessPolicy";

declare global {
  namespace Express {
    interface Request {
      managementAuthorization?: TenantUserAuthorization;
    }
  }
}

const accessDenied = (res: Response, permission: string) =>
  res.status(403).json({
    success: false,
    code: "MANAGEMENT_PERMISSION_REQUIRED",
    message: "دسترسی لازم برای انجام این عملیات فعال نیست.",
    permission,
  });

export const requireManagementPermission = (
  permission: ManagementPermission,
): RequestHandler => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "برای ادامه وارد حساب کاربری شوید.",
      });
    }
    const authorization = await resolveUserTenantAuthorization(req.user.id);
    if (!authorization?.permissions.includes(permission)) return accessDenied(res, permission);
    req.managementAuthorization = authorization;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAnyManagementPermission = (
  permissions: readonly ManagementPermission[],
): RequestHandler => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "برای ادامه وارد حساب کاربری شوید.",
      });
    }
    const authorization = await resolveUserTenantAuthorization(req.user.id);
    const allowed = Boolean(authorization && permissions.some((permission) => authorization.permissions.includes(permission)));
    if (!allowed) return accessDenied(res, permissions.join("|"));
    req.managementAuthorization = authorization || undefined;
    return next();
  } catch (error) {
    return next(error);
  }
};
