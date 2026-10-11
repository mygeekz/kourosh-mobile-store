import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const source = path.resolve(process.argv[2] || 'server/kourosh_inventory.db');
if (!fs.existsSync(source)) throw new Error(`DB not found: ${source}`);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-provider-explicit-'));
const tempDb = path.join(tempDir, 'test.db');
fs.copyFileSync(source, tempDb);

const script = new URL('./configure-sms-provider-explicit.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const parse = (s) => JSON.parse(String(s).trim());

try {
  const db = new DatabaseSync(tempDb);
  db.prepare("DELETE FROM settings WHERE key='sms_provider'").run();
  db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('notification_sms_rule_cutover_enabled','0');
  db.close();

  const status = parse(execFileSync(process.execPath, [script, 'status', tempDb], { encoding:'utf8' }));
  if (status.status !== 'STATUS' || status.provider.sourceAfter !== 'runtime_fallback' || status.databaseMutated !== false) throw new Error('status phase failed');

  const blocked = spawnSync(process.execPath, [script, 'apply', tempDb], { encoding:'utf8' });
  if (blocked.status === 0 || !String(blocked.stderr).includes('EXPLICIT_CONFIRMATION_REQUIRED')) throw new Error('confirmation guard failed');

  const applied = parse(execFileSync(process.execPath, [script, 'apply', tempDb, '--confirm=SET_SMS_PROVIDER_MELI_PAYAMAK'], { encoding:'utf8' }));
  if (applied.status !== 'UPDATED' || applied.provider.explicitAfter !== 'meli_payamak' || applied.provider.sourceAfter !== 'configured' || applied.databaseMutated !== true) throw new Error('apply phase failed');

  const verify = parse(execFileSync(process.execPath, [script, 'status', tempDb], { encoding:'utf8' }));
  if (verify.provider.explicitAfter !== 'meli_payamak' || verify.provider.sourceAfter !== 'configured' || verify.databaseMutated !== false) throw new Error('verify phase failed');

  console.log('PASS explicit SMS provider config: fallback detected, confirmation required, meli_payamak pinned explicitly, read-only status verified');
} finally {
  fs.rmSync(tempDir, { recursive:true, force:true });
}
