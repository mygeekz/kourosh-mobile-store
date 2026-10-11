import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath=path.resolve(process.argv[2]||'server/kourosh_inventory.db');
const minutesArg=process.argv.find(a=>a.startsWith('--since-minutes='));
const sinceMinutes=Math.max(1,Math.min(1440,Number(minutesArg?.slice('--since-minutes='.length)||120)));
if(!fs.existsSync(dbPath)){console.error(JSON.stringify({status:'FAILED',code:'DATABASE_NOT_FOUND',database:dbPath},null,2));process.exit(1);}
const db=new DatabaseSync(dbPath,{readOnly:true});
try{
 db.exec('PRAGMA query_only=ON;');
 const settings=Object.fromEntries(db.prepare("SELECT key,value FROM settings WHERE key IN ('notification_sms_rule_cutover_enabled','notification_sms_rule_cutover_phase')").all().map(r=>[String(r.key),String(r.value??'')]));
 const enabled=['1','true','on','enabled'].includes(String(settings.notification_sms_rule_cutover_enabled||'').toLowerCase());
 const all=Object.fromEntries(db.prepare("SELECT status,COUNT(*) n FROM notification_outbox WHERE payloadJson LIKE ? GROUP BY status").all('%notification_rule_cutover_v1%').map(r=>[String(r.status),Number(r.n)]));
 const recent=Object.fromEntries(db.prepare("SELECT status,COUNT(*) n FROM notification_outbox WHERE payloadJson LIKE ? AND datetime(createdAt)>=datetime('now',?) GROUP BY status").all('%notification_rule_cutover_v1%',`-${sinceMinutes} minutes`).map(r=>[String(r.status),Number(r.n)]));
 const errors=db.prepare("SELECT COALESCE(lastError,'') error,COUNT(*) n FROM notification_outbox WHERE payloadJson LIKE ? AND status='failed' AND datetime(updatedAt)>=datetime('now',?) GROUP BY COALESCE(lastError,'') ORDER BY n DESC LIMIT 10").all('%notification_rule_cutover_v1%',`-${sinceMinutes} minutes`).map(r=>({error:String(r.error).slice(0,160),count:Number(r.n)}));
 const active=Number(recent.pending||0)+Number(recent.processing||0);
 const failed=Number(recent.failed||0);
 console.log(JSON.stringify({status:'OK',database:dbPath,sinceMinutes,cutover:{enabled,phase:settings.notification_sms_rule_cutover_phase||null},outbox:{all,recent,pendingOrProcessingRecent:active,failedRecent:failed},recentFailureReasons:errors,secretsPrinted:false,recipientsPrinted:false},null,2));
}finally{db.close();}
