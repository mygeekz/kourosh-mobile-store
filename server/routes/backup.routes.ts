import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import type { Express, RequestHandler } from 'express';
import { runPendingMigrations } from '../utils/migrationRunner';
import { ensureReminderRulesTables } from '../utils/reminderRuntimeHelpers';
import { revokeAllSessions } from '../utils/sessionAuth';
import {
  BACKUP_DIR,
  checkRestoreBackup,
  createDbBackup,
  createDbSnapshotAt,
  deleteBackup,
  getBackupJobStatus,
  getBackupPath,
  listBackups,
  pruneBackups,
  startDailyBackupJob,
  summarizeBackups,
  validateBackupDatabasePath,
} from '../backup';
import {
  beginDatabaseMaintenance,
  closeDbConnection,
  DB_PATH,
  getAllSettingsAsObject,
  getDbInstance,
  updateMultipleSettings,
} from '../database';
import {
  buildBackupCronExpr,
  normalizeWeekdays,
  sanitizeTime,
  type BackupScheduleMode,
} from '../../utils/backupSchedule';
import {
  DATABASE_RESTORE_STAGE_META,
  DATABASE_RESTORE_TOTAL_STEPS,
  type DatabaseRestoreProgressSnapshot,
  type DatabaseRestoreAuditedStage,
  type DatabaseRestoreStage,
} from '../../shared/databaseRestoreProgress';
import {
  completeDatabaseRestoreAudit,
  createDatabaseRestoreAuditDraft,
  failDatabaseRestoreAudit,
  listDatabaseRestoreHistory,
  markDatabaseRestoreAuditStage,
  setDatabaseRestoreRollbackStatus,
  setDatabaseRestoreSafetyBackup,
  type DatabaseRestoreAuditDraft,
} from '../services/databaseRestoreHistory';

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type BackupRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const MAX_BACKUP_UPLOAD_BYTES = 512 * 1024 * 1024;

const dbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BACKUP_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file: any, cb: FileFilterCallback) =>
    /\.db$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error('فایل پشتیبان باید با فرمت .db باشد.')),
});

const safeUnlink = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const clearSqliteSidecars = () => {
  safeUnlink(`${DB_PATH}-wal`);
  safeUnlink(`${DB_PATH}-shm`);
};

let restoreInProgress = false;

const RESTORE_PROGRESS_TTL_MS = 10 * 60 * 1000;
const restoreProgressRegistry = new Map<string, DatabaseRestoreProgressSnapshot>();

const createRestoreOperationId = () =>
  `restore-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeRestoreOperationId = (value: unknown) => {
  const candidate = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{12,96}$/.test(candidate) ? candidate : createRestoreOperationId();
};

const publishRestoreProgress = (
  operationId: string,
  stage: DatabaseRestoreStage,
  detail?: string,
): DatabaseRestoreProgressSnapshot => {
  const previous = restoreProgressRegistry.get(operationId);
  const meta = DATABASE_RESTORE_STAGE_META[stage];
  const now = new Date().toISOString();
  const entry = {
    stage,
    step: meta.step,
    label: meta.label,
    detail: detail || meta.detail,
    at: now,
  };
  const history = previous ? [...previous.history] : [];
  if (history.at(-1)?.stage === stage) history[history.length - 1] = entry;
  else history.push(entry);

  const snapshot: DatabaseRestoreProgressSnapshot = {
    operationId,
    status: meta.status,
    stage,
    step: meta.step,
    total: DATABASE_RESTORE_TOTAL_STEPS,
    label: meta.label,
    detail: detail || meta.detail,
    startedAt: previous?.startedAt || now,
    updatedAt: now,
    history,
  };
  restoreProgressRegistry.set(operationId, snapshot);

  if (snapshot.status === 'completed' || snapshot.status === 'failed') {
    const terminalUpdatedAt = snapshot.updatedAt;
    const cleanupTimer = setTimeout(() => {
      if (restoreProgressRegistry.get(operationId)?.updatedAt === terminalUpdatedAt) {
        restoreProgressRegistry.delete(operationId);
      }
    }, RESTORE_PROGRESS_TTL_MS);
    cleanupTimer.unref?.();
  }

  return snapshot;
};

const getRestoreProgress = (operationId: string) => restoreProgressRegistry.get(operationId) || null;

const reportRestoreStage = (
  operationId: string,
  auditDraft: DatabaseRestoreAuditDraft,
  stage: DatabaseRestoreAuditedStage,
  detail?: string,
) => {
  const snapshot = publishRestoreProgress(operationId, stage, detail);
  markDatabaseRestoreAuditStage(auditDraft, stage, snapshot.detail, snapshot.updatedAt);
  return snapshot;
};

const refreshBackupSchedulerFromRestoredSettings = async () => {
  const settings = await getAllSettingsAsObject();
  const enabled = String(settings.backup_enabled ?? '1') !== '0';
  const cronExpr = String(settings.backup_cron ?? '0 2 * * *');
  const timezone = String(settings.backup_timezone ?? 'Asia/Tehran');
  const retention = Number(settings.backup_retention ?? 14);
  return startDailyBackupJob({ enabled, cronExpr, tz: timezone, retention });
};

const reopenAndVerifyDatabase = async (reportDetail?: (detail: string) => void) => {
  reportDetail?.('در حال بازگشایی اتصال SQLite روی فایل بازیابی‌شده…');
  const database = await getDbInstance(true);
  if (!database) throw new Error('اتصال دیتابیس پس از بازیابی دوباره برقرار نشد.');

  // Startup migrations must also run after an in-process restore. Without this,
  // an older but valid backup can be copied successfully while the current app
  // still expects newer tables/columns until the next manual server restart.
  reportDetail?.('در حال اجرای مهاجرت‌های لازم روی نسخه بازیابی‌شده…');
  await runPendingMigrations(database);
  reportDetail?.('در حال بررسی جداول ضروری و قوانین یادآوری…');
  await ensureReminderRulesTables();
  reportDetail?.('در حال اعتبارسنجی دیتابیس فعال پس از بازگشایی…');
  const liveValidation = await validateBackupDatabasePath(DB_PATH);
  reportDetail?.('در حال همگام‌سازی زمان‌بندی بکاپ با تنظیمات بازیابی‌شده…');
  const scheduler = await refreshBackupSchedulerFromRestoredSettings();
  return { liveValidation, scheduler };
};

const restoreDatabaseFromPath = async (sourcePath: string, operationId: string, auditDraft: DatabaseRestoreAuditDraft) => {
  publishRestoreProgress(operationId, 'queued');
  if (restoreInProgress) {
    const error = new Error('یک عملیات بازیابی دیگر در حال اجراست. چند لحظه صبر کنید.');
    (error as Error & { statusCode?: number }).statusCode = 409;
    publishRestoreProgress(operationId, 'failed', error.message);
    throw error;
  }

  restoreInProgress = true;
  const restoreId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const stagedPath = `${DB_PATH}.restore-${restoreId}.db`;
  const previousPath = `${DB_PATH}.before-restore-${restoreId}.db`;
  let previousDatabaseMoved = false;
  let replacementActivated = false;
  let releaseDatabaseMaintenance: (() => void) | null = null;
  let safetyBackup: Awaited<ReturnType<typeof createDbBackup>> | null = null;

  console.log(`[database-restore:${restoreId}] validating source backup...`);

  try {
    reportRestoreStage(operationId, auditDraft, 'validating');
    const validation = await validateBackupDatabasePath(sourcePath);
    reportRestoreStage(operationId, auditDraft, 'safety-backup');
    const createdSafetyBackup = await createDbBackup({ prefix: 'pre-restore-safety' });
    safetyBackup = createdSafetyBackup;
    setDatabaseRestoreSafetyBackup(auditDraft, createdSafetyBackup.fileName);
    reportRestoreStage(operationId, auditDraft, 'replacing', 'در حال آماده‌سازی فایل بازیابی‌شده در مسیر موقت امن…');
    fs.copyFileSync(sourcePath, stagedPath);

    // Block any new connection from opening between detaching the old handle
    // and activating the restored database. Existing work is allowed to drain.
    releaseDatabaseMaintenance = beginDatabaseMaintenance(`database restore ${restoreId}`);

    console.log(`[database-restore:${restoreId}] draining active SQLite connection...`);
    reportRestoreStage(operationId, auditDraft, 'replacing', 'در حال تخلیه اتصال فعال و توقف درخواست‌های جدید دیتابیس…');
    await closeDbConnection({
      interruptPending: true,
      interruptAfterMs: 1500,
      reason: `database restore ${restoreId}`,
    });
    clearSqliteSidecars();

    // Switch files with same-volume renames so the live DB is never left as a
    // partially-copied file. The previous main DB remains available for an
    // immediate rollback until the replacement has reopened and passed checks.
    reportRestoreStage(operationId, auditDraft, 'replacing', 'در حال جابه‌جایی اتمیک دیتابیس فعلی و فعال‌سازی نسخه بازیابی‌شده…');
    if (fs.existsSync(DB_PATH)) {
      fs.renameSync(DB_PATH, previousPath);
      previousDatabaseMoved = true;
    }
    fs.renameSync(stagedPath, DB_PATH);
    replacementActivated = true;
    clearSqliteSidecars();

    console.log(`[database-restore:${restoreId}] reopening, migrating and verifying...`);
    reportRestoreStage(operationId, auditDraft, 'reopening');
    const runtime = await reopenAndVerifyDatabase((detail) => reportRestoreStage(operationId, auditDraft, 'reopening', detail));
    safeUnlink(previousPath);

    console.log(`[database-restore:${restoreId}] completed successfully.`);
    return {
      restoreOperationId: operationId,
      validation,
      liveValidation: runtime.liveValidation,
      scheduler: runtime.scheduler,
      safetyBackupFileName: createdSafetyBackup.fileName,
      requiresReauthentication: true,
    };
  } catch (error) {
    console.error(`[database-restore:${restoreId}] failed; starting rollback.`, error);
    publishRestoreProgress(operationId, 'rolling-back');
    try {
      await closeDbConnection({
        interruptPending: true,
        interruptAfterMs: 500,
        reason: `database restore rollback ${restoreId}`,
      }).catch(() => undefined);
      clearSqliteSidecars();

      if (replacementActivated) safeUnlink(DB_PATH);
      if (previousDatabaseMoved && fs.existsSync(previousPath)) {
        fs.renameSync(previousPath, DB_PATH);
      } else if (!fs.existsSync(DB_PATH) && safetyBackup?.path && fs.existsSync(safetyBackup.path)) {
        fs.copyFileSync(safetyBackup.path, DB_PATH);
      }

      await reopenAndVerifyDatabase((detail) => publishRestoreProgress(operationId, 'rolling-back', detail));
      setDatabaseRestoreRollbackStatus(auditDraft, 'completed');
      console.log(`[database-restore:${restoreId}] rollback completed.`);
    } catch (rollbackError) {
      setDatabaseRestoreRollbackStatus(auditDraft, 'failed');
      console.error(`[database-restore:${restoreId}] rollback failed:`, rollbackError);
    }
    const message = error instanceof Error ? error.message : 'عملیات بازیابی کامل نشد.';
    publishRestoreProgress(operationId, 'failed', message);
    throw error;
  } finally {
    safeUnlink(stagedPath);
    releaseDatabaseMaintenance?.();
    restoreInProgress = false;
  }
};

const isValidTimezone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const registerBackupRoutes = (
  app: Express,
  { authorizeRole }: BackupRouteDeps,
): void => {
  app.get('/api/settings/backup', authorizeRole(['Admin']), async (_req, res, next) => {
    const tempPath = path.join(BACKUP_DIR, `download-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
    try {
      await createDbSnapshotAt(tempPath);
      res.setHeader('Cache-Control', 'no-store');
      res.download(
        tempPath,
        `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`,
        (error) => {
          safeUnlink(tempPath);
          if (error && !res.headersSent) next(error);
        },
      );
    } catch (error) {
      safeUnlink(tempPath);
      next(error);
    }
  });

  app.post(
    '/api/settings/restore',
    authorizeRole(['Admin']),
    dbUpload.single('dbfile'),
    async (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'فایل پشتیبان انتخاب نشده است.' });
      }
      const operationId = normalizeRestoreOperationId(req.body?.restoreOperationId);
      const auditDraft = createDatabaseRestoreAuditDraft(operationId, 'external-file', req.file.originalname);
      const tempUploadPath = path.join(BACKUP_DIR, `uploaded-restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
      try {
        publishRestoreProgress(operationId, 'queued');
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.writeFileSync(tempUploadPath, req.file.buffer);
        const result = await restoreDatabaseFromPath(tempUploadPath, operationId, auditDraft);
        const revokedSessions = revokeAllSessions();
        const restoreProgress = publishRestoreProgress(operationId, 'completed');
        const restoreAudit = completeDatabaseRestoreAudit(auditDraft, restoreProgress.updatedAt);
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          success: true,
          message: 'پایگاه داده با موفقیت بازیابی، مهاجرت و دوباره متصل شد. برای امنیت، ورود مجدد انجام می‌شود.',
          data: { ...result, restoreProgress, restoreAudit, revokedSessions },
        });
      } catch (error) {
        const failureMessage = error instanceof Error ? error.message : 'عملیات بازیابی کامل نشد.';
        if (getRestoreProgress(operationId)?.status !== 'failed') {
          publishRestoreProgress(operationId, 'failed', failureMessage);
        }
        const failedProgress = getRestoreProgress(operationId);
        failDatabaseRestoreAudit(auditDraft, failureMessage, failedProgress?.updatedAt);
        next(error);
      } finally {
        safeUnlink(tempUploadPath);
      }
    },
  );

  app.get('/api/backup/restore-status/:operationId', authorizeRole(['Admin']), (req, res) => {
    const operationId = String(req.params.operationId || '').trim();
    const progress = getRestoreProgress(operationId);
    res.setHeader('Cache-Control', 'no-store');
    if (!progress) {
      return res.status(404).json({ success: false, message: 'وضعیت این عملیات بازیابی هنوز در سرور ثبت نشده است.' });
    }
    return res.json({ success: true, data: progress });
  });

  app.get('/api/backup/restore-history', authorizeRole(['Admin']), (req, res) => {
    const limit = Number(req.query.limit || 10);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: true, data: listDatabaseRestoreHistory(limit) });
  });

  app.get('/api/backup/list', authorizeRole(['Admin']), (_req, res, next) => {
    try {
      const items = listBackups();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        data: items,
        meta: {
          ...summarizeBackups(items),
          scheduler: getBackupJobStatus(),
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/backup/status', authorizeRole(['Admin']), (_req, res) => {
    const items = listBackups();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: {
        ...summarizeBackups(items),
        scheduler: getBackupJobStatus(),
        checkedAt: new Date().toISOString(),
      },
    });
  });

  app.post('/api/backup/schedule', authorizeRole(['Admin']), async (req, res, next) => {
    try {
      const modeRaw = String(req.body?.mode || 'daily').trim();
      const mode: BackupScheduleMode = modeRaw === 'weekly' || modeRaw === 'interval' ? modeRaw : 'daily';
      const enabled = Boolean(req.body?.enabled);
      const time = sanitizeTime(req.body?.time);
      const weekdays = normalizeWeekdays(req.body?.weekdays);
      const intervalHours = Math.max(1, Math.min(24, Number(req.body?.intervalHours || 6)));
      const retention = Math.max(1, Math.min(365, Number(req.body?.retention || 14)));
      const timezone = String(req.body?.timezone || 'Asia/Tehran').trim() || 'Asia/Tehran';
      if (!isValidTimezone(timezone)) {
        return res.status(400).json({ success: false, message: 'منطقه زمانی واردشده معتبر نیست.' });
      }
      const cronExpr = buildBackupCronExpr({ mode, time, weekdays, intervalHours });

      await updateMultipleSettings([
        { key: 'backup_enabled', value: enabled ? '1' : '0' },
        { key: 'backup_cron', value: cronExpr },
        { key: 'backup_timezone', value: timezone },
        { key: 'backup_retention', value: String(retention) },
        { key: 'backup_schedule_mode', value: mode },
        { key: 'backup_schedule_time', value: time },
        { key: 'backup_schedule_weekdays', value: JSON.stringify(weekdays) },
        { key: 'backup_schedule_interval_hours', value: String(intervalHours) },
      ]);

      const scheduler = startDailyBackupJob({ enabled, cronExpr, tz: timezone, retention });
      pruneBackups(retention);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        message: enabled ? 'زمان‌بندی بکاپ ذخیره و همان لحظه روی سرور فعال شد.' : 'بکاپ خودکار خاموش شد.',
        data: { enabled, mode, time, weekdays, intervalHours, timezone, retention, cronExpr, scheduler },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/backup/create', authorizeRole(['Admin']), async (_req, res, next) => {
    try {
      const created = await createDbBackup();
      const settings = await getAllSettingsAsObject();
      pruneBackups(Number(settings.backup_retention || 14));
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, message: 'بکاپ معتبر با موفقیت ایجاد شد.', data: created });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/backup/download/:file', authorizeRole(['Admin']), (req, res, next) => {
    try {
      const backupPath = getBackupPath(req.params.file);
      res.setHeader('Cache-Control', 'no-store');
      res.download(backupPath, path.basename(req.params.file));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/backup/:file', authorizeRole(['Admin']), (req, res, next) => {
    try {
      deleteBackup(req.params.file);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, message: 'بکاپ حذف شد.' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/backup/restore', authorizeRole(['Admin']), async (req, res, next) => {
    const fileName = String(req.body?.fileName || '').trim();
    if (!fileName) return res.status(400).json({ success: false, message: 'نام فایل بکاپ مشخص نیست.' });
    const operationId = normalizeRestoreOperationId(req.body?.restoreOperationId);
    const auditDraft = createDatabaseRestoreAuditDraft(operationId, 'server-backup', fileName);
    try {
      publishRestoreProgress(operationId, 'queued');
      const result = await restoreDatabaseFromPath(getBackupPath(fileName), operationId, auditDraft);
      const revokedSessions = revokeAllSessions();
      const restoreProgress = publishRestoreProgress(operationId, 'completed');
      const restoreAudit = completeDatabaseRestoreAudit(auditDraft, restoreProgress.updatedAt);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        message: 'بازیابی، مهاجرت و اتصال مجدد دیتابیس کامل شد. برای امنیت، ورود مجدد انجام می‌شود.',
        data: { ...result, restoreProgress, restoreAudit, revokedSessions },
      });
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'عملیات بازیابی کامل نشد.';
      if (getRestoreProgress(operationId)?.status !== 'failed') {
        publishRestoreProgress(operationId, 'failed', failureMessage);
      }
      const failedProgress = getRestoreProgress(operationId);
      failDatabaseRestoreAudit(auditDraft, failureMessage, failedProgress?.updatedAt);
      next(error);
    }
  });

  app.post('/api/backup/check-restore', authorizeRole(['Admin']), async (req, res, next) => {
    const fileName = String(req.body?.fileName || '').trim();
    if (!fileName) return res.status(400).json({ success: false, message: 'نام فایل بکاپ مشخص نیست.' });
    try {
      const result = await checkRestoreBackup(fileName);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, data: result, message: 'ساختار و سلامت فایل بکاپ تأیید شد.' });
    } catch (error) {
      next(error);
    }
  });
};

export const registerAdminBackupRoutes = (
  app: Express,
  { authorizeRole }: BackupRouteDeps,
): void => {
  app.get('/api/admin/backups', authorizeRole(['Admin', 'Manager']), async (_req, res, next) => {
    try {
      const data = listBackups();
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, data, meta: summarizeBackups(data) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/backups', authorizeRole(['Admin', 'Manager']), async (_req, res, next) => {
    try {
      const data = await createDbBackup();
      res.status(201).json({ success: true, data, message: 'بکاپ ایجاد شد.' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/backups/:fileName', authorizeRole(['Admin', 'Manager']), async (req, res, next) => {
    try {
      const backupPath = getBackupPath(String(req.params.fileName));
      res.setHeader('Cache-Control', 'no-store');
      res.download(backupPath);
    } catch (error) {
      next(error);
    }
  });
};
