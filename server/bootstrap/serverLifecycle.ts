import type { Express } from "express";
import { assertMiniAppMemorySessionDeployment } from "../miniapp/miniAppSession";

type DbProvider = () => Promise<any>;
type AsyncTask = () => Promise<unknown>;
type SyncTask = () => void;

type BackupSettings = Record<string, unknown> & {
  backup_enabled?: unknown;
  backup_cron?: unknown;
  backup_timezone?: unknown;
  backup_retention?: unknown;
};

type StartDailyBackupJob = (options?: {
  enabled?: boolean;
  cronExpr?: string;
  tz?: string;
  retention?: number;
}) => void;

export type KouroshServerLifecycleDeps = {
  app: Express;
  port: number;
  bindHost?: string;
  getDbInstance: DbProvider;
  runPendingMigrations: (db: any) => Promise<unknown>;
  ensureReminderRulesTables: AsyncTask;
  startReportSchedulers: AsyncTask;
  startOutboxWorker: SyncTask;
  startAutoSendScheduler: SyncTask;
  startCustomerTelegramNotifyScheduler: SyncTask;
  autoConfigureTelegramUpdateMode: AsyncTask;
  startTelegramPolling: AsyncTask;
  getAllSettingsAsObject: () => Promise<BackupSettings>;
  updateSetting: (key: string, value: string) => Promise<unknown>;
  initializeCloudConnectorRuntime: (settings: Record<string, unknown>, options: { updateSetting: (key: string, value: string) => Promise<unknown> }) => unknown;
  configureTelegramTransportRuntime: (settings: Record<string, unknown>) => unknown;
  startDailyBackupJob: StartDailyBackupJob;
};

export const createKouroshServerStarter = ({
  app,
  port,
  bindHost: configuredBindHost,
  getDbInstance,
  runPendingMigrations,
  ensureReminderRulesTables,
  startReportSchedulers,
  startOutboxWorker,
  startAutoSendScheduler,
  startCustomerTelegramNotifyScheduler,
  autoConfigureTelegramUpdateMode,
  startTelegramPolling,
  getAllSettingsAsObject,
  updateSetting,
  initializeCloudConnectorRuntime,
  configureTelegramTransportRuntime,
  startDailyBackupJob,
}: KouroshServerLifecycleDeps): SyncTask => {
  return () => {
    assertMiniAppMemorySessionDeployment();
    const bindHost = String(configuredBindHost || process.env.KOUROSH_API_BIND_HOST || "127.0.0.1").trim() || "127.0.0.1";
    getDbInstance()
      .then(async (db) => {
        if (!db) {
          console.error("Failed to get DB instance, server not started.");
          (process as any).exit(1);
        }
        await runPendingMigrations(db);
        try {
          await ensureReminderRulesTables();
        } catch {}
        const runtimeSettings = await getAllSettingsAsObject().catch(() => ({}));
        try {
          initializeCloudConnectorRuntime(runtimeSettings, { updateSetting });
        } catch (error) {
          console.error("Relay Connector initialization failed; Local Kourosh will continue without Relay.", error instanceof Error ? error.message : "unknown_error");
        }
        configureTelegramTransportRuntime(runtimeSettings);
        app.listen(port, bindHost, () =>
          console.log(`Server running at http://${bindHost}:${port}`),
        );
        startReportSchedulers().catch((e) =>
          console.error("Failed to start report schedulers:", e),
        );
        startOutboxWorker();
        startAutoSendScheduler();
        startCustomerTelegramNotifyScheduler();
        autoConfigureTelegramUpdateMode()
          .catch((e) =>
            console.error("Failed to auto-configure telegram update mode:", e),
          )
          .finally(() =>
            startTelegramPolling().catch((e) =>
              console.error("Failed to start telegram polling:", e),
            ),
          );
        getAllSettingsAsObject()
          .then((s) => {
            const enabled = String(s.backup_enabled ?? "1") !== "0";
            const cronExpr = String(s.backup_cron ?? "0 2 * * *");
            const tz = String(s.backup_timezone ?? "Asia/Tehran");
            const retention = Number(s.backup_retention ?? 14);
            startDailyBackupJob({ enabled, cronExpr, tz, retention });
          })
          .catch(() => startDailyBackupJob());
      })
      .catch((err) => {
        console.error("Failed to initialize database:", err);
        (process as any).exit(1);
      });
  };
};

export const registerKouroshShutdownHandlers = (closeDbConnection: AsyncTask, stopCloudConnectorRuntime: SyncTask = () => undefined): void => {
  const cleanup = async () => {
    stopCloudConnectorRuntime();
    console.log("Closing database connection...");
    await closeDbConnection();
    console.log("Exiting process.");
    (process as any).exit();
  };
  (process as any).on("SIGINT", cleanup);
  (process as any).on("SIGTERM", cleanup);
};
