#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dbArgIndex = args.indexOf('--db');
const dbPathOverride = dbArgIndex >= 0 && args[dbArgIndex + 1]
  ? args[dbArgIndex + 1]
  : process.env.KOUROSH_DB_PATH || process.env.DB_PATH || null;

const DEFAULT_RUNTIME_DB_PATH = path.join('server', 'kourosh_inventory.db');
const LEGACY_DOCTOR_DB_PATH = path.join('server', 'db', 'kourosh_inventory.db');

const resolveDbPath = () => path.resolve(
  process.cwd(),
  dbPathOverride || DEFAULT_RUNTIME_DB_PATH,
);

const dbPath = resolveDbPath();

const backupDir = path.resolve(process.cwd(), 'backups', 'db-schema-doctor');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `kourosh_inventory.${timestamp}.db`);

let sqlite3;

const loadSqlite3 = async () => {
  if (sqlite3) return sqlite3;
  try {
    sqlite3 = (await import('sqlite3')).default;
    return sqlite3;
  } catch (error) {
    throw new Error(`sqlite3 package is not available. Run npm install before using db:schema-doctor. ${error instanceof Error ? error.message : String(error)}`);
  }
};

const openDatabase = async (filename) => {
  const sqlite = await loadSqlite3();
  return new Promise((resolve, reject) => {
    const db = new sqlite.Database(filename, sqlite.OPEN_READWRITE, (error) => {
      if (error) reject(error);
      else resolve(db);
    });
  });
};

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });

const close = (db) =>
  new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const extractMalformedName = (error) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.match(/malformed database schema\s*\(([^)]+)\)/i)?.[1]?.trim() ?? null;
};

const quickCheck = async (db) => {
  const rows = await all(db, 'PRAGMA quick_check(1);');
  return rows.flatMap((row) => Object.values(row ?? {})).map(String);
};

const formatRows = (rows) => rows.map((row) => `${row.type}:${row.name} tbl=${row.tbl_name} root=${row.rootpage} sql=${String(row.sql ?? '').slice(0, 160)}`).join('\n');

if (!fs.existsSync(dbPath)) {
  const legacyPath = path.resolve(process.cwd(), LEGACY_DOCTOR_DB_PATH);
  const overrideHint = dbPathOverride
    ? ` The explicit override was: ${dbPathOverride}.`
    : '';
  console.error(`[db-schema-doctor] Database file was not found: ${dbPath}.${overrideHint}`);
  console.error(`[db-schema-doctor] Runtime default path is: ${path.resolve(process.cwd(), DEFAULT_RUNTIME_DB_PATH)}`);
  console.error('[db-schema-doctor] Pass an explicit path if needed: npm run db:schema-doctor -- --db server/kourosh_inventory.db');
  if (fs.existsSync(legacyPath)) {
    console.error(`[db-schema-doctor] Legacy doctor path exists but is not the runtime DB path: ${legacyPath}`);
  }
  process.exit(1);
}

let db;
try {
  db = await openDatabase(dbPath);
  let malformedObjectName = null;
  let quickCheckError = null;

  try {
    const check = await quickCheck(db);
    if (check.length === 1 && check[0].toLowerCase() === 'ok') {
      console.log(`[db-schema-doctor] SQLite quick_check is OK for ${dbPath}`);
      await close(db);
      process.exit(0);
    }
    console.warn(`[db-schema-doctor] SQLite quick_check returned: ${check.join(' | ')}`);
  } catch (error) {
    quickCheckError = error;
    malformedObjectName = extractMalformedName(error);
    console.warn(`[db-schema-doctor] SQLite quick_check failed: ${error.message}`);
    if (malformedObjectName) {
      console.warn(`[db-schema-doctor] SQLite reported malformed schema object: ${malformedObjectName}`);
    }
  }

  await run(db, 'PRAGMA writable_schema=ON;');
  const schemaRows = await all(
    db,
    `SELECT type, name, tbl_name, rootpage, sql
       FROM sqlite_schema
      WHERE name NOT LIKE 'sqlite_%'
      ORDER BY type, name`,
  );

  const suspiciousRows = schemaRows.filter((row) => {
    const name = String(row.name ?? '');
    const sql = String(row.sql ?? '');
    if (malformedObjectName && name === malformedObjectName) return true;
    if (/^\d+$/.test(name)) return true;
    if (!sql.trim()) return true;
    if (/undefined|NaN|\[object Object\]/i.test(sql)) return true;
    return false;
  });

  if (suspiciousRows.length === 0) {
    console.log('[db-schema-doctor] No directly suspicious schema rows were found.');
    if (quickCheckError) {
      console.error('[db-schema-doctor] The database still needs manual SQLite recovery. No automatic change was applied.');
      process.exitCode = 2;
    }
    await run(db, 'PRAGMA writable_schema=OFF;');
    await close(db);
    process.exit(process.exitCode ?? 0);
  }

  console.log('[db-schema-doctor] Suspicious schema rows:');
  console.log(formatRows(suspiciousRows));

  const unsafeTables = suspiciousRows.filter((row) => row.type === 'table');
  if (unsafeTables.length > 0) {
    console.error('[db-schema-doctor] Refusing to auto-quarantine table schema rows. No changes were made.');
    console.error(formatRows(unsafeTables));
    await run(db, 'PRAGMA writable_schema=OFF;');
    await close(db);
    process.exit(3);
  }

  if (!apply) {
    console.log('[db-schema-doctor] Dry run only. A backup-backed quarantine can be applied with: npm run db:schema-doctor:apply');
    await run(db, 'PRAGMA writable_schema=OFF;');
    await close(db);
    process.exit(0);
  }

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(dbPath, backupPath);
  console.log(`[db-schema-doctor] Backup created: ${backupPath}`);

  for (const row of suspiciousRows) {
    await run(db, 'DELETE FROM sqlite_schema WHERE type = ? AND name = ?;', [row.type, row.name]);
    console.log(`[db-schema-doctor] Quarantined schema row ${row.type}:${row.name}`);
  }

  await run(db, 'PRAGMA writable_schema=OFF;');
  await run(db, 'VACUUM;');
  const finalCheck = await quickCheck(db);
  console.log(`[db-schema-doctor] Final quick_check: ${finalCheck.join(' | ')}`);
  await close(db);

  if (!(finalCheck.length === 1 && finalCheck[0].toLowerCase() === 'ok')) {
    console.error('[db-schema-doctor] Final quick_check is not OK. Restore the backup and inspect manually.');
    process.exit(4);
  }

  console.log('[db-schema-doctor] Done. Start the server again.');
} catch (error) {
  if (db) {
    try { await close(db); } catch {}
  }
  console.error(`[db-schema-doctor] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
