// Local configuration audit only. Does not import database startup or any sender.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { loadShadowModules } from './lib/notification-rule-shadow-harness.mjs';
const { smsReminderSettingKeys, getSmsReminderReadiness } = loadShadowModules();
const db=new DatabaseSync(fileURLToPath(new URL('../server/kourosh_inventory.db',import.meta.url)),{readOnly:true});
try {
  db.exec('PRAGMA query_only=ON');db.exec('BEGIN');
  const columns=db.prepare('PRAGMA table_info(reminder_rules)').all().map(row=>row.name);
  const settings=Object.fromEntries(db.prepare(`SELECT key,value FROM settings WHERE key IN (${smsReminderSettingKeys.map(()=>'?').join(',')})`).all(...smsReminderSettingKeys).map(row=>[row.key,row.value]));
  const contracts=[
    ...[0,3,7].map(daysOffset=>({eventType:'INSTALLMENT_DUE',timingType:daysOffset?'BEFORE_DUE_DATE':'DUE_DATE',daysOffset,targetType:'installment',templateKey:'installment_due_notice'})),
    ...[3,7,30].map(daysOffset=>({eventType:'INSTALLMENT_OVERDUE',timingType:'AFTER_DUE_DATE',daysOffset,targetType:'installment',templateKey:'installment_overdue'})),
    ...[0,3,7].map(daysOffset=>({eventType:'CHECK_DUE',timingType:daysOffset?'BEFORE_DUE_DATE':'DUE_DATE',daysOffset,targetType:'check',templateKey:'check_due'})),
    {eventType:'CHECK_FAILED',timingType:'IMMEDIATE',daysOffset:0,targetType:'check',templateKey:'check_failed'},
  ];
  const rows=contracts.map(contract=>({event:contract.eventType,timing:contract.timingType,days:contract.daysOffset,
    templateKey:contract.templateKey,...getSmsReminderReadiness({...contract,enabled:true},settings)}));
  console.log(JSON.stringify({readOnly:true,columns,proposedColumnsPresent:['eventType','timingType','daysOffset','templateKey'].filter(key=>columns.includes(key)),
    ruleCounts:db.prepare('SELECT channel,enabled,COUNT(*) AS count FROM reminder_rules GROUP BY channel,enabled').all(),
    templates:rows,connectionChanges:db.prepare('SELECT total_changes() AS n').get().n},null,2));
} catch (error) { console.error('SMS_REMINDER_READINESS_AUDIT_FAILED', { name:error?.name, code:error?.code, frames:String(error?.stack||'').split('\n').slice(1,3) });process.exitCode=1; }
finally { try{db.exec('ROLLBACK');}finally{db.close();} }
