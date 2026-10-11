import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const FLAG = 'notification_sms_rule_cutover_enabled';
const PHASE_KEY = 'notification_sms_rule_cutover_phase';

const RULE6_PHASE = 'rule6_due_today';
const FINALIZED_PHASE = 'finalized';

const RULE_ID = 6;
const APPROVED_BODY_ID = 423847;

const [command = 'status', dbArg = 'server/kourosh_inventory.db', ...rest] =
  process.argv.slice(2);

const dbPath = path.resolve(dbArg);

const confirmed = rest.includes('--confirm=RULE6_DUE_TODAY');
const finalizeConfirmed = rest.includes('--confirm=RULE6_FINALIZE');

const write =
  command === 'enable-rule6' ||
  command === 'finalize' ||
  command === 'disable';


if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({
    status: 'NOT_READY',
    code: 'DATABASE_NOT_FOUND',
    database: dbPath
  }, null, 2));
  process.exit(1);
}


if (!['status','enable-rule6','finalize','disable'].includes(command)) {
  console.error(
`Usage:
node scripts/configure-sms-rule-cutover.mjs <status|enable-rule6|finalize|disable> [db]

confirm:
--confirm=RULE6_DUE_TODAY
--confirm=RULE6_FINALIZE`
  );
  process.exit(1);
}


if (command === 'enable-rule6' && !confirmed) {
  console.error(JSON.stringify({
    status:'NOT_CHANGED',
    code:'EXPLICIT_CONFIRMATION_REQUIRED',
    required:'--confirm=RULE6_DUE_TODAY'
  },null,2));
  process.exit(1);
}


if (command === 'finalize' && !finalizeConfirmed) {
  console.error(JSON.stringify({
    status:'NOT_CHANGED',
    code:'EXPLICIT_CONFIRMATION_REQUIRED',
    required:'--confirm=RULE6_FINALIZE'
  },null,2));
  process.exit(1);
}


const db = new DatabaseSync(dbPath, { readOnly: !write });


try {

  if (!write) {
    db.exec('PRAGMA query_only=ON;');
  }


  const tables = new Set(
    db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )
    .all()
    .map(r => String(r.name))
  );


  if (!tables.has('settings') || !tables.has('reminder_rules')) {
    throw Object.assign(new Error('schema'), {
      code:'SCHEMA_NOT_READY'
    });
  }


  const columns = new Set(
    db.prepare('PRAGMA table_info(reminder_rules)')
      .all()
      .map(r=>String(r.name))
  );


  for (const col of [
    'eventType',
    'timingType',
    'daysOffset',
    'templateKey'
  ]) {
    if (!columns.has(col)) {
      throw Object.assign(
        new Error(col),
        {code:'SMS_RULE_SCHEMA_NOT_READY'}
      );
    }
  }


  const keys = [
    FLAG,
    PHASE_KEY,
    'sms_provider',
    'auto_send_installment_due',
    'meli_payamak_username',
    'meli_payamak_password',
    'meli_payamak_installment_due_notice_pattern_id'
  ];


  const values = Object.fromEntries(
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


  const rule = db.prepare(
    `SELECT id,enabled,channel,targetType,eventType,
    timingType,daysOffset,templateKey
    FROM reminder_rules
    WHERE id=?
    LIMIT 1`
  ).get(RULE_ID);


  const ruleShapeReady = Boolean(
    rule &&
    Number(rule.id)===RULE_ID &&
    Number(rule.enabled)===1 &&
    String(rule.channel)==='sms' &&
    ['installment','both'].includes(
      String(rule.targetType || '')
    ) &&
    String(rule.eventType)==='INSTALLMENT_DUE' &&
    String(rule.timingType)==='BEFORE_DUE_DATE' &&
    Number(rule.daysOffset)===0 &&
    String(rule.templateKey)==='installment_due_notice'
  );


  const provider =
    String(values.sms_provider || 'meli_payamak')
      .trim()
      .toLowerCase();


  const bodyIdReady =
    Number(
      values.meli_payamak_installment_due_notice_pattern_id || 0
    ) === APPROVED_BODY_ID;


  const accountConfigured =
    Boolean(
      String(values.meli_payamak_username || '').trim() &&
      String(values.meli_payamak_password || '').trim()
    );


  const autoSendSmsEnabled =
    ['sms','both'].includes(
      String(values.auto_send_installment_due || '')
      .trim()
      .toLowerCase()
    );


  const preflightReady =
    provider === 'meli_payamak' &&
    bodyIdReady &&
    accountConfigured &&
    autoSendSmsEnabled &&
    ruleShapeReady;



  const currentPhase =
    String(
      values[PHASE_KEY] || ''
    );


  if (command === 'enable-rule6') {

    if (!preflightReady) {

      console.error(JSON.stringify({
        status:'NOT_CHANGED',
        code:'PREFLIGHT_NOT_READY',
        checks:{
          provider:provider==='meli_payamak',
          bodyId:bodyIdReady,
          accountConfigured,
          autoSendSmsEnabled,
          ruleShapeReady
        }
      },null,2));

      process.exitCode=1;

    } else {

      db.exec('BEGIN IMMEDIATE');

      try {

        db.prepare(
          `INSERT INTO settings(key,value)
           VALUES(?,?)
           ON CONFLICT(key)
           DO UPDATE SET value=excluded.value`
        )
        .run(
          PHASE_KEY,
          RULE6_PHASE
        );


        db.prepare(
          `INSERT INTO settings(key,value)
           VALUES(?,?)
           ON CONFLICT(key)
           DO UPDATE SET value=excluded.value`
        )
        .run(
          FLAG,
          '1'
        );


        db.exec('COMMIT');

      } catch(e){

        try{db.exec('ROLLBACK')}catch{}

        throw e;
      }
    }

  }


  else if (command === 'finalize') {


    if (currentPhase !== RULE6_PHASE) {

      console.error(JSON.stringify({
        status:'NOT_CHANGED',
        code:'INVALID_CURRENT_PHASE',
        expected:RULE6_PHASE,
        actual:currentPhase || null
      },null,2));

      process.exit(1);
    }


    db.exec('BEGIN IMMEDIATE');

    try {

      db.prepare(
        `INSERT INTO settings(key,value)
         VALUES(?,?)
         ON CONFLICT(key)
         DO UPDATE SET value=excluded.value`
      )
      .run(
        PHASE_KEY,
        FINALIZED_PHASE
      );


      db.exec('COMMIT');


    } catch(e){

      try{db.exec('ROLLBACK')}catch{}

      throw e;
    }

  }


  else if (command === 'disable') {

    db.exec('BEGIN IMMEDIATE');

    try {

      db.prepare(
        `INSERT INTO settings(key,value)
         VALUES(?,?)
         ON CONFLICT(key)
         DO UPDATE SET value=excluded.value`
      )
      .run(
        FLAG,
        '0'
      );


      db.prepare(
        `INSERT INTO settings(key,value)
         VALUES(?,?)
         ON CONFLICT(key)
         DO UPDATE SET value=excluded.value`
      )
      .run(
        PHASE_KEY,
        ''
      );


      db.exec('COMMIT');


    }catch(e){

      try{db.exec('ROLLBACK')}catch{}

      throw e;
    }

  }



  const finalRows =
    db.prepare(
      'SELECT key,value FROM settings WHERE key IN (?,?)'
    )
    .all(
      FLAG,
      PHASE_KEY
    );


  const final =
    Object.fromEntries(
      finalRows.map(r=>[
        String(r.key),
        String(r.value ?? '')
      ])
    );


  console.log(JSON.stringify({

    status:
      command==='status'
      ? 'STATUS'
      : 'UPDATED',

    command,

    database:dbPath,


    cutover:{
      enabled:[
        '1',
        'true',
        'on',
        'enabled'
      ]
      .includes(
        String(final[FLAG]||'')
        .toLowerCase()
      ),

      phase:
        final[PHASE_KEY] || null,

      allowedRuleIds:[
        RULE_ID
      ]
    },


    approvedProviderContract:{
      provider:'meli_payamak',
      bodyId:APPROVED_BODY_ID,
      tokenOrder:[
        'name',
        'amount',
        'dueDate'
      ]
    },


    checks:{
      provider:provider==='meli_payamak',
      bodyId:bodyIdReady,
      accountConfigured,
      autoSendSmsEnabled,
      ruleShapeReady,
      preflightReady
    },


    secretsPrinted:false


  },null,2));


}

catch(error){

 console.error(JSON.stringify({
   status:'NOT_READY',
   code:error?.code || 'CUTOVER_CONFIG_FAILED'
 },null,2));

 process.exitCode=1;

}

finally{

 db.close();

}