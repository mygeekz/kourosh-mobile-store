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
import { createManagementRateLimiter } from "../middleware/managementRateLimiter";
import {
  MiniAppIdentityResolutionError,
  resolveMiniAppIdentity,
} from "../services/miniAppIdentity.service";
import { miniAppCustomerService } from "../services/miniAppCustomer.service";
import { miniAppPartnerService } from "../services/miniAppPartner.service";
import { miniAppStaffService } from "../services/miniAppStaff.service";
import { miniAppManagerService } from "../services/miniAppManager.service";
import { addManagementAuditLog } from "../security/managementAudit";
import { resolveMiniAppLaunch } from "../../miniapp/startParam";
import { selectMiniAppWorkspace } from "../miniapp/miniAppIdentityResolver";
import { loadFreshMiniAppIdentityBinding, loadFreshStaffAuthorizationResult } from "../services/telegramIdentitySecurity.service";
import {
  miniAppIdentityHasCapability,
  resolveMiniAppStaffCapabilitiesFromPermissions,
  type MiniAppStaffCapability,
} from "../security/miniAppStaffAccessPolicy";
import {
  miniAppSecurityFieldsFromRequest,
  miniAppSecurityLog,
} from "../security/miniAppSecurityLogger";
import { isTrustedLoopbackProxy } from "../middleware/trustedProxy";
import { requestMiniAppSnapshotRefresh } from "../cloud/snapshots/miniAppSnapshotRuntime";
import {
  hasAllManagementPermissions,
  hasAnyOfManagementPermissions,
  type ManagementPermission,
} from "../security/managementAccessPolicy";
import {
  listManagerInAppNotifications,
  markAllManagerInAppNotificationsRead,
  markManagerInAppNotificationRead,
} from "../db/domains/managerNotifications.db";

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
    const displayName = [fresh.firstName, fresh.lastName].filter(Boolean).join(" ") || fresh.username;
    const permissions = Array.isArray(fresh.permissions) ? fresh.permissions.map(String) : [];
    const capabilities = resolveMiniAppStaffCapabilitiesFromPermissions(permissions);
    req.miniAppIdentity = {
      ...identity,
      displayName,
      roleName: fresh.roleName,
      permissions,
      capabilities,
      workspaces: identity.workspaces?.map((workspace) => workspace.kind === "manager"
        ? { ...workspace, displayName, roleName: fresh.roleName, permissions, capabilities }
        : workspace),
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
  managerService?: typeof miniAppManagerService;
};

const defaultRouteDependencies: MiniAppRouteDependencies = {
  customerService: miniAppCustomerService,
  partnerService: miniAppPartnerService,
  staffService: miniAppStaffService,
  managerService: miniAppManagerService,
};

const requireStaffCapability = (capability: MiniAppStaffCapability) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!miniAppIdentityHasCapability(req.miniAppIdentity, capability)) {
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

const requireStaffPermissions = (permissions: readonly ManagementPermission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const granted = (req.miniAppIdentity?.permissions || []).map(String);
    const missing = permissions.find((permission) => !granted.includes(permission));
    if (!hasAllManagementPermissions(granted, permissions)) {
      miniAppSecurityLog("permission_denied", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, missing || permissions.join("|"), res.locals.miniAppStartedAt));
      return sendMiniAppError(
        res,
        403,
        "MINIAPP_MANAGEMENT_PERMISSION_REQUIRED",
        "دسترسی مدیریتی لازم برای این اطلاعات فعال نیست.",
      );
    }
    return next();
  };

const requireAnyStaffPermission = (permissions: readonly ManagementPermission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const granted = (req.miniAppIdentity?.permissions || []).map(String);
    if (!hasAnyOfManagementPermissions(granted, permissions)) {
      const expected = permissions.join("|");
      miniAppSecurityLog("permission_denied", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, expected, res.locals.miniAppStartedAt));
      return sendMiniAppError(
        res,
        403,
        "MINIAPP_MANAGEMENT_PERMISSION_REQUIRED",
        "دسترسی مدیریتی لازم برای این اطلاعات فعال نیست.",
      );
    }
    return next();
  };

const auditManagerSensitiveRead = (
  req: Request,
  action: string,
  entityType: string,
  entityId: number,
): void => {
  const identity = req.miniAppIdentity;
  if (!identity || identity.kind !== "staff") return;
  void addManagementAuditLog({
    actor: { id: identity.subjectId, roleName: identity.roleName || null },
    action,
    entityType,
    entityId,
    description: "Sensitive MiniApp management read.",
    source: "miniapp_manager",
    requestId: (req.res as any)?.locals?.requestId || null,
    metadata: { telegramUserId: identity.telegramUserId, workspace: "manager" },
  }).catch(() => undefined);
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
      const resolvedIdentity = await resolveMiniAppIdentity(telegramUserId);
      if (!resolvedIdentity) {
        miniAppSecurityLog("auth_unlinked", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, "MINIAPP_ACCOUNT_UNLINKED", res.locals.miniAppStartedAt));
        return sendMiniAppError(
          res,
          403,
          "MINIAPP_ACCOUNT_UNLINKED",
          "حساب تلگرام شما هنوز به پرونده کوروش متصل نشده است.",
        );
      }

      const requestedWorkspaceRaw = String(req.body?.workspaceKind || "").trim();
      const requestedWorkspace = ["manager", "customer", "partner"].includes(requestedWorkspaceRaw)
        ? requestedWorkspaceRaw as "manager" | "customer" | "partner"
        : null;
      if (req.body?.workspaceKind !== undefined && !requestedWorkspace) {
        return sendMiniAppError(res, 400, "MINIAPP_WORKSPACE_INVALID", "فضای کاری درخواستی معتبر نیست.");
      }
      const identity = selectMiniAppWorkspace(resolvedIdentity, requestedWorkspace);
      if (!identity) {
        miniAppSecurityLog("workspace_denied", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 403, requestedWorkspace || "unknown", res.locals.miniAppStartedAt));
        return sendMiniAppError(res, 403, "MINIAPP_WORKSPACE_ACCESS_REQUIRED", "این فضای کاری برای حساب شما فعال نیست.");
      }
      const session = createMiniAppSession(identity);
      const launch = requestedWorkspace
        ? { startParam: null, route: "/" }
        : resolveMiniAppLaunch(validated.startParam, identity.kind);
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

  app.get(
    "/api/miniapp/staff/home",
    requireStaffCapability("staff:executive:read"),
    requireStaffPermissions(["dashboard.read", "sales.read", "profits.read", "customers.ledger.read", "installments.read", "inventory.read"]),
    async (_req, res, next) => {
    try {
      const data = await staffService.getHome();
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get(
    "/api/miniapp/staff/sales-summary",
    requireStaffCapability("staff:sales_summary:read"),
    requireStaffPermissions(["sales.read", "profits.read"]),
    async (req, res, next) => {
    try {
      const data = await staffService.getSalesSummary(req.query.period);
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/staff/search", requireStaffCapability("staff:executive:read"), async (req, res, next) => {
    try {
      const capabilities = (req.miniAppIdentity?.capabilities || []) as MiniAppStaffCapability[];
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

  const managerService = dependencies.managerService || miniAppManagerService;
  const managerReadLimiter = createManagementRateLimiter({
    scope: "miniapp-manager",
    windowMs: 60_000,
    maxRequests: 180,
    code: "MINIAPP_MANAGER_RATE_LIMITED",
    message: "تعداد درخواست‌های مدیریتی Mini App زیاد است؛ کمی بعد دوباره تلاش کنید.",
  });
  const managerMutationLimiter = createManagementRateLimiter({
    scope: "miniapp-manager-mutation",
    windowMs: 60_000,
    maxRequests: 40,
    code: "MINIAPP_MANAGER_RATE_LIMITED",
    message: "تعداد عملیات مدیریتی Mini App زیاد است؛ کمی بعد دوباره تلاش کنید.",
  });
  const managerGuards = [requireMiniAppSession, requireStaffIdentity, requireFreshMiniAppAuthorization, managerReadLimiter] as const;
  app.use("/api/miniapp/manager", ...managerGuards);

  app.get("/api/miniapp/manager/notifications", async (req, res, next) => {
    try {
      const identity = req.miniAppIdentity!;
      const limit = Math.max(1, Math.min(100, Number(req.query.limit || 40)));
      const unreadOnly = String(req.query.unreadOnly || "").toLowerCase() === "true" || String(req.query.unreadOnly || "") === "1";
      const data = await listManagerInAppNotifications(identity.subjectId, { limit, unreadOnly });
      return res.json({ success: true, data, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.post("/api/miniapp/manager/notifications/:id/read", managerMutationLimiter, async (req, res, next) => {
    try {
      const identity = req.miniAppIdentity!;
      const notificationId = Number(req.params.id || 0);
      if (!Number.isSafeInteger(notificationId) || notificationId <= 0) return sendMiniAppError(res, 400, "MINIAPP_NOTIFICATION_ID_INVALID", "شناسه اعلان معتبر نیست.");
      const updated = await markManagerInAppNotificationRead(identity.subjectId, notificationId);
      if (!updated) return sendMiniAppError(res, 404, "MINIAPP_NOTIFICATION_NOT_FOUND", "اعلان پیدا نشد.");
      return res.json({ success: true, data: { id: notificationId, read: true }, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.post("/api/miniapp/manager/notifications/read-all", managerMutationLimiter, async (req, res, next) => {
    try {
      const identity = req.miniAppIdentity!;
      const changed = await markAllManagerInAppNotificationsRead(identity.subjectId);
      return res.json({ success: true, data: { changed }, requestId: res.locals.requestId });
    } catch (error) { return next(error); }
  });

  app.get("/api/miniapp/manager/me", (req, res) => {
    const identity = req.miniAppIdentity!;
    return res.json({
      success: true,
      data: {
        id: identity.subjectId,
        displayName: identity.displayName,
        roleName: identity.roleName || null,
        permissions: identity.permissions || [],
        workspaces: identity.workspaces || [],
        verified: true,
      },
      requestId: res.locals.requestId,
    });
  });

  app.get(
    "/api/miniapp/manager/dashboard",
    requireStaffPermissions(["dashboard.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.getDashboard(req.miniAppIdentity?.permissions || []);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/sales-summary",
    requireAnyStaffPermission(["sales.read", "profits.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.getSalesSummary(req.query.period, req.miniAppIdentity?.permissions || []);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/customers",
    requireStaffPermissions(["customers.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.listCustomers(req.query, req.miniAppIdentity?.permissions || []);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/customers/:id",
    requireStaffPermissions(["customers.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.getCustomer(id, req.miniAppIdentity?.permissions || []) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/customers/:id/ledger",
    requireStaffPermissions(["customers.read", "customers.ledger.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        if (!id) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        const data = await managerService.listCustomerLedger(id, req.query);
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        auditManagerSensitiveRead(req, "MINIAPP_MANAGER_CUSTOMER_LEDGER_VIEWED", "customer", id);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/customers/:id/purchases",
    requireStaffPermissions(["customers.read", "sales.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.listCustomerPurchases(id, req.query) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/customers/:id/installments",
    requireStaffPermissions(["customers.read", "installments.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        if (!id) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        const data = await managerService.listCustomerInstallments(id);
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "مشتری مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners",
    requireStaffPermissions(["partners.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.listPartners(req.query, req.miniAppIdentity?.permissions || []);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners/:id",
    requireStaffPermissions(["partners.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.getPartner(id, req.miniAppIdentity?.permissions || []) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners/:id/ledger",
    requireStaffPermissions(["partners.read", "partners.ledger.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        if (!id) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        const data = await managerService.listPartnerLedger(id, req.query);
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        auditManagerSensitiveRead(req, "MINIAPP_MANAGER_PARTNER_LEDGER_VIEWED", "partner", id);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners/:id/purchases",
    requireStaffPermissions(["partners.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        if (!id) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        const data = await managerService.listPartnerPurchases(id, req.query);
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners/:id/settlements",
    requireStaffPermissions(["partners.read", "partners.ledger.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        if (!id) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        const data = await managerService.listPartnerSettlements(id, req.query);
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/partners/:id/accounting-breakdown",
    requireStaffPermissions(["partners.read", "partners.ledger.read", "profits.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.getPartnerAccountingBreakdown(id) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "همکار مورد نظر پیدا نشد.");
        auditManagerSensitiveRead(req, "MINIAPP_MANAGER_PARTNER_ACCOUNTING_VIEWED", "partner", id!);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/installments/due",
    requireStaffPermissions(["installments.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.listDueInstallments(req.query);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/installments/:saleId",
    requireStaffPermissions(["installments.read"]),
    async (req, res, next) => {
      try {
        const saleId = positiveId(req.params.saleId);
        const data = saleId ? await managerService.getInstallmentDetail(saleId) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "فروش اقساطی مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/repairs",
    requireStaffPermissions(["repairs.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.listRepairs(req.query);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/repairs/:id",
    requireStaffPermissions(["repairs.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.getRepairDetail(id) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "تعمیر مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/inventory/phones",
    requireStaffPermissions(["inventory.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.listInventoryPhones(req.query);
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/inventory/phones/:id",
    requireStaffPermissions(["inventory.read"]),
    async (req, res, next) => {
      try {
        const id = positiveId(req.params.id);
        const data = id ? await managerService.getInventoryPhone(id) : null;
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "گوشی مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

  app.get(
    "/api/miniapp/manager/invoices/:invoiceRef",
    requireStaffPermissions(["sales.read"]),
    async (req, res, next) => {
      try {
        const data = await managerService.getInvoice(String(req.params.invoiceRef || ""));
        if (!data) return sendMiniAppError(res, 404, "MINIAPP_RESOURCE_NOT_FOUND", "فاکتور مورد نظر پیدا نشد.");
        return res.json({ success: true, data, requestId: res.locals.requestId });
      } catch (error) { return next(error); }
    },
  );

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
