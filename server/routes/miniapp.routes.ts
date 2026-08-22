import crypto from "crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { getAllSettingsAsObject } from "../database";
import {
  createMiniAppSession,
  requireMiniAppSession,
  revokeCurrentMiniAppSession,
} from "../miniapp/miniAppSession";
import {
  miniAppSubjectIdFromSession,
  requireMiniAppIdentityKind,
} from "../miniapp/miniAppAuthorization";
import {
  TelegramInitDataError,
  validateTelegramInitData,
} from "../miniapp/telegramInitData";
import { createLoginRateLimiter } from "../middleware/loginRateLimiter";
import {
  MiniAppIdentityResolutionError,
  resolveMiniAppIdentity,
} from "../services/miniAppIdentity.service";
import { miniAppCustomerService } from "../services/miniAppCustomer.service";
import { miniAppPartnerService } from "../services/miniAppPartner.service";
import { miniAppStaffService } from "../services/miniAppStaff.service";
import { resolveMiniAppLaunch } from "../../miniapp/startParam";
import { loadFreshMiniAppIdentityBinding, loadFreshStaffAuthorizationResult } from "../services/telegramIdentitySecurity.service";
import {
  miniAppStaffRoleHasCapability,
  resolveMiniAppStaffCapabilities,
  type MiniAppStaffCapability,
} from "../security/miniAppStaffAccessPolicy";
import {
  miniAppSecurityFieldsFromRequest,
  miniAppSecurityLog,
} from "../security/miniAppSecurityLogger";
import { isTrustedLoopbackProxy } from "../middleware/trustedProxy";
import { requestMiniAppSnapshotRefresh } from "../cloud/snapshots/miniAppSnapshotRuntime";

const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

const miniAppAuthLimiter = createLoginRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxAttempts: 30,
  onLimited: (req, res) => miniAppSecurityLog(
    "auth_rate_limited",
    miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 429, "AUTH_RATE_LIMITED", res.locals.miniAppStartedAt),
  ),
});

const withRequestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  res.locals.requestId = isTrustedLoopbackProxy(String(req.socket.remoteAddress || "")) && VALID_REQUEST_ID.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.locals.miniAppStartedAt = Date.now();
  res.setHeader("X-Request-ID", res.locals.requestId);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
};

const sendMiniAppError = (
  res: Response,
  status: number,
  code: string,
  message: string,
): Response =>
  res.status(status).json({
    success: false,
    code,
    message,
    requestId: res.locals.requestId,
  });

const requireCustomerIdentity = requireMiniAppIdentityKind("customer");
const requirePartnerIdentity = requireMiniAppIdentityKind("partner");
const requireStaffIdentity = requireMiniAppIdentityKind("staff");

const requireFreshMiniAppAuthorization = async (req: Request, res: Response, next: NextFunction) => {
  const identity = req.miniAppIdentity;
  if (!identity) return sendMiniAppError(res, 401, "MINIAPP_SESSION_INVALID", "نشست Mini App معتبر نیست.");
  try {
    if (identity.kind === "customer" || identity.kind === "partner") {
      const freshBinding = await loadFreshMiniAppIdentityBinding(identity.kind, identity.subjectId, identity.telegramUserId);
      if (!freshBinding) {
        revokeCurrentMiniAppSession(req);
        miniAppSecurityLog("fresh_binding_failed", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 401, "IDENTITY_BINDING_INVALID", res.locals.miniAppStartedAt));
        return sendMiniAppError(res, 401, "MINIAPP_IDENTITY_BINDING_INVALID", "اتصال امن حساب معتبر نیست. برنامه را دوباره باز کنید.");
      }
      return next();
    }
    const freshResult = await loadFreshStaffAuthorizationResult(identity.subjectId, identity.telegramUserId);
    const fresh = freshResult.authorization;
    if (!fresh) {
      revokeCurrentMiniAppSession(req);
      miniAppSecurityLog(
        freshResult.reason === "role_denied" ? "staff_role_denied" : "fresh_binding_failed",
        miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 401, freshResult.reason === "role_denied" ? "STAFF_ROLE_DENIED" : "STAFF_BINDING_INVALID", res.locals.miniAppStartedAt),
      );
      return sendMiniAppError(res, 401, "MINIAPP_STAFF_AUTH_INVALID", "هویت سازمانی معتبر نیست. برنامه را دوباره باز کنید.");
    }
    req.miniAppIdentity = {
      ...identity,
      displayName: [fresh.firstName, fresh.lastName].filter(Boolean).join(" ") || fresh.username,
      roleName: fresh.roleName,
      capabilities: [...resolveMiniAppStaffCapabilities(fresh.roleName)],
    };
    return next();
  } catch (error) { revokeCurrentMiniAppSession(req); return next(error); }
};

const customerIdFromSession = (req: Request): number =>
  miniAppSubjectIdFromSession(req.miniAppIdentity);

const partnerIdFromSession = (req: Request): number =>
  miniAppSubjectIdFromSession(req.miniAppIdentity);

const positiveId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

type MiniAppRouteDependencies = {
  customerService: typeof miniAppCustomerService;
  partnerService: typeof miniAppPartnerService;
  staffService?: typeof miniAppStaffService;
};

const defaultRouteDependencies: MiniAppRouteDependencies = {
  customerService: miniAppCustomerService,
  partnerService: miniAppPartnerService,
  staffService: miniAppStaffService,
};

const requireStaffCapability = (capability: MiniAppStaffCapability) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!miniAppStaffRoleHasCapability(req.miniAppIdentity?.roleName, capability)) {
      miniAppSecurityLog("capability_denied", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, capability, res.locals.miniAppStartedAt));
      return sendMiniAppError(
        res,
        403,
        "MINIAPP_STAFF_CAPABILITY_REQUIRED",
        "دسترسی مدیریتی لازم برای این بخش فعال نیست.",
      );
    }
    return next();
  };

export const registerMiniAppRoutes = (
  app: Express,
  dependencies: MiniAppRouteDependencies = defaultRouteDependencies,
): void => {
  app.use("/api/miniapp", withRequestId);

  app.post("/api/miniapp/auth", miniAppAuthLimiter, async (req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      const botToken = String((settings as Record<string, unknown>).telegram_bot_token || "").trim();
      const validated = validateTelegramInitData(
        String(req.body?.initData || ""),
        botToken,
      );
      const telegramUserId = String(validated.user.id);
      const identity = await resolveMiniAppIdentity(telegramUserId);
      if (!identity) {
        miniAppSecurityLog("auth_unlinked", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, "MINIAPP_ACCOUNT_UNLINKED", res.locals.miniAppStartedAt));
        return sendMiniAppError(
          res,
          403,
          "MINIAPP_ACCOUNT_UNLINKED",
          "حساب تلگرام شما هنوز به پرونده کوروش متصل نشده است.",
        );
      }

      const session = createMiniAppSession(identity);
      const launch = resolveMiniAppLaunch(validated.startParam, identity.kind);
      miniAppSecurityLog("auth_success", {
        ...miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 200, "AUTHENTICATED", res.locals.miniAppStartedAt),
        identityKind: identity.kind,
        subjectId: identity.subjectId,
      });
      // Successful live authorization is a safe signal to refresh the outbound read-only
      // snapshot soon. The runtime debounces this and never blocks the auth response.
      requestMiniAppSnapshotRefresh();
      return res.json({
        success: true,
        data: {
          sessionToken: session.token,
          expiresAt: session.expiresAt,
          identity,
          launch,
          telegram: {
            userId: telegramUserId,
            firstName: validated.user.first_name,
            startParam: launch.startParam,
          },
        },
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      if (error instanceof TelegramInitDataError) {
        const status = error.code === "MINIAPP_BOT_NOT_CONFIGURED" ? 503 : 401;
        if (error.code !== "MINIAPP_BOT_NOT_CONFIGURED") {
          miniAppSecurityLog("auth_invalid_init_data", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, status, error.code, res.locals.miniAppStartedAt));
        }
        return sendMiniAppError(res, status, error.code, error.message);
      }
      if (error instanceof MiniAppIdentityResolutionError) {
        return sendMiniAppError(res, 401, error.code, error.message);
      }
      return next(error);
    }
  });

  app.get("/api/miniapp/me", requireMiniAppSession, requireFreshMiniAppAuthorization, (req, res) => {
    return res.json({
      success: true,
      data: { identity: req.miniAppIdentity },
      requestId: res.locals.requestId,
    });
  });

  const staffService = dependencies.staffService || miniAppStaffService;
  const staffGuards = [requireMiniAppSession, requireStaffIdentity, requireFreshMiniAppAuthorization] as const;
  app.use("/api/miniapp/staff", ...staffGuards);

  app.get("/api/miniapp/staff/me", requireStaffCapability("staff:executive:read"), (req, res) => {
    const identity = req.miniAppIdentity!;
    return res.json({
      success: true,
      data: {
        id: identity.subjectId,
        displayName: identity.displayName,
        roleName: identity.roleName,
        capabilities: identity.capabilities,
        verified: true,
      },
      requestId: res.locals.requestId,
    });
  });

  app.get("/api/miniapp/staff/home", requireStaffCapability("staff:executive:read"), async (_req, res, next) => {
    try {
      const data = await staffService.getHome();
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/sales-summary", requireStaffCapability("staff:sales_summary:read"), async (req, res, next) => {
    try {
      const data = await staffService.getSalesSummary(req.query.period);
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/search", requireStaffCapability("staff:executive:read"), async (req, res, next) => {
    try {
      const capabilities = resolveMiniAppStaffCapabilities(req.miniAppIdentity?.roleName);
      const data = await staffService.search(req.query.q, req.query.limit, capabilities);
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/customers/:id", requireStaffCapability("staff:customer_lookup:read"), async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);
      const data = id ? await staffService.getCustomerDetail(id) : null;
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/phones", requireStaffCapability("staff:inventory_lookup:read"), async (req, res, next) => {
    try {
      const data = await staffService.listPhones({ q: req.query.q, page: req.query.page, offset: req.query.offset, limit: req.query.limit });
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/phones/:id", requireStaffCapability("staff:inventory_lookup:read"), async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);
      const data = id ? await staffService.getPhoneDetail(id) : null;
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/installments/due", requireStaffCapability("staff:installments:read"), async (req, res, next) => {
    try {
      const data = await staffService.listDueInstallments({ scope: req.query.scope, page: req.query.page, pageSize: req.query.pageSize });
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/installments/:saleId", requireStaffCapability("staff:installments:read"), async (req, res, next) => {
    try {
      const saleId = positiveId(req.params.saleId);
      const data = saleId ? await staffService.getInstallmentDetail(saleId) : null;
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/invoices/:invoiceRef", requireStaffCapability("staff:invoice_lookup:read"), async (req, res, next) => {
    try {
      const data = await staffService.getInvoiceDetail(String(req.params.invoiceRef || ""));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  const customerGuards = [requireMiniAppSession, requireCustomerIdentity, requireFreshMiniAppAuthorization] as const;

  app.get("/api/miniapp/customer/home", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.getHome(customerIdFromSession(req));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/account", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.getAccount(customerIdFromSession(req));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/installments", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.listInstallments(customerIdFromSession(req));
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/installments/:saleId", ...customerGuards, async (req, res, next) => {
    try {
      const saleId = positiveId(req.params.saleId);
      const data = saleId
        ? await dependencies.customerService.getInstallmentDetail(customerIdFromSession(req), saleId)
        : null;
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/purchases", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.listPurchases(customerIdFromSession(req), Number(req.query.limit || 50));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/invoices", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.listInvoices(customerIdFromSession(req), Number(req.query.limit || 50));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/customer/invoices/:invoiceRef", ...customerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.customerService.getInvoiceDetail(
        customerIdFromSession(req),
        String(req.params.invoiceRef || ""),
      );
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  const partnerGuards = [requireMiniAppSession, requirePartnerIdentity, requireFreshMiniAppAuthorization] as const;

  app.get("/api/miniapp/partner/home", ...partnerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.partnerService.getHome(partnerIdFromSession(req));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/partner/account", ...partnerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.partnerService.getAccount(partnerIdFromSession(req));
      if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "اطلاعات درخواستی پیدا نشد.");
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/partner/ledger", ...partnerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.partnerService.listLedger(
        partnerIdFromSession(req),
        Number(req.query.page || 1),
        Number(req.query.pageSize || 20),
      );
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/partner/purchases", ...partnerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.partnerService.listPurchases(
        partnerIdFromSession(req),
        Number(req.query.page || 1),
        Number(req.query.pageSize || 20),
      );
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/miniapp/partner/phones", ...partnerGuards, async (req, res, next) => {
    try {
      const data = await dependencies.partnerService.listPhones(
        partnerIdFromSession(req),
        Number(req.query.page || 1),
        Number(req.query.pageSize || 20),
      );
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) {
      return next(error);
    }
  });

  app.use("/api/miniapp", (_req, res) =>
    sendMiniAppError(
      res,
      404,
      "MINIAPP_ROUTE_NOT_FOUND",
      "مسیر درخواستی Mini App وجود ندارد.",
    ),
  );
};
