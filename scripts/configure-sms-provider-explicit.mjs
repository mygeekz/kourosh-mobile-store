import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const EXPECTED_PROVIDER = 'meli_payamak';
const CUTOVER_FLAG = 'notification_sms_rule_cutover_enabled';
const CONFIRM = '--confirm=SET_SMS_PROVIDER_MELI_PAYAMAK';
const enabledFlag = (v) => ['1','true','on','enabled'].includes(String(v ?? '').trim().toLowerCase());
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const [command = 'status', dbArg = 'server/kourosh_inventory.db', ...rest] = process.argv.slice(2);
const dbPath = path.resolve(dbArg);
const write = command === 'apply';
const confirmed = rest.includes(CONFIRM);

if (!['status', 'apply'].includes(command)) {
  console.error(`Usage: node scripts/configure-sms-provider-explicit.mjs <status|apply> [db] [${CONFIRM}]`);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({ status:'NOT_READY', code:'DATABASE_NOT_FOUND', database:dbPath }, null, 2));
  process.exit(1);
}
if (write && !confirmed) {
  console.error(JSON.stringify({ status:'NOT_CHANGED', code:'EXPLICIT_CONFIRMATION_REQUIRED', required:CONFIRM }, null, 2));
  process.exit(1);
}

const hashBefore = sha256(dbPath);
const db = new DatabaseSync(dbPath, { readOnly: !write });
let output;
try {
  if (!write) db.exec('PRAGMA query_only=ON;');
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => String(r.name)));
  if (!tables.has('settings')) throw Object.assign(new Error('schema'), { code:'SETTINGS_TABLE_MISSING' });

  const rows = db.prepare('SELECT key,value FROM settings WHERE key IN (?,?)').all('sms_provider', CUTOVER_FLAG);
  const settings = Object.fromEntries(rows.map(r => [String(r.key), String(r.value ?? '')]));
  const explicitBefore = String(settings.sms_provider || '').trim();
  const resolvedBefore = (explicitBefore || EXPECTED_PROVIDER).toLowerCase();
  const cutoverEnabled = enabledFlag(settings[CUTOVER_FLAG]);

  if (resolvedBefore !== EXPECTED_PROVIDER) {
    throw Object.assign(new Error('provider mismatch'), { code:'PROVIDER_MISMATCH', current:explicitBefore || resolvedBefore });
  }
  if (write && cutoverEnabled) {
    throw Object.assign(new Error('cutover enabled'), { code:'CUTOVER_MUST_BE_DISABLED' });
  }

  let changed = false;
  if (write && explicitBefore !== EXPECTED_PROVIDER) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run('sms_provider', EXPECTED_PROVIDER);
      db.exec('COMMIT');
      changed = true;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  }

  const finalRow = db.prepare('SELECT value FROM settings WHERE key=? LIMIT 1').get('sms_provider');
  const explicitAfter = String(finalRow?.value ?? '').trim();
  output = {
    status: write ? (changed ? 'UPDATED' : 'NO_CHANGE') : 'STATUS',
    command,
    database: dbPath,
    provider: {
      expected: EXPECTED_PROVIDER,
      explicitBefore: explicitBefore || null,
      resolvedBefore,
      explicitAfter: explicitAfter || null,
      sourceAfter: explicitAfter ? 'configured' : 'runtime_fallback',
      ready: explicitAfter === EXPECTED_PROVIDER || (!write && resolvedBefore === EXPECTED_PROVIDER),
    },
    cutoverEnabled,
    changed,
    secretsPrinted: false,
  };
} catch (error) {
  output = {
    status:'NOT_READY',
    code:error?.code || 'SMS_PROVIDER_CONFIG_FAILED',
    database:dbPath,
    current:error?.current || undefined,
    secretsPrinted:false,
  };
  process.exitCode = 1;
} finally {
  db.close();
}

const hashAfter = sha256(dbPath);
output.databaseSha256Before = hashBefore;
output.databaseSha256After = hashAfter;
output.databaseMutated = hashBefore !== hashAfter;
if (!write && output.databaseMutated) {
  output.status = 'NOT_READY';
  output.code = 'STATUS_MUTATED_DATABASE';
  process.exitCode = 1;
}
console.log(JSON.stringify(output, null, 2));
