import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { DB_PATH, getDbInstance } from './database';
import { computeNextBackupRun } from '../utils/backupSchedule';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKUP_DIR = path.join(__dirname, 'backups');
export const DB_FILE = DB_PATH;

export type BackupListItem = {
  fileName: string;
  size: number;
  mtime: string;
};

export type BackupValidationResult = {
  ok: true;
  integrity: 'ok';
  sqliteUserVersion: number;
  tables: string[];
  stats: Record<string, number | null>;
};

export type BackupJobStatus = {
  enabled: boolean;
  scheduled: boolean;
  cronExpr: string;
  timezone: string;
  retention: number;
  configuredAt: string;
  nextRunAt: string | null;
};

let activeBackupTask: any = null;
let activeBackupJobStatus: BackupJobStatus = {
  enabled: false,
  scheduled: false,
  cronExpr: '0 2 * * *',
  timezone: 'Asia/Tehran',
  retention: 14,
  configuredAt: new Date(0).toISOString(),
  nextRunAt: null,
};

export const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
};

const sanitizeBackupPrefix = (value?: string) => {
  const normalized = String(value || 'kourosh_inventory')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'kourosh_inventory';
};

const escapeSqliteString = (value: string) => value.replace(/'/g, "''");

const checkpointDatabase = async () => {
  const database = await getDbInstance();
  if (!database) throw new Error('Database is not available.');
  await new Promise<void>((resolve, reject) => {
    database.get('PRAGMA wal_checkpoint(FULL)', (error: Error | null) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

export const createDbSnapshotAt = async (destination: string): Promise<void> => {
  const database = await getDbInstance();
  if (!database) throw new Error('Database is not available.');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) fs.unlinkSync(destination);

  try {
    await new Promise<void>((resolve, reject) => {
      database.exec(`VACUUM INTO '${escapeSqliteString(destination)}'`, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch {
    // Fallback for older SQLite builds: checkpoint WAL first, then copy the main database file.
    await checkpointDatabase();
    fs.copyFileSync(DB_PATH, destination);
  }
};

export const createDbBackup = async (options?: { prefix?: string }) => {
  ensureBackupDir();
  if (!fs.existsSync(DB_PATH)) throw new Error('DB file not found.');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${sanitizeBackupPrefix(options?.prefix)}_${stamp}.db`;
  const dst = path.join(BACKUP_DIR, fileName);
  await createDbSnapshotAt(dst);
  return { fileName, path: dst, size: fs.statSync(dst).size, mtime: fs.statSync(dst).mtime.toISOString() };
};

export const listBackups = (): BackupListItem[] => {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith('.db'))
    .map((fileName) => {
      const backupPath = path.join(BACKUP_DIR, fileName);
      const stat = fs.statSync(backupPath);
      return { fileName, size: stat.size, mtime: stat.mtime.toISOString() };
    })
    .sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
};

export const summarizeBackups = (items: BackupListItem[] = listBackups()) => ({
  total: items.length,
  totalSize: items.reduce((sum, item) => sum + Number(item.size || 0), 0),
  newestAt: items[0]?.mtime || null,
  oldestAt: items[items.length - 1]?.mtime || null,
});

export const getBackupPath = (fileName: string) => {
  ensureBackupDir();
  const safeFileName = path.basename(String(fileName || ''));
  if (!safeFileName.toLowerCase().endsWith('.db')) throw new Error('Backup file type is invalid.');
  const backupPath = path.join(BACKUP_DIR, safeFileName);
  if (!fs.existsSync(backupPath)) throw new Error('Backup not found.');
  return backupPath;
};

export const deleteBackup = (fileName: string) => {
  fs.unlinkSync(getBackupPath(fileName));
};

export const pruneBackups = (keep: number) => {
  const normalizedKeep = Math.max(1, Math.min(365, Number(keep || 14)));
  for (const item of listBackups().slice(normalizedKeep)) {
    try {
      deleteBackup(item.fileName);
    } catch {}
  }
};

const openReadOnlyDatabase = (databasePath: string) =>
  new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (error: Error | null) => {
      if (error) reject(error);
      else resolve(database);
    });
  });

const closeDatabase = (database: sqlite3.Database) =>
  new Promise<void>((resolve, reject) => {
    database.close((error: Error | null) => (error ? reject(error) : resolve()));
  });

const dbGet = <T = any>(database: sqlite3.Database, sql: string, params: any[] = []) =>
  new Promise<T>((resolve, reject) => {
    database.get(sql, params, (error: Error | null, row: T) => (error ? reject(error) : resolve(row)));
  });

const dbAll = <T = any>(database: sqlite3.Database, sql: string, params: any[] = []) =>
  new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows: T[]) => (error ? reject(error) : resolve(rows)));
  });

export const validateBackupDatabasePath = async (databasePath: string): Promise<BackupValidationResult> => {
  if (!fs.existsSync(databasePath)) throw new Error('فایل بکاپ پیدا نشد.');
  if (fs.statSync(databasePath).size < 4096) throw new Error('فایل بکاپ خالی یا ناقص است.');

  const database = await openReadOnlyDatabase(databasePath);
  try {
    const integrityRows = await dbAll<{ integrity_check: string }>(database, 'PRAGMA integrity_check');
    const integrityMessages = integrityRows.map((row) => String(row.integrity_check || '').trim()).filter(Boolean);
    if (integrityMessages.length !== 1 || integrityMessages[0].toLowerCase() !== 'ok') {
      throw new Error(`ساختار فایل بکاپ معتبر نیست: ${integrityMessages.slice(0, 3).join('، ') || 'integrity check failed'}`);
    }

    const tableRows = await dbAll<{ name: string }>(database, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    const tables = tableRows.map((row) => String(row.name));
    for (const requiredTable of ['settings', 'users']) {
      if (!tables.includes(requiredTable)) throw new Error(`جدول ضروری ${requiredTable} در فایل بکاپ وجود ندارد.`);
    }

    const countTable = async (tableName: string): Promise<number | null> => {
      if (!tables.includes(tableName)) return null;
      const row = await dbGet<{ count: number }>(database, `SELECT COUNT(*) AS count FROM "${tableName.replace(/"/g, '""')}"`);
      return Number(row?.count || 0);
    };

    const stats: Record<string, number | null> = {};
    for (const tableName of ['users', 'settings', 'customers', 'phones', 'products', 'invoices', 'invoice_items', 'sales_orders', 'sales_order_items']) {
      stats[tableName] = await countTable(tableName);
    }
    const userVersion = await dbGet<{ user_version: number }>(database, 'PRAGMA user_version');

    return {
      ok: true,
      integrity: 'ok',
      sqliteUserVersion: Number(userVersion?.user_version || 0),
      tables,
      stats,
    };
  } finally {
    await closeDatabase(database).catch(() => undefined);
  }
};

export const checkRestoreBackup = async (fileName: string) => validateBackupDatabasePath(getBackupPath(fileName));

const stopActiveBackupTask = () => {
  if (!activeBackupTask) return;
  try {
    activeBackupTask.stop?.();
    activeBackupTask.destroy?.();
  } catch {}
  activeBackupTask = null;
};

const isValidTimezone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const getBackupJobStatus = (): BackupJobStatus => ({ ...activeBackupJobStatus });

export const startDailyBackupJob = (opts?: { cronExpr?: string; tz?: string; retention?: number; enabled?: boolean }) => {
  ensureBackupDir();
  stopActiveBackupTask();

  const timezone = String(opts?.tz || process.env.BACKUP_TZ || 'Asia/Tehran').trim() || 'Asia/Tehran';
  const cronExpr = String(opts?.cronExpr || process.env.BACKUP_CRON || '0 2 * * *').trim() || '0 2 * * *';
  const retention = Math.max(1, Math.min(365, Number(opts?.retention ?? process.env.BACKUP_RETENTION ?? 14)));
  const enabled = opts?.enabled ?? (process.env.BACKUP_ENABLED ? process.env.BACKUP_ENABLED !== '0' : true);
  const configuredAt = new Date().toISOString();

  if (!cron.validate(cronExpr)) throw new Error('Backup cron expression is invalid.');
  if (!isValidTimezone(timezone)) throw new Error('Backup timezone is invalid.');

  activeBackupJobStatus = {
    enabled: Boolean(enabled),
    scheduled: false,
    cronExpr,
    timezone,
    retention,
    configuredAt,
    nextRunAt: null,
  };

  if (!enabled) return getBackupJobStatus();

  if (process.env.BACKUP_ON_STARTUP === '1') {
    createDbBackup().then(() => pruneBackups(retention)).catch(() => undefined);
  }

  activeBackupTask = cron.schedule(
    cronExpr,
    async () => {
      try {
        await createDbBackup();
        pruneBackups(retention);
      } catch (error) {
        console.error('Scheduled database backup failed:', error);
      }
    },
    { timezone },
  );

  const cronParts = cronExpr.split(/\s+/);
  const minutePart = cronParts[0] || '0';
  const hourPart = cronParts[1] || '2';
  const weekdayPart = cronParts[4] || '*';
  const parsedHours = hourPart.split(',').map(Number).filter(Number.isFinite);
  const inferredInterval = hourPart.startsWith('*/')
    ? Number(hourPart.split('/')[1] || 6)
    : parsedHours.length > 1
      ? Math.max(1, parsedHours[1] - parsedHours[0])
      : 6;
  const inferredMode = weekdayPart !== '*' ? 'weekly' : (hourPart.includes(',') || hourPart.includes('*/')) ? 'interval' : 'daily';
  const nextRun = computeNextBackupRun({
    mode: inferredMode,
    time: `${String(parsedHours[0] ?? 2).padStart(2, '0')}:${String(Number(minutePart) || 0).padStart(2, '0')}`,
    weekdays: weekdayPart === '*' ? [6] : weekdayPart.split(',').map(Number),
    intervalHours: inferredInterval,
  }, new Date(), timezone);

  activeBackupJobStatus = {
    ...activeBackupJobStatus,
    scheduled: true,
    nextRunAt: nextRun?.toISOString() || null,
  };
  return getBackupJobStatus();
};
