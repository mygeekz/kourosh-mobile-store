import type { RequestHandler } from "express";
import type { MiniAppIdentityKind } from "./miniAppSession.js";

const accessContract = (kind: MiniAppIdentityKind) => {
  if (kind === "customer") {
    return {
      code: "MINIAPP_CUSTOMER_ACCESS_REQUIRED",
      message: "این بخش فقط برای حساب مشتری فعال است.",
    };
  }
  if (kind === "staff") {
    return {
      code: "MINIAPP_STAFF_ACCESS_REQUIRED",
      message: "این بخش فقط برای دسترسی مدیریتی مجاز است.",
    };
  }
  return {
    code: "MINIAPP_PARTNER_ACCESS_REQUIRED",
    message: "این بخش فقط برای حساب همکار فعال است.",
  };
};

export const requireMiniAppIdentityKind = (kind: MiniAppIdentityKind): RequestHandler =>
  (req, res, next) => {
    if (req.miniAppIdentity?.kind !== kind) {
      const contract = accessContract(kind);
      return res.status(403).json({
        success: false,
        code: contract.code,
        message: contract.message,
        requestId: res.locals.requestId,
      });
    }
    return next();
  };

export const miniAppSubjectIdFromSession = (
  identity: { subjectId?: unknown } | undefined,
): number => Number(identity?.subjectId || 0);
