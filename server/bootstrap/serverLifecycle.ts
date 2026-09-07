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
  initializeMiniAppSnapshotRuntime: (settings: Record<string, unknown>) => unknown;
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
  initializeMiniAppSnapshotRuntime,
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
        // Mandatory local startup ends here. External connectivity and background services
        // must never delay the loopback listener becoming available.
        app.listen(port, bindHost, () =>
          console.log(`Server running at http://${bindHost}:${port}`),
        );

        void Promise.resolve().then(async () => {
          const runtimeSettings = await getAllSettingsAsObject().catch(() => ({}));
          try {
            initializeCloudConnectorRuntime(runtimeSettings, { updateSetting });
          } catch (error) {
            console.error("Relay Connector initialization failed; Local Kourosh will continue without Relay.", error instanceof Error ? error.message : "unknown_error");
          }
          try {
            initializeMiniAppSnapshotRuntime(runtimeSettings);
          } catch (error) {
            console.error("Mini App Snapshot runtime initialization failed; Local Kourosh will continue without Cloud Snapshot sync.", error instanceof Error ? error.message : "unknown_error");
          }
          try {
            configureTelegramTransportRuntime(runtimeSettings);
          } catch (error) {
            console.error("Telegram transport initialization failed; Local Kourosh will continue without Telegram.", error instanceof Error ? error.message : "unknown_error");
          }

          startReportSchedulers().catch((e) =>
            console.error("Failed to start report schedulers:", e),
          );
          try { startOutboxWorker(); } catch (e) { console.error("Failed to start outbox worker:", e); }
          try { startAutoSendScheduler(); } catch (e) { console.error("Failed to start auto-send scheduler:", e); }
          try { startCustomerTelegramNotifyScheduler(); } catch (e) { console.error("Failed to start customer Telegram notify scheduler:", e); }
          autoConfigureTelegramUpdateMode()
            .catch((e) =>
              console.error("Failed to auto-configure telegram update mode:", e),
            )
            .finally(() =>
              startTelegramPolling().catch((e) =>
                console.error("Failed to start telegram polling:", e),
              ),
            );

          const enabled = String(runtimeSettings.backup_enabled ?? "1") !== "0";
          const cronExpr = String(runtimeSettings.backup_cron ?? "0 2 * * *");
          const tz = String(runtimeSettings.backup_timezone ?? "Asia/Tehran");
          const retention = Number(runtimeSettings.backup_retention ?? 14);
          try { startDailyBackupJob({ enabled, cronExpr, tz, retention }); }
          catch (e) { console.error("Failed to start daily backup job:", e); }
        }).catch((error) => {
          console.error("Optional runtime initialization failed; Local Kourosh remains available.", error instanceof Error ? error.message : "unknown_error");
        });
      })
      .catch((err) => {
        console.error("Failed to initialize database:", err);
        (process as any).exit(1);
      });
  };
};

export const registerKouroshShutdownHandlers = (closeDbConnection: AsyncTask, stopCloudConnectorRuntime: SyncTask = () => undefined, stopMiniAppSnapshotRuntime: SyncTask = () => undefined): void => {
  const cleanup = async () => {
    stopMiniAppSnapshotRuntime();
    stopCloudConnectorRuntime();
    console.log("Closing database connection...");
    await closeDbConnection();
    console.log("Exiting process.");
    (process as any).exit();
  };
  (process as any).on("SIGINT", cleanup);
  (process as any).on("SIGTERM", cleanup);
};
