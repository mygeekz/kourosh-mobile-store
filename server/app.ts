import { registerTerminalApiHandlers } from "./middleware/terminalApiHandlers";
import { createKouroshServerStarter, registerKouroshShutdownHandlers } from "./bootstrap/serverLifecycle";
import {
  KOUROSH_HTTP_PORT,
  createKouroshExpressApp,
  registerBaseHttpMiddleware,
} from "./bootstrap/appBootstrap";
import { registerKouroshAppComposition } from "./bootstrap/appComposition";
import { runPendingMigrations } from "./utils/migrationRunner";
import { ensureReminderRulesTables } from "./utils/reminderRuntimeHelpers";
import { startDailyBackupJob } from "./backup";
import {
  closeDbConnection,
  getAllSettingsAsObject,
  getDbInstance,
  updateSetting,
} from "./database";
import { authorizeRole } from "./utils/sessionAuth";
import { registerKouroshPulseDashboardRoute } from "./kouroshPulse";
import { registerPhonePriceEstimateRoute } from "./phonePriceEstimate";
import { registerPhoneMarketPriceSnapshotRoutes } from "./phoneMarketPriceSnapshots";
import { registerSupplierChannelFeedRoutes } from "./supplierChannelFeeds";
import { registerKouroshAdvisorRoutes } from "./kouroshAdvisor";
import { registerKouroshAdvisorFeedbackRoute } from "./kouroshAdvisorFeedback";
import { registerProductPriceAdvisorRoute } from "./productPriceAdvisor";
import { registerAdvisoryOperationsRoutes } from "./advisory/advisoryOperations";
import { registerAdvisoryPolicyRoutes } from "./advisory/advisoryPolicyRoutes";
import { initializeCloudConnectorRuntime, stopCloudConnectorRuntime } from "./cloud/cloudConnectorRuntime";
import { initializeMiniAppSnapshotRuntime, stopMiniAppSnapshotRuntime } from "./cloud/snapshots/miniAppSnapshotRuntime";
import { configureTelegramTransportRuntime } from "./telegram/telegramTransportRuntime";

const app = createKouroshExpressApp();
const port = KOUROSH_HTTP_PORT;

registerBaseHttpMiddleware(app);

const { reportAutomationRuntime, messagingRuntime } =
  registerKouroshAppComposition(app);

registerKouroshPulseDashboardRoute(app, authorizeRole);
registerPhonePriceEstimateRoute(app, authorizeRole);
registerPhoneMarketPriceSnapshotRoutes(app, authorizeRole);
registerSupplierChannelFeedRoutes(app, authorizeRole);
registerKouroshAdvisorRoutes(app, authorizeRole);
registerKouroshAdvisorFeedbackRoute(app, authorizeRole);
registerProductPriceAdvisorRoute(app, authorizeRole);
registerAdvisoryOperationsRoutes(app, authorizeRole);
registerAdvisoryPolicyRoutes(app, authorizeRole);

registerTerminalApiHandlers(app);

export const createApp = () => app;

export const startKouroshServer = createKouroshServerStarter({
  app,
  port,
  getDbInstance,
  runPendingMigrations,
  ensureReminderRulesTables,
  startReportSchedulers: () => reportAutomationRuntime.startReportSchedulers(),
  startOutboxWorker: messagingRuntime.startOutboxWorker,
  startAutoSendScheduler: messagingRuntime.startAutoSendScheduler,
  startCustomerTelegramNotifyScheduler:
    messagingRuntime.startCustomerTelegramNotifyScheduler,
  autoConfigureTelegramUpdateMode: messagingRuntime.autoConfigureTelegramUpdateMode,
  startTelegramPolling: messagingRuntime.startTelegramPolling,
  getAllSettingsAsObject,
  updateSetting,
  initializeCloudConnectorRuntime,
  initializeMiniAppSnapshotRuntime,
  configureTelegramTransportRuntime,
  startDailyBackupJob,
});

export const registerShutdownHandlers = (): void =>
  registerKouroshShutdownHandlers(closeDbConnection, stopCloudConnectorRuntime, stopMiniAppSnapshotRuntime);
