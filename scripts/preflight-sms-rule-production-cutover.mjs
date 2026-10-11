import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.argv[2] || 'server/kourosh_inventory.db');

const APPROVED_BODY_ID = 423847;
const RULE_ID = 6;

const FLAG = 'notification_sms_rule_cutover_enabled';
const PHASE_KEY = 'notification_sms_rule_cutover_phase';

const VALID_CUTOVER_PHASES = [
  'rule6_due_today',
  'finalized',
];

const FINALIZED_PHASE = 'finalized';

const expectedColumns = [
  'eventType',
  'timingType',
  'daysOffset',
  'templateKey',
];

const enabledFlag = (v) =>
  ['1','true','on','enabled']
    .includes(String(v ?? '').trim().toLowerCase());

const sha256 = (p) =>
  createHash('sha256')
    .update(fs.readFileSync(p))
    .digest('hex');


if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({
    status:'NOT_READY',
    code:'DATABASE_NOT_FOUND',
    database:dbPath
  }, null, 2));
  process.exit(1);
}


const hashBefore = sha256(dbPath);
const db = new DatabaseSync(dbPath, { readOnly:true });

let output;


try {

  db.exec('PRAGMA query_only=ON;');


  const tables = new Set(
    db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )
    .all()
    .map(r=>String(r.name))
  );


  const requiredTables = [
    'settings',
    'reminder_rules',
    'notification_outbox',
    'sms_logs',
  ];


  const missingTables =
    requiredTables.filter(
      t=>!tables.has(t)
    );


  if (missingTables.length) {
    throw Object.assign(
      new Error('schema'),
      {
        code:'SCHEMA_NOT_READY',
        missingTables
      }
    );
  }


  const integrity =
    String(
      db.prepare('PRAGMA integrity_check')
      .get()
      ?.integrity_check || ''
    );


  const foreignKeyErrors =
    db.prepare('PRAGMA foreign_key_check')
    .all()
    .length;


  const cols = new Set(
    db.prepare('PRAGMA table_info(reminder_rules)')
    .all()
    .map(r=>String(r.name))
  );


  const missingRuleColumns =
    expectedColumns.filter(
      c=>!cols.has(c)
    );


  const keys = [
    FLAG,
    PHASE_KEY,
    'sms_provider',
    'feature_sms_enabled',
    'auto_send_installment_due',
    'meli_payamak_username',
    'meli_payamak_password',
    'meli_payamak_installment_due_notice_pattern_id',
  ];


  const settings = Object.fromEntries(
    db.prepare(
      `SELECT key,value FROM settings
       WHERE key IN (${keys.map(()=>'?').join(',')})`
    )
    .all(...keys)
    .map(r=>[
      String(r.key),
      r.value
    ])
  );


  const provider =
    String(settings.sms_provider || 'meli_payamak')
    .trim()
    .toLowerCase();


  const providerSource =
    String(settings.sms_provider || '').trim()
      ? 'configured'
      : 'runtime_fallback';


  const rule =
    db.prepare(
      `SELECT id,enabled,channel,targetType,
      eventType,timingType,daysOffset,templateKey
      FROM reminder_rules
      WHERE id=?`
    )
    .get(RULE_ID);


  const ruleShapeReady = Boolean(
    rule &&
    Number(rule.id)===RULE_ID &&
    Number(rule.enabled)===1 &&
    String(rule.channel)==='sms' &&
    ['installment','both']
      .includes(String(rule.targetType || '')) &&
    String(rule.eventType)==='INSTALLMENT_DUE' &&
    String(rule.timingType)==='BEFORE_DUE_DATE' &&
    Number(rule.daysOffset)===0 &&
    String(rule.templateKey)==='installment_due_notice'
  );


  const cutoverEnabled =
    enabledFlag(settings[FLAG]);


  const cutoverPhase =
    String(settings[PHASE_KEY] || '').trim() || null;


  const cutoverFinalized =
    cutoverEnabled &&
    cutoverPhase === FINALIZED_PHASE;


  const bodyIdReady =
    Number(
      settings.meli_payamak_installment_due_notice_pattern_id || 0
    ) === APPROVED_BODY_ID;


  const accountConfigured =
    Boolean(
      String(settings.meli_payamak_username || '').trim() &&
      String(settings.meli_payamak_password || '').trim()
    );


  const featureSmsEnabled =
    enabledFlag(settings.feature_sms_enabled);


  const autoSendSmsEnabled =
    ['sms','both']
    .includes(
      String(settings.auto_send_installment_due || '')
      .trim()
      .toLowerCase()
    );


  const outboxByStatus =
    Object.fromEntries(
      db.prepare(
        "SELECT status,COUNT(*) AS n FROM notification_outbox WHERE channel='sms' GROUP BY status"
      )
      .all()
      .map(r=>[
        String(r.status),
        Number(r.n)
      ])
    );


  const cutoverByStatus =
    Object.fromEntries(
      db.prepare(
        "SELECT status,COUNT(*) AS n FROM notification_outbox WHERE payloadJson LIKE ? GROUP BY status"
      )
      .all('%notification_rule_cutover_v1%')
      .map(r=>[
        String(r.status),
        Number(r.n)
      ])
    );


  const activeCutoverRows =
    Number(cutoverByStatus.pending || 0) +
    Number(cutoverByStatus.processing || 0);


  const existingSmsBacklog =
    Number(outboxByStatus.pending || 0) +
    Number(outboxByStatus.processing || 0);


  const dueLegacySmsPending =
    Number(
      db.prepare(
        `SELECT COUNT(*) n
         FROM notification_outbox
         WHERE channel='sms'
         AND status='pending'
         AND attempts < maxAttempts
         AND (
           nextAttemptAt IS NULL
           OR datetime(nextAttemptAt)<=datetime('now')
         )`
      )
      .get()?.n || 0
    );


  const staleSmsProcessing =
    Number(
      db.prepare(
        `SELECT COUNT(*) n
         FROM notification_outbox
         WHERE channel='sms'
         AND status='processing'
         AND datetime(updatedAt)<=datetime('now','-30 minutes')`
      )
      .get()?.n || 0
    );


  const blockers = [];


  if (integrity.toLowerCase() !== 'ok')
    blockers.push('SQLITE_INTEGRITY_NOT_OK');

  if (foreignKeyErrors !== 0)
    blockers.push('FOREIGN_KEY_ERRORS');

  if (missingRuleColumns.length)
    blockers.push('SMS_RULE_SCHEMA_NOT_READY');

  if (provider !== 'meli_payamak')
    blockers.push('PROVIDER_MISMATCH');

  if (!bodyIdReady)
    blockers.push('BODY_ID_MISMATCH');

  if (!accountConfigured)
    blockers.push('SMS_ACCOUNT_NOT_CONFIGURED');

  if (!featureSmsEnabled)
    blockers.push('SMS_FEATURE_DISABLED');

  if (!autoSendSmsEnabled)
    blockers.push('AUTO_SEND_SMS_DISABLED');

  if (!ruleShapeReady)
    blockers.push('RULE6_SHAPE_NOT_READY');


  if (
    cutoverEnabled &&
    !cutoverFinalized
  ) {
    blockers.push('CUTOVER_ALREADY_ENABLED');
  }


  if (activeCutoverRows > 0)
    blockers.push('ACTIVE_CUTOVER_OUTBOX_ROWS_EXIST');

  if (dueLegacySmsPending > 0)
    blockers.push('DUE_LEGACY_SMS_PENDING_ROWS');

  if (staleSmsProcessing > 0)
    blockers.push('STALE_SMS_PROCESSING_ROWS');


  const warnings = [];


  if (
    cutoverEnabled &&
    !VALID_CUTOVER_PHASES.includes(cutoverPhase)
  ) {
    warnings.push('UNKNOWN_CUTOVER_PHASE');
  }


  if (existingSmsBacklog > 0)
    warnings.push('EXISTING_SMS_OUTBOX_BACKLOG');


  if (providerSource === 'runtime_fallback')
    warnings.push('SMS_PROVIDER_USING_RUNTIME_FALLBACK');


  output = {

    status:
      blockers.length
        ? 'NOT_READY'
        : warnings.length
          ? 'READY_WITH_WARNINGS'
          : 'READY',


    readyForArm:
      blockers.length===0 &&
      !cutoverFinalized,


    cutoverFinalized,


    database:dbPath,

    databaseSha256Before:hashBefore,


    checks:{
      integrity,
      foreignKeyErrors,
      missingRuleColumns,

      provider:{
        value:provider,
        source:providerSource,
        ready:provider==='meli_payamak'
      },

      approvedBodyId:{
        expected:APPROVED_BODY_ID,
        configured:Number(
          settings.meli_payamak_installment_due_notice_pattern_id || 0
        ),
        ready:bodyIdReady
      },

      accountConfigured,
      featureSmsEnabled,
      autoSendSmsEnabled,

      rule6ShapeReady:ruleShapeReady,

      cutoverCurrentlyEnabled:cutoverEnabled,
      cutoverPhase,
      cutoverFinalized,

      activeCutoverOutboxRows:activeCutoverRows,
      dueLegacySmsPending,
      staleSmsProcessing,
    },


    existingSmsOutbox:{
      byStatus:outboxByStatus,
      pendingOrProcessing:existingSmsBacklog
    },


    cutoverOutbox:{
      byStatus:cutoverByStatus,
      pendingOrProcessing:activeCutoverRows
    },


    blockers,
    warnings,
    secretsPrinted:false,
  };


}
catch(error){

 output = {
   status:'NOT_READY',
   readyForArm:false,
   database:dbPath,
   code:error?.code || 'PREFLIGHT_FAILED',
   missingTables:error?.missingTables,
   secretsPrinted:false,
 };

 process.exitCode=1;

}
finally{
 db.close();
}


const hashAfter = sha256(dbPath);

output.databaseSha256After = hashAfter;
output.databaseUnchanged =
  hashBefore === hashAfter;


if (!output.databaseUnchanged){

 output.status='NOT_READY';
 output.readyForArm=false;

 output.blockers=[
   ...(output.blockers || []),
   'PREFLIGHT_MUTATED_DATABASE'
 ];

 process.exitCode=1;
}


console.log(
 JSON.stringify(output,null,2)
);