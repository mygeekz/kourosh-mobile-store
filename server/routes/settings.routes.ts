import type { Express, RequestHandler } from "express";
import {
  getLatestLoadingButtonVisualReport,
  getLatestLoadingButtonVisualReportStatus,
  resolveLoadingButtonVisualScreenshot,
} from "../services/loadingButtonVisualReport.service";
import {
  getLatestDashboardVisualReport,
  getLatestDashboardVisualReportStatus,
  resolveDashboardVisualScreenshot,
} from "../services/dashboardVisualReport.service";
import { getQualityBrowserRuntimeStatus } from "../services/qualityBrowserRuntime.service";
import {
  getLatestPwaPlatformInstallReport,
  getLatestPwaPlatformInstallReportStatus,
  resolvePwaPlatformInstallScreenshot,
} from "../services/pwaPlatformInstallReport.service";
import {
  getAllSettingsAsObject,
  updateMultipleSettings,
  type SettingItem,
} from "../database";
import {
  pickGenericWritableSettings,
  pickLocalAccessSettings,
  pickTelegramSettings,
} from "../connectivity/settingsScopes";
import { normalizeLocalHostname, normalizeLocalSuffix } from "../utils/localSettingsHelpers";
import { resolveMiniAppPublicAccessMode, validateMiniAppLiveOriginUrl, validateTelegramMiniAppPublicUrl, validateTelegramStableMiniAppCanonicalUrl } from "../connectivity/telegramPublicAccess";
import { resolveMiniAppStableTunnelProvider } from "../connectivity/stableTunnelProvider";
import {
  getCloudConnectorRuntimeStatus,
  initializeCloudConnectorRuntime,
  validateCloudMiniAppOperational,
  validateCloudTelegramOperational,
  validateRelayMiniAppOperational,
  validateRelayTelegramOperational,
} from "../cloud/cloudConnectorRuntime";
import {
  isDevelopmentCloudProvisioningAvailable,
  provisionDevelopmentCloudConnector,
} from "../cloud/cloudDevelopmentProvisioning";
import { configureTelegramTransportRuntime } from "../telegram/telegramTransportRuntime";
import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { resolveRelayControlUrl, resolveRelayConnectorUrl, resolveRelayProvider, validateRelayConnectorUrl, validateRelayControlUrl } from "../connectivity/relayProvider";
import { enrollCloudConnector, rotateCloudConnectorCredential } from "../cloud/cloudEnrollment";
import { writeMiniAppGatewayRuntimeConfigFromSettings } from "../miniapp/miniAppGatewayRuntimeConfig.mjs";
import { getMiniAppPublicSyncStatus } from "../services/miniAppPublicUrlSync.service";
import { syncTelegramMenuButton } from "../services/telegramMenuSync.service";
import {
  getMiniAppSnapshotProvisioningDescriptor,
  getMiniAppSnapshotRuntimeStatus,
  initializeMiniAppSnapshotRuntime,
  prepareMiniAppSnapshotProvisioningDescriptor,
  renderMiniAppSnapshotProvisioningSql,
  runMiniAppSnapshotReconciliation,
} from "../cloud/snapshots/miniAppSnapshotRuntime";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type SettingsRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const waitForRelayConnection = async (timeoutMs = 5000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = getCloudConnectorRuntimeStatus().runtime as { state?: string } | null;
    if (runtime?.state === "connected") return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return getCloudConnectorRuntimeStatus().runtime?.state === "connected";
};

export const registerSettingsRoutes = (
  app: Express,
  { authorizeRole }: SettingsRouteDeps,
): void => {
  app.get("/api/module-flags", async (_req, res, next) => {
    try {
      const all = await getAllSettingsAsObject();
      const data = Object.fromEntries(
        Object.entries(all).filter(([key]) => key.startsWith("feature_")),
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/store-branding", async (_req, res, next) => {
    try {
      const all = await getAllSettingsAsObject();
      res.setHeader("Cache-Control", "no-store");
      res.json({
        success: true,
        data: {
          store_name: all.store_name || "فروشگاه",
          store_logo_path: all.store_logo_path || null,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.json({ success: true, data: await getAllSettingsAsObject() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/miniapp-public-sync/status", authorizeRole(["Admin"]), async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, data: getMiniAppPublicSyncStatus() });
  });

  app.get("/api/settings/miniapp-snapshot/status", authorizeRole(["Admin"]), async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, data: getMiniAppSnapshotRuntimeStatus() });
  });

  app.get("/api/settings/miniapp-snapshot/provisioning", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      const descriptor = getMiniAppSnapshotProvisioningDescriptor(settings);
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        success: true,
        data: {
          ...descriptor,
          provisioningSql: renderMiniAppSnapshotProvisioningSql(descriptor),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/settings/miniapp-snapshot/prepare", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      const descriptor = prepareMiniAppSnapshotProvisioningDescriptor(settings);
      res.setHeader("Cache-Control", "no-store");
      return res.status(descriptor.ready ? 200 : 409).json({
        success: descriptor.ready,
        code: descriptor.ready ? undefined : "MINIAPP_SNAPSHOT_RUNTIME_NOT_READY",
        data: {
          ...descriptor,
          provisioningSql: renderMiniAppSnapshotProvisioningSql(descriptor),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/settings/miniapp-snapshot/refresh", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      initializeMiniAppSnapshotRuntime(settings);
      const result = await runMiniAppSnapshotReconciliation();
      res.setHeader("Cache-Control", "no-store");
      const responseStatus = result.state === "not_ready" ? 409 : result.state === "degraded" ? 503 : 200;
      const success = result.state === "idle";
      return res.status(responseStatus).json({
        success,
        code: success
          ? undefined
          : result.state === "not_ready"
            ? "MINIAPP_SNAPSHOT_RUNTIME_NOT_READY"
            : result.lastErrorCode || "MINIAPP_SNAPSHOT_RECONCILIATION_FAILED",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  });


  app.get("/api/settings/quality/browser-runtime/status", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getQualityBrowserRuntimeStatus() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/quality/loading-button-report/latest", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestLoadingButtonVisualReport() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/quality/loading-button-report/status", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestLoadingButtonVisualReportStatus() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/quality/style-report/status", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      const [dashboard, loadingButton, pwaPlatformInstall] = await Promise.all([
        getLatestDashboardVisualReportStatus(),
        getLatestLoadingButtonVisualReportStatus(),
        getLatestPwaPlatformInstallReportStatus(),
      ]);
      const totalFailed = dashboard.failed + loadingButton.failed + pwaPlatformInstall.failed;
      res.setHeader("Cache-Control", "no-store");
      res.json({
        success: true,
        data: {
          status: totalFailed > 0 ? "failed" : dashboard.hasReport || loadingButton.hasReport || pwaPlatformInstall.hasReport ? "passed" : "missing",
          totalFailed,
          dashboard,
          loadingButton,
          pwaPlatformInstall,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.get(
    "/api/settings/quality/loading-button-report/:runId/screenshots/:fileName",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const screenshotPath = await resolveLoadingButtonVisualScreenshot(req.params.runId, req.params.fileName);
        if (!screenshotPath) {
          return res.status(404).json({ success: false, message: "تصویر نتیجه آزمون پیدا نشد." });
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.type("png").sendFile(screenshotPath);
      } catch (e) {
        return next(e);
      }
    },
  );

  app.get("/api/settings/quality/dashboard-visual-report/status", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestDashboardVisualReportStatus() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/quality/dashboard-visual-report/latest", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestDashboardVisualReport() });
    } catch (e) {
      next(e);
    }
  });

  app.get(
    "/api/settings/quality/dashboard-visual-report/:runId/screenshots/:fileName",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const screenshotPath = await resolveDashboardVisualScreenshot(req.params.runId, req.params.fileName);
        if (!screenshotPath) {
          return res.status(404).json({ success: false, message: "تصویر نتیجه آزمون داشبورد پیدا نشد." });
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.type("png").sendFile(screenshotPath);
      } catch (e) {
        return next(e);
      }
    },
  );

  app.get("/api/settings/quality/pwa-platform-install-report/status", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestPwaPlatformInstallReportStatus() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/settings/quality/pwa-platform-install-report/latest", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: await getLatestPwaPlatformInstallReport() });
    } catch (e) {
      next(e);
    }
  });

  app.get(
    "/api/settings/quality/pwa-platform-install-report/:runId/screenshots/:fileName",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const screenshotPath = await resolvePwaPlatformInstallScreenshot(req.params.runId, req.params.fileName);
        if (!screenshotPath) {
          return res.status(404).json({ success: false, message: "تصویر نتیجه آزمون PWA پیدا نشد." });
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.type("png").sendFile(screenshotPath);
      } catch (e) {
        return next(e);
      }
    },
  );

  const persistScopedSettings = async (config: Record<string, unknown>) => {
    const settingsArray: SettingItem[] = Object.entries(config).map(([key, value]) => ({
      key,
      value: value == null ? "" : String(value),
    }));
    if (settingsArray.length) await updateMultipleSettings(settingsArray);
    return settingsArray.map((item) => item.key);
  };

  const resolveRelaySettingsFromRequest = (current: Record<string, unknown>, body: any = {}) => {
    const providerRaw = String(body?.relayProvider ?? body?.relay_provider ?? current.relay_provider ?? "").trim();
    const provider = providerRaw === "custom" ? "custom" : providerRaw === "managed_kourosh" ? "managed_kourosh" : resolveRelayProvider(current);
    const customControl = String(body?.customRelayControlUrl ?? body?.custom_relay_control_url ?? current.custom_relay_control_url ?? "").trim();
    const customConnector = String(body?.customRelayConnectorUrl ?? body?.custom_relay_connector_url ?? current.custom_relay_connector_url ?? "").trim();
    const candidate = { ...current, relay_provider: provider, custom_relay_control_url: customControl, custom_relay_connector_url: customConnector };
    return { provider, customControl, customConnector, candidate, controlUrl: resolveRelayControlUrl(candidate), connectorUrl: resolveRelayConnectorUrl(candidate) };
  };

  const relayStatusHandler: RequestHandler = async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      const current = await getAllSettingsAsObject();
      const relay = resolveRelaySettingsFromRequest(current);
      return res.json({ success: true, data: { ...getCloudConnectorRuntimeStatus(), provider: relay.provider, enrollmentAvailable: Boolean(relay.controlUrl && (relay.provider !== "custom" || relay.connectorUrl)), developmentProvisioningAvailable: relay.provider === "managed_kourosh" && isDevelopmentCloudProvisioningAvailable() } });
    } catch (e) { return next(e); }
  };
  app.get("/api/settings/relay-connector/status", authorizeRole(["Admin"]), relayStatusHandler);
  app.get("/api/settings/cloud-connector/status", authorizeRole(["Admin"]), relayStatusHandler); // v153-v158 compatibility

  const relayEnrollHandler: RequestHandler = async (req, res, next) => {
    try {
      const enrollmentCode = String(req.body?.enrollmentCode || "").trim();
      if (!enrollmentCode || enrollmentCode.length > 256) return res.status(400).json({ success: false, code: "ENROLLMENT_CODE_INVALID", message: "کد فعال‌سازی رله معتبر نیست." });
      const current = await getAllSettingsAsObject();
      const relay = resolveRelaySettingsFromRequest(current, req.body);
      if (!relay.controlUrl || (relay.provider === "custom" && !relay.connectorUrl)) return res.status(409).json({ success: false, code: "RELAY_CONTROL_PLANE_NOT_CONFIGURED", message: "Control Plane و Connector رله انتخاب‌شده کامل تنظیم نشده‌اند." });
      const currentAssignmentProvider = String(current.relay_assignment_provider || (String(current.kourosh_cloud_provisioned || "") === "1" ? "managed_kourosh" : "")).trim();
      if (String(current.kourosh_cloud_provisioned || "") === "1" && currentAssignmentProvider === relay.provider) return res.status(409).json({ success: false, code: "RELAY_ALREADY_PROVISIONED", message: "این نصب قبلاً برای همین سرویس رله provision شده است؛ برای تعویض کلید از کد بازیابی استفاده کنید." });
      const installationId = String(current.installation_id || "").trim();
      if (!/^inst_[A-Za-z0-9_-]{24}$/.test(installationId)) return res.status(409).json({ success: false, code: "INSTALLATION_ID_NOT_READY", message: "شناسه پایدار این نصب هنوز آماده نیست." });
      const enrolled = await enrollCloudConnector({ installationId, enrollmentCode, controlPlaneUrl: relay.controlUrl, expectedConnectorEndpoint: relay.provider === "custom" ? relay.connectorUrl || undefined : undefined });
      const config: Record<string, unknown> = {
        relay_provider: relay.provider,
        relay_assignment_provider: relay.provider,
        ...(relay.provider === "custom" ? { custom_relay_control_url: relay.controlUrl, custom_relay_connector_url: enrolled.connectorEndpoint } : {}),
        kourosh_cloud_enabled: "1",
        kourosh_cloud_provisioned: "1",
        kourosh_cloud_endpoint: enrolled.connectorEndpoint,
        kourosh_cloud_assigned_store_id: enrolled.assignedStoreId,
        kourosh_cloud_assigned_public_url: enrolled.assignedPublicUrl,
        kourosh_cloud_assignment_version: String(enrolled.assignmentVersion || 1),
        kourosh_cloud_connection_state: "connecting",
        kourosh_cloud_credential_configured: "1",
        kourosh_cloud_credential_version: "1",
        kourosh_cloud_relay_mode: "telegram_and_miniapp",
        kourosh_cloud_telegram_relay_healthy: "0",
        kourosh_cloud_miniapp_relay_healthy: "0",
      };
      await persistScopedSettings(config);
      const nextSettings = { ...current, ...config };
      initializeCloudConnectorRuntime(nextSettings, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
      initializeMiniAppSnapshotRuntime(nextSettings);
      return res.json({ success: true, message: relay.provider === "custom" ? "رله شخصی ثبت شد و Connector امن در حال اتصال است." : "رله مدیریت‌شده کوروش ثبت شد و Connector امن در حال اتصال است.", data: { provider: relay.provider, assignedStoreId: enrolled.assignedStoreId, assignedPublicUrl: enrolled.assignedPublicUrl, status: getCloudConnectorRuntimeStatus() } });
    } catch (e: any) {
      const code = String(e?.code || "RELAY_ENROLLMENT_FAILED");
      if (["ENROLLMENT_CODE_INVALID", "ENROLLMENT_CODE_USED", "ENROLLMENT_CODE_EXPIRED", "ENROLLMENT_ATTEMPTS_EXCEEDED", "PUBLIC_KEY_INVALID"].includes(code)) return res.status(400).json({ success: false, code, message: "کد فعال‌سازی یا اطلاعات اتصال رله پذیرفته نشد." });
      if (code === "TENANT_EXISTS") return res.status(409).json({ success: false, code, message: "این installation از قبل در Relay ثبت شده است؛ takeover خودکار مجاز نیست." });
      return next(e);
    }
  };
  app.post("/api/settings/relay-connector/enroll", authorizeRole(["Admin"]), relayEnrollHandler);
  app.post("/api/settings/cloud-connector/enroll", authorizeRole(["Admin"]), relayEnrollHandler);

  const relayRotateHandler: RequestHandler = async (req, res, next) => {
    try {
      const recoveryCode = String(req.body?.recoveryCode || "").trim();
      if (!recoveryCode || recoveryCode.length > 256) return res.status(400).json({ success: false, code: "ENROLLMENT_CODE_INVALID", message: "کد بازیابی معتبر نیست." });
      const current = await getAllSettingsAsObject();
      const relay = resolveRelaySettingsFromRequest(current, req.body);
      if (!relay.controlUrl || (relay.provider === "custom" && !relay.connectorUrl)) return res.status(409).json({ success: false, code: "RELAY_CONTROL_PLANE_NOT_CONFIGURED", message: "Control Plane رله تنظیم نشده است." });
      const installationId = String(current.installation_id || "").trim();
      if (String(current.kourosh_cloud_provisioned || "") !== "1") return res.status(409).json({ success: false, code: "RELAY_NOT_PROVISIONED", message: "این نصب هنوز provision نشده است." });
      const rotated = await rotateCloudConnectorCredential({ installationId, recoveryCode, controlPlaneUrl: relay.controlUrl, expectedConnectorEndpoint: relay.provider === "custom" ? relay.connectorUrl || undefined : undefined });
      const config: Record<string, unknown> = { relay_provider: relay.provider, relay_assignment_provider: relay.provider, ...(relay.provider === "custom" ? { custom_relay_control_url: relay.controlUrl, custom_relay_connector_url: rotated.connectorEndpoint } : {}), kourosh_cloud_endpoint: rotated.connectorEndpoint, kourosh_cloud_assigned_store_id: rotated.assignedStoreId, kourosh_cloud_assigned_public_url: rotated.assignedPublicUrl, kourosh_cloud_assignment_version: String(rotated.assignmentVersion || 1), kourosh_cloud_connection_state: "connecting", kourosh_cloud_credential_configured: "1", kourosh_cloud_credential_version: String(rotated.credentialVersion || 1), kourosh_cloud_telegram_relay_healthy: "0", kourosh_cloud_miniapp_relay_healthy: "0" };
      await persistScopedSettings(config);
      const nextSettings = { ...current, ...config };
      initializeCloudConnectorRuntime(nextSettings, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
      initializeMiniAppSnapshotRuntime(nextSettings);
      return res.json({ success: true, message: "کلید Connector رله با موفقیت چرخش داده شد.", data: { provider: relay.provider, assignedPublicUrl: rotated.assignedPublicUrl, status: getCloudConnectorRuntimeStatus() } });
    } catch (e: any) {
      const code = String(e?.code || "RELAY_KEY_ROTATION_FAILED");
      if (["ENROLLMENT_CODE_INVALID", "ENROLLMENT_CODE_USED", "ENROLLMENT_CODE_EXPIRED", "ENROLLMENT_ATTEMPTS_EXCEEDED", "PUBLIC_KEY_INVALID"].includes(code)) return res.status(400).json({ success: false, code, message: "کد بازیابی یا کلید جدید پذیرفته نشد." });
      if (code === "TENANT_NOT_FOUND") return res.status(409).json({ success: false, code, message: "Tenant رله برای این installation پیدا نشد." });
      return next(e);
    }
  };
  app.post("/api/settings/relay-connector/rotate-key", authorizeRole(["Admin"]), relayRotateHandler);
  app.post("/api/settings/cloud-connector/rotate-key", authorizeRole(["Admin"]), relayRotateHandler);

  app.post("/api/settings/cloud-connector/prepare", authorizeRole(["Admin"]), async (_req, res, next) => {
    try {
      if (!isDevelopmentCloudProvisioningAvailable()) return res.status(409).json({ success: false, code: "CLOUD_PROVISIONING_CONTROL_PLANE_UNAVAILABLE", message: "Development provisioning در این Runtime فعال نیست." });
      const current = await getAllSettingsAsObject();
      const installationId = String(current.installation_id || "").trim();
      if (!/^inst_[A-Za-z0-9_-]{24}$/.test(installationId)) return res.status(409).json({ success: false, code: "INSTALLATION_ID_NOT_READY", message: "شناسه نصب معتبر آماده نیست." });
      const provisioned = await provisionDevelopmentCloudConnector(installationId);
      const config = { relay_provider: "managed_kourosh", relay_assignment_provider: "managed_kourosh", kourosh_cloud_enabled: "1", kourosh_cloud_provisioned: "1", kourosh_cloud_endpoint: provisioned.endpoint, kourosh_cloud_assigned_store_id: provisioned.assignedStoreId, kourosh_cloud_assigned_public_url: provisioned.assignedPublicUrl, kourosh_cloud_connection_state: "connecting", kourosh_cloud_credential_configured: provisioned.credentialConfigured ? "1" : "0", kourosh_cloud_relay_mode: "telegram_and_miniapp", kourosh_cloud_telegram_relay_healthy: "0", kourosh_cloud_miniapp_relay_healthy: "0" };
      await persistScopedSettings(config);
      const nextSettings = { ...current, ...config };
      initializeCloudConnectorRuntime(nextSettings, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
      initializeMiniAppSnapshotRuntime(nextSettings);
      return res.json({ success: true, message: "Development managed Relay provisioned.", data: getCloudConnectorRuntimeStatus() });
    } catch (e) { return next(e); }
  });

  app.post("/api/settings/local-access", authorizeRole(["Admin"]), async (req, res, next) => {
    try {
      const scoped = pickLocalAccessSettings(req.body);
      const hostname = normalizeLocalHostname(scoped.local_hostname);
      const suffix = normalizeLocalSuffix(scoped.local_domain_suffix);
      if (!hostname) return res.status(400).json({ success: false, code: "INVALID_LOCAL_HOSTNAME", message: "نام میزبان محلی معتبر نیست." });
      if (!suffix) return res.status(400).json({ success: false, code: "INVALID_LOCAL_SUFFIX", message: "Suffix محلی معتبر نیست." });
      scoped.local_hostname = hostname;
      scoped.local_domain_suffix = suffix;
      const savedKeys = await persistScopedSettings(scoped);
      return res.json({ success: true, message: "تنظیمات دسترسی محلی ذخیره شد.", data: { savedKeys } });
    } catch (e) {
      return next(e);
    }
  });

  app.post("/api/settings/telegram", authorizeRole(["Admin"]), async (req, res, next) => {
    try {
      const scoped = pickTelegramSettings(req.body);
      const current = await getAllSettingsAsObject();
      const proposed = { ...current, ...scoped };
      const transportMode = resolveTelegramTransportMode(proposed);
      const miniAppMode = resolveMiniAppPublicAccessMode(proposed);
      const relayProvider = resolveRelayProvider(proposed);
      const hasTransportInput = Object.prototype.hasOwnProperty.call(req.body || {}, "telegram_transport_mode");
      const hasMiniAppModeInput = Object.prototype.hasOwnProperty.call(req.body || {}, "miniapp_public_access_mode") || Object.prototype.hasOwnProperty.call(req.body || {}, "telegram_public_access_mode");
      const hasRelayProviderInput = Object.prototype.hasOwnProperty.call(req.body || {}, "relay_provider");

      // Persist only scopes the caller actually changed. This keeps Telegram, Mini App and Relay provider independent.
      // Legacy keys remain untouched; a full Settings UI save includes the canonical v159 keys and normalizes them explicitly.
      if (hasTransportInput) scoped.telegram_transport_mode = transportMode;
      if (hasMiniAppModeInput) scoped.miniapp_public_access_mode = miniAppMode;
      if (hasRelayProviderInput) scoped.relay_provider = relayProvider;

      if (transportMode === "proxy") {
        const proxy = String(proposed.telegram_proxy || "").trim();
        if (!proxy || !/^(socks5?|https?):\/\//i.test(proxy)) {
          return res.status(400).json({ success: false, code: "TELEGRAM_PROXY_NOT_CONFIGURED", message: "برای حالت پراکسی یک URL معتبر HTTP/HTTPS/SOCKS لازم است." });
        }
      }

      if (relayProvider === "custom") {
        const customControl = validateRelayControlUrl(proposed.custom_relay_control_url);
        const customConnector = validateRelayConnectorUrl(proposed.custom_relay_connector_url);
        if ((transportMode === "relay" || miniAppMode === "relay") && (!customControl || !customConnector)) {
          return res.status(400).json({ success: false, code: "CUSTOM_RELAY_NOT_CONFIGURED", message: "برای رله شخصی، Control HTTPS URL و Connector WSS URL معتبر لازم است." });
        }
        if (customControl) scoped.custom_relay_control_url = customControl;
        if (customConnector) scoped.custom_relay_connector_url = customConnector;
      }

      const currentRelayProvider = resolveRelayProvider(current);
      const relayProviderChanged = relayProvider !== currentRelayProvider;
      const customRelayConfigChanged = relayProvider === "custom" && (
        String(proposed.custom_relay_control_url || "").trim() !== String(current.custom_relay_control_url || "").trim()
        || String(proposed.custom_relay_connector_url || "").trim() !== String(current.custom_relay_connector_url || "").trim()
      );
      const telegramRelayNeedsValidation = transportMode === "relay" && (
        resolveTelegramTransportMode(current) !== "relay" || relayProviderChanged || customRelayConfigChanged
      );
      const miniAppRelayNeedsValidation = miniAppMode === "relay" && (
        resolveMiniAppPublicAccessMode(current) !== "relay" || relayProviderChanged || customRelayConfigChanged
      );

      if (telegramRelayNeedsValidation || miniAppRelayNeedsValidation) {
        // Start the proposed connector in-memory first. Nothing is persisted as an active strategy until health checks pass.
        initializeCloudConnectorRuntime({
          ...proposed,
          telegram_transport_mode: transportMode,
          miniapp_public_access_mode: miniAppMode,
          relay_provider: relayProvider,
        }, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });

        const connected = await waitForRelayConnection();
        if (!connected) {
          initializeCloudConnectorRuntime(current, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
          return res.status(409).json({ success: false, code: "RELAY_NOT_READY", message: "اتصال امن رله هنوز آماده نیست. مسیر قبلی بدون تغییر باقی ماند." });
        }

        if (telegramRelayNeedsValidation) {
          const botToken = String(proposed.telegram_bot_token || "").trim();
          const relayHealthy = botToken ? await validateRelayTelegramOperational(botToken) : false;
          if (!relayHealthy) {
            initializeCloudConnectorRuntime(current, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
            return res.status(409).json({ success: false, code: "RELAY_NOT_READY", message: "فعال‌سازی Transport رله فقط پس از Provisioning، اتصال امن و Health Check موفق Telegram مجاز است." });
          }
        }

        if (miniAppRelayNeedsValidation) {
          const miniAppHealthy = await validateRelayMiniAppOperational();
          if (!miniAppHealthy) {
            initializeCloudConnectorRuntime(current, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
            return res.status(409).json({ success: false, code: "RELAY_MINIAPP_NOT_READY", message: "Mini App رله فقط پس از Assigned Public URL و سلامت Connector/Gateway قابل فعال‌سازی است." });
          }
        }
      }

      if (miniAppMode === "self_hosted" || miniAppMode === "external_tunnel" || miniAppMode === "stable_tunnel") {
        const publicUrl = String(proposed.telegram_miniapp_public_url || "").trim();
        const normalizedPublicUrl = miniAppMode === "stable_tunnel"
          ? validateTelegramStableMiniAppCanonicalUrl(publicUrl)
          : validateTelegramMiniAppPublicUrl(publicUrl);
        if (!normalizedPublicUrl) return res.status(400).json({ success: false, code: miniAppMode === "stable_tunnel" ? "INVALID_TELEGRAM_STABLE_MINIAPP_URL" : "INVALID_TELEGRAM_MINIAPP_PUBLIC_URL", message: miniAppMode === "stable_tunnel" ? "برای Production یک URL ثابت HTTPS روی /miniapp.html لازم است؛ آدرس‌های موقت trycloudflare مجاز نیستند." : miniAppMode === "external_tunnel" ? "برای Tunnel یک Public HTTPS URL معتبر لازم است." : "برای Self-Hosted Mini App یک Public HTTPS URL معتبر لازم است." });
        scoped.telegram_miniapp_public_url = normalizedPublicUrl;
      }
      if (miniAppMode === "stable_tunnel") {
        const liveOriginUrl = validateMiniAppLiveOriginUrl(proposed.miniapp_live_origin_url);
        if (!liveOriginUrl) return res.status(400).json({ success: false, code: "INVALID_MINIAPP_LIVE_ORIGIN_URL", message: "برای دسترسی Live یک HTTPS Live Origin ثابت و معتبر لازم است." });
        const publicUrl = validateTelegramStableMiniAppCanonicalUrl(proposed.telegram_miniapp_public_url);
        if (!publicUrl) return res.status(400).json({ success: false, code: "INVALID_TELEGRAM_STABLE_MINIAPP_URL", message: "برای Production یک URL ثابت HTTPS روی /miniapp.html لازم است." });
        if (new URL(publicUrl).origin === new URL(liveOriginUrl).origin) {
          return res.status(400).json({
            success: false,
            code: "MINIAPP_PUBLIC_EDGE_LIVE_ORIGIN_MUST_DIFFER",
            message: "آدرس عمومی Mini App باید به Edge متصل باشد و با Live Origin فروشگاه متفاوت باشد؛ در غیر این صورت هنگام خاموش بودن فروشگاه Snapshot در دسترس نخواهد بود.",
          });
        }
        scoped.miniapp_live_origin_url = liveOriginUrl;
        scoped.miniapp_stable_tunnel_provider = resolveMiniAppStableTunnelProvider(proposed);
      }

      const savedKeys = await persistScopedSettings(scoped);
      let savedSettings: Record<string, unknown> = { ...current, ...scoped };
      let gatewayRuntimeConfig;
      try {
        // Re-read the committed settings before publishing runtime state. A successful UI save must
        // never report success while the persisted Mini App mode silently stayed on an older value.
        savedSettings = await getAllSettingsAsObject();
        if (hasTransportInput && resolveTelegramTransportMode(savedSettings) !== transportMode) {
          throw Object.assign(new Error("Persisted Telegram transport does not match the requested mode."), { code: "TELEGRAM_SETTINGS_PERSISTENCE_MISMATCH" });
        }
        if (hasMiniAppModeInput && resolveMiniAppPublicAccessMode(savedSettings) !== miniAppMode) {
          throw Object.assign(new Error("Persisted Mini App access mode does not match the requested mode."), { code: "MINIAPP_SETTINGS_PERSISTENCE_MISMATCH" });
        }
        if (hasRelayProviderInput && resolveRelayProvider(savedSettings) !== relayProvider) {
          throw Object.assign(new Error("Persisted Relay provider does not match the requested provider."), { code: "RELAY_SETTINGS_PERSISTENCE_MISMATCH" });
        }
        gatewayRuntimeConfig = writeMiniAppGatewayRuntimeConfigFromSettings(savedSettings);
      } catch (gatewayError) {
        // Keep DB settings and the standalone Gateway runtime source aligned if persistence verification
        // or the private runtime config write fails.
        const rollback = Object.fromEntries(savedKeys.map((key) => [key, current[key] == null ? "" : current[key]]));
        try { await persistScopedSettings(rollback); } catch {}
        initializeCloudConnectorRuntime(current, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
        configureTelegramTransportRuntime(current);
        throw gatewayError;
      }
      configureTelegramTransportRuntime(savedSettings);
      // Provider/strategy changes re-evaluate whether the generic Relay Connector should run at all.
      initializeCloudConnectorRuntime(savedSettings, { updateSetting: async (key, value) => { await persistScopedSettings({ [key]: value }); } });
      // Snapshot sync is independent from Relay. Re-evaluate it whenever Mini App connectivity changes.
      // It is outbound-only and never blocks Local Kourosh if Cloud is unavailable.
      initializeMiniAppSnapshotRuntime(savedSettings);
      let telegramMenuSync: { state: string; attempts: number; message?: string } | null = null;
      if (miniAppMode === "stable_tunnel") {
        telegramMenuSync = await syncTelegramMenuButton(savedSettings).catch((error) => ({
          state: "error",
          attempts: 0,
          message: error instanceof Error ? error.message : String(error || "Telegram Menu sync failed."),
        }));
      }
      return res.json({ success: true, message: "تنظیمات اتصال تلگرام و Mini App ذخیره شد.", data: { savedKeys, transportMode, miniAppMode, relayProvider, gatewayRuntimeConfig, gatewayRestartRequired: false, telegramMenuSync } });
    } catch (e) { return next(e); }
  });

  app.post("/api/settings", authorizeRole(["Admin"]), async (req, res, next) => {
    try {
      const config = pickGenericWritableSettings(req.body);
      if (Object.prototype.hasOwnProperty.call(config, "installment_contract_seller_national_code")) {
        const nationalCode = String(config.installment_contract_seller_national_code || "")
          .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
          .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
          .replace(/\D/g, "");
        if (nationalCode && nationalCode.length !== 10) {
          return res.status(400).json({ success: false, message: "کد ملی فروشنده/نماینده قانونی باید دقیقاً ۱۰ رقم باشد." });
        }
        config.installment_contract_seller_national_code = nationalCode;
      }
      await persistScopedSettings(config);
      res.json({ success: true, message: "تنظیمات با موفقیت ذخیره شد." });
    } catch (e) {
      next(e);
    }
  });
};
