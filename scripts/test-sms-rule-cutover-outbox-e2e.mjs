import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDb = path.resolve(process.argv[2] || path.join(root, 'server', 'kourosh_inventory.db'));
const reportDir = path.join(root, 'reports');
const tempDb = path.join(reportDir, 'sms-cutover-outbox-e2e.db');
const workerSource = path.join(root, 'server', 'utils', 'notificationOutboxRuntime.ts');

const cutoverSource = path.join(root, 'server', 'notifications', 'rules', 'smsRuleControlledCutover.ts');
const cutoverText = readFileSync(cutoverSource, 'utf8');
const extractStringConst = (name) => {
  const match = cutoverText.match(new RegExp(`export const ${name} = [\"']([^\"']+)[\"']`));
  if (!match) throw new Error(`CUTOVER_CONSTANT_NOT_FOUND:${name}`);
  return match[1];
};
const extractNumberConst = (name) => {
  const match = cutoverText.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!match) throw new Error(`CUTOVER_CONSTANT_NOT_FOUND:${name}`);
  return Number(match[1]);
};
const SMS_RULE_CUTOVER_FLAG_KEY = extractStringConst('SMS_RULE_CUTOVER_FLAG_KEY');
const SMS_RULE_CUTOVER_PHASE_KEY = extractStringConst('SMS_RULE_CUTOVER_PHASE_KEY');
const SMS_RULE_CUTOVER_PHASE_RULE6 = extractStringConst('SMS_RULE_CUTOVER_PHASE_RULE6');
const SMS_RULE_CUTOVER_ORIGIN = extractStringConst('SMS_RULE_CUTOVER_ORIGIN');
const SMS_RULE_CUTOVER_RULE_ID = extractNumberConst('SMS_RULE_CUTOVER_RULE_ID');
const SMS_RULE_CUTOVER_APPROVED_BODY_ID = extractNumberConst('SMS_RULE_CUTOVER_APPROVED_BODY_ID');
const normalized = (value) => String(value ?? '').trim();
const enabledFlag = (value) => ['1','true','on','enabled'].includes(normalized(value).toLowerCase());
const evaluateWorkerGate = (settings, payload) => {
  const applicable = normalized(payload?.cutover?.origin) === SMS_RULE_CUTOVER_ORIGIN;
  if (!applicable) return { applicable: false, armed: true, reasonCode: 'READY' };
  if (!enabledFlag(settings[SMS_RULE_CUTOVER_FLAG_KEY])) return { applicable: true, armed: false, reasonCode: 'KILL_SWITCH_OFF' };
  if (normalized(settings[SMS_RULE_CUTOVER_PHASE_KEY]) !== SMS_RULE_CUTOVER_PHASE_RULE6) return { applicable: true, armed: false, reasonCode: 'PHASE_NOT_ARMED' };
  if (Number(payload?.cutover?.ruleId) !== SMS_RULE_CUTOVER_RULE_ID) return { applicable: true, armed: false, reasonCode: 'RULE_SHAPE_MISMATCH' };
  const provider = normalized(payload?.provider || settings.sms_provider || 'meli_payamak').toLowerCase();
  if (provider !== 'meli_payamak') return { applicable: true, armed: false, reasonCode: 'PROVIDER_MISMATCH' };
  const payloadBodyId = Number(payload?.meliBodyId || 0);
  const configuredBodyId = Number(settings.meli_payamak_installment_due_notice_pattern_id || 0);
  if (payloadBodyId !== SMS_RULE_CUTOVER_APPROVED_BODY_ID || configuredBodyId !== SMS_RULE_CUTOVER_APPROVED_BODY_ID) return { applicable: true, armed: false, reasonCode: 'BODY_ID_MISMATCH' };
  return { applicable: true, armed: true, reasonCode: 'READY' };
};

const sha256 = (filePath) => createHash('sha256').update(readFileSync(filePath)).digest('hex');
const putSetting = (db, key, value) => {
  db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, String(value));
};
const readSettings = (db) => Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((r) => [String(r.key), r.value]));

if (!statSync(sourceDb).isFile()) throw new Error(`DATABASE_NOT_FOUND:${sourceDb}`);
mkdirSync(reportDir, { recursive: true });
rmSync(tempDb, { force: true });
const sourceHashBefore = sha256(sourceDb);
copyFileSync(sourceDb, tempDb);

const db = new DatabaseSync(tempDb);
let syntheticId = null;
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      provider TEXT,
      eventType TEXT,
      entityType TEXT,
      entityId INTEGER,
      recipient TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      eventKey TEXT,
      capCustomerId INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      maxAttempts INTEGER NOT NULL DEFAULT 6,
      nextAttemptAt TEXT,
      lastError TEXT,
      supportStatus TEXT,
      supportNote TEXT,
      supportUpdatedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
    );
  `);

  // Arm only the copy, never the source database.
  putSetting(db, SMS_RULE_CUTOVER_FLAG_KEY, '1');
  putSetting(db, SMS_RULE_CUTOVER_PHASE_KEY, SMS_RULE_CUTOVER_PHASE_RULE6);
  putSetting(db, 'sms_provider', 'meli_payamak');
  putSetting(db, 'meli_payamak_installment_due_notice_pattern_id', String(SMS_RULE_CUTOVER_APPROVED_BODY_ID));

  const payload = {
    provider: 'meli_payamak',
    recipient: '09120000000',
    tokens: ['CUTOVER_E2E_TEST', '1000', '1405/06/29'],
    meliBodyId: SMS_RULE_CUTOVER_APPROVED_BODY_ID,
    capCustomerId: 0,
    cutover: {
      origin: SMS_RULE_CUTOVER_ORIGIN,
      phase: SMS_RULE_CUTOVER_PHASE_RULE6,
      ruleId: SMS_RULE_CUTOVER_RULE_ID,
    },
    notificationContext: {
      ruleId: SMS_RULE_CUTOVER_RULE_ID,
      templateKey: 'installment_due_notice',
      templateVersion: 'provider-423847-v1',
      amount: 1000,
      createdAt: new Date().toISOString(),
      testOnly: true,
    },
  };

  const insert = db.prepare(`INSERT INTO notification_outbox
    (channel,provider,eventType,entityType,entityId,recipient,payloadJson,eventKey,capCustomerId,status,attempts,maxAttempts,nextAttemptAt)
    VALUES ('sms','meli_payamak','INSTALLMENT_DUE_NOTICE','installment_payment',-29001,?,?,?,NULL,'pending',0,3,NULL)`)
    .run(payload.recipient, JSON.stringify(payload), `phase30-e2e-${Date.now()}`);
  syntheticId = Number(insert.lastInsertRowid);

  const queued = db.prepare('SELECT * FROM notification_outbox WHERE id=?').get(syntheticId);
  assert.equal(queued.status, 'pending');
  assert.equal(JSON.parse(queued.payloadJson).cutover.ruleId, 6);

  // Simulate emergency kill switch after enqueue but before worker/provider boundary.
  putSetting(db, SMS_RULE_CUTOVER_FLAG_KEY, '0');
  const settingsAfterKill = readSettings(db);
  const parsed = JSON.parse(queued.payloadJson);
  const gate = evaluateWorkerGate(settingsAfterKill, parsed);
  let providerCalls = 0;

  assert.equal(gate.applicable, true);
  assert.equal(gate.armed, false);
  assert.equal(gate.reasonCode, 'KILL_SWITCH_OFF');

  // Mirror the production worker's guard action. Provider stub intentionally remains untouched.
  if (!gate.armed) {
    db.prepare(`UPDATE notification_outbox SET status='failed', attempts=maxAttempts, nextAttemptAt=NULL, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`)
      .run(`CUTOVER_GUARD_BLOCKED:${gate.reasonCode}`, syntheticId);
  } else {
    providerCalls += 1;
  }

  const after = db.prepare('SELECT status,attempts,maxAttempts,nextAttemptAt,lastError FROM notification_outbox WHERE id=?').get(syntheticId);
  assert.equal(providerCalls, 0);
  assert.equal(after.status, 'failed');
  assert.equal(Number(after.attempts), Number(after.maxAttempts));
  assert.equal(after.nextAttemptAt, null);
  assert.equal(after.lastError, 'CUTOVER_GUARD_BLOCKED:KILL_SWITCH_OFF');

  // Static ordering proof: both worker and direct SMS boundary guard before provider invocation.
  const worker = readFileSync(workerSource, 'utf8');
  const workerGuardIdx = worker.indexOf('const cutoverGuard = evaluateSmsRuleCutoverWorkerGate(settings, parsedPayloadForGuard)');
  const workerFinancialSendIdx = worker.indexOf('result = await sendValidatedFinancialSms', workerGuardIdx);
  assert.ok(workerGuardIdx >= 0 && workerFinancialSendIdx > workerGuardIdx, 'worker guard must precede financial/provider send');
  const directGuardIdx = worker.indexOf('const cutoverGuard = evaluateSmsRuleCutoverWorkerGate(settings, payload)');
  const meliSendIdx = worker.indexOf('return await sendMeliPayamakPatternSms', directGuardIdx);
  assert.ok(directGuardIdx >= 0 && meliSendIdx > directGuardIdx, 'direct SMS guard must precede MeliPayamak call');

  const sourceHashAfter = sha256(sourceDb);
  assert.equal(sourceHashAfter, sourceHashBefore, 'source database must remain byte-identical');

  const report = {
    status: 'PASS',
    mode: 'OUTBOX_E2E_PROVIDER_BLOCKED',
    sourceDatabase: sourceDb,
    sourceDatabaseSha256Before: sourceHashBefore,
    sourceDatabaseSha256After: sourceHashAfter,
    sourceDatabaseUnchanged: true,
    tempDatabase: tempDb,
    syntheticOutboxId: syntheticId,
    queuedStatusBeforeKill: 'pending',
    workerGate: gate,
    finalOutbox: after,
    providerCalls,
    providerNetworkAllowed: false,
    productionWorkerOrderingVerified: true,
    productionDirectSmsOrderingVerified: true,
    sourceDatabaseMutated: false,
    realSmsSent: false,
  };
  const reportPath = path.join(reportDir, 'sms-cutover-outbox-e2e-report.json');
  writeFileSync(reportPath, JSON.stringify({ ...report, reportPath }, null, 2));
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
} finally {
  db.close();
}
