import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKUP_DIR = path.join(__dirname, 'backups');
export const DB_FILE = path.join(__dirname, 'kourosh_inventory.db');

export const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
};

export const createDbBackup = async () => {
  ensureBackupDir();
  if (!fs.existsSync(DB_FILE)) throw new Error('DB file not found.');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `kourosh_inventory_${stamp}.db`;
  const dst = path.join(BACKUP_DIR, fileName);

  // NOTE: Using VACUUM INTO is safer, but requires an open connection. Here we copy after WAL checkpoint is handled by app startup.
  fs.copyFileSync(DB_FILE, dst);
  return { fileName, path: dst };
};

export const listBackups = () => {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const st = fs.statSync(p);
      return { fileName: f, size: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
  return files;
};

export const getBackupPath = (fileName: string) => {
  ensureBackupDir();
  const safe = path.basename(fileName);
  const p = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(p)) throw new Error('Backup not found.');
  return p;
};

export const deleteBackup = (fileName: string) => {
  const p = getBackupPath(fileName);
  fs.unlinkSync(p);
};

export const pruneBackups = (keep: number) => {
  if (!keep || keep < 1) return;
  const files = listBackups();
  const toDelete = files.slice(keep);
  for (const f of toDelete) {
    try { deleteBackup(f.fileName); } catch {}
  }
};

export const checkRestoreBackup = async (fileName: string) => {
  const p = getBackupPath(fileName);
  // Open backup DB as a separate connection and run sanity queries
  const db = new sqlite3.Database(p, sqlite3.OPEN_READONLY);
  const get = (sql: string, params: any[] = []) =>
    new Promise<any>((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
  try {
    const invoices = await get('SELECT COUNT(*) as c FROM invoices').catch(() => ({ c: null }));
    const products = await get('SELECT COUNT(*) as c FROM products').catch(() => ({ c: null }));
    const customers = await get('SELECT COUNT(*) as c FROM customers').catch(() => ({ c: null }));
    const sampleJoin = await get('SELECT COUNT(*) as c FROM invoice_items').catch(() => ({ c: null }));
    return { ok: true, stats: { invoices: invoices.c, products: products.c, customers: customers.c, invoice_items: sampleJoin.c } };
  } finally {
    db.close();
  }
};

export const startDailyBackupJob = (opts?: { cronExpr?: string; tz?: string; retention?: number; enabled?: boolean }) => {
  ensureBackupDir();

  const tz = opts?.tz || process.env.BACKUP_TZ || 'Asia/Tehran';
  const cronExpr = opts?.cronExpr || process.env.BACKUP_CRON || '0 2 * * *'; // 02:00 daily
  const retention = opts?.retention ?? Number(process.env.BACKUP_RETENTION || 14);
  const enabled = opts?.enabled ?? (process.env.BACKUP_ENABLED ? process.env.BACKUP_ENABLED !== '0' : true);

  if (!enabled) return;

  if (process.env.BACKUP_ON_STARTUP === '1') {
    createDbBackup().then(() => pruneBackups(retention)).catch(() => undefined);
  }

  cron.schedule(
    cronExpr,
    async () => {
      try {
        await createDbBackup();
        pruneBackups(retention);
      } catch {}
    },
    { timezone: tz }
  );
};
