import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import moment from 'jalali-moment';
import { compile, readSource, loadShadowModules } from './lib/notification-rule-shadow-harness.mjs';
const modules = loadShadowModules();
const fixtureCredentials = { meli_payamak_username: 'fixture-user', meli_payamak_password: 'fixture-secret' };
const readiness = (input, settings) => modules.getSmsReminderReadiness(input, { ...fixtureCredentials, ...settings });
const authoring = compile(readSource('server/notifications/rules/smsReminderRuleAuthoring.ts'), {
  require(name) { assert.equal(name, './smsReminderRuleReadiness'); return modules; },
});
const db = new DatabaseSync(':memory:');
let writes = 0;
const readers = {
  allAsync: async (sql,args=[]) => db.prepare(sql).all(...args),
  getAsync: async (sql,args=[]) => db.prepare(sql).get(...args),
  runAsync: async (sql,args=[]) => {
    assert.ok(!/notification_outbox|sms_logs|notification_sent_log/i.test(sql), 'authoring cannot write delivery tables');
    writes++; const result = db.prepare(sql).run(...args); return { lastID: Number(result.lastInsertRowid), changes: Number(result.changes) };
  },
  getOverdueInstallmentsFromDb: async () => [], getPendingInstallmentChecksWithCustomer: async () => [],
};
const routes = new Map();
const api = compile(readSource('server/routes/reminderRules.routes.ts'), { require(name) {
  if (name === 'jalali-moment') return moment;
  if (name === '../database') return readers;
  if (name.endsWith('/smsReminderRuleReadiness')) return modules;
  if (name.endsWith('/smsReminderRuleAuthoring')) return authoring;
  throw Error('Unapproved route import ' + name);
} });
const app = Object.fromEntries(['get','post','put','delete'].map(method => [method, (url,...handlers) => routes.set(`${method} ${url}`, handlers)]));
api.registerReminderRulesRoutes(app, { authorizeRole: roles => { assert.deepEqual([...roles], ['Admin','Manager']); return (_q,_s,next) => next(); } });
async function request(method, url, body={}, id) {
  let status=200, data;
  const handlers = routes.get(`${method} ${url}`); assert.ok(handlers);
  const res = { status(n) { status=n; return this; }, json(value) { data=value; return this; } };
  await handlers.at(-1)({ body, params: { id } }, res, error => { throw error; });
  return { status, data };
}
const draft = (extra={}) => ({ name:'یادآوری آزمایشی', enabled:false, channel:'sms', targetType:'installment',
  eventType:'INSTALLMENT_DUE', timingType:'BEFORE_DUE_DATE', daysOffset:7, templateKey:'installment_due_notice', ...extra });
let passed=0;
async function check(name, test) { await test(); passed++; console.log('PASS ' + name); }
try {
  db.exec(`CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE reminder_rules (
    id INTEGER PRIMARY KEY,name TEXT,enabled INTEGER,channel TEXT,matchType TEXT,value INTEGER,template TEXT NOT NULL,
    installmentTemplate TEXT,checkTemplate TEXT,targetType TEXT,createdAt TEXT DEFAULT 'fixture-created',updatedAt TEXT DEFAULT 'fixture-updated');
    INSERT INTO reminder_rules(id,name,enabled,channel,matchType,value,template,installmentTemplate,checkTemplate,targetType) VALUES (1,'legacy telegram',1,'telegram','days_until',3,'original text','original installment','original check','both');`);
  for (const [key,value] of Object.entries(fixtureCredentials)) db.prepare('INSERT INTO settings VALUES (?,?)').run(key,value);
  const original = db.prepare('SELECT * FROM reminder_rules WHERE id=1').get();
  await check('unmigrated real-shaped schema refuses SMS saving; no automatic ALTER', async () => {
    const result = await request('post','/api/reminders/rules',draft());
    assert.equal(result.status,409); assert.equal(result.data.code,'SMS_RULE_MIGRATION_REQUIRED');
    assert.equal(db.prepare('PRAGMA table_info(reminder_rules)').all().some(r=>r.name==='eventType'),false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reminder_rules').get().n,1);
  });
  await check('proposed additive migration preserves legacy values and defaults to null', () => {
    db.exec(readSource('server/migrations/proposals/2026-09-15-reminder-sms-contract.sql'));
    const migrated = db.prepare('SELECT * FROM reminder_rules WHERE id=1').get();
    for (const [key,value] of Object.entries(original)) assert.equal(migrated[key],value);
    for (const key of ['eventType','timingType','daysOffset','templateKey']) assert.equal(migrated[key],null);
  });
  await check('draft without binding or selected template saves disabled', async () => {
    const result = await request('post','/api/reminders/rules',draft({templateKey:null}));
    assert.equal(result.status,200);
    const row=db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(result.data.data.id);
    assert.equal(row.enabled,0); assert.equal(row.templateKey,null); assert.equal(row.channel,'sms');
  });
  await check('enabling without provider binding rejected', async () => {
    const result=await request('post','/api/reminders/rules',draft({enabled:true}));
    assert.equal(result.status,400); assert.equal(result.data.code,'TEMPLATE_UNAVAILABLE');
  });
  db.prepare('INSERT INTO settings VALUES (?,?)').run('meli_payamak_installment_due_notice_pattern_id','123');
  let validId;
  await check('generic local due template supports 7-day rule with compatible token order', async () => {
    const result=await request('post','/api/reminders/rules',draft({enabled:true}));
    assert.equal(result.status,200); validId=result.data.data.id;
    const row=db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(validId);
    assert.equal(row.eventType,'INSTALLMENT_DUE'); assert.equal(row.matchType,'days_until'); assert.equal(row.value,7);
    assert.equal(row.channel,'sms'); assert.equal(row.template,''); assert.equal(row.templateKey,'installment_due_notice');
    assert.equal(result.data.data.readiness.expectedTokenCount,3);
    assert.equal(result.data.data.readiness.amountMeaning,'scheduled_installment_amount');
  });
  for (const patch of [{eventType:'INSTALLMENT_DUE_7'},{daysOffset:-1},{daysOffset:1.5},{daysOffset:'7'},
    {targetType:'check'},{templateKey:'payment_confirmation'},{timingType:'IMMEDIATE'}, {timingType:'DUE_DATE',daysOffset:7}, {enabled:'false'}]) {
    await check('API blocks malformed rule '+JSON.stringify(patch),async()=>{
      const result=await request('post','/api/reminders/rules',draft(patch)); assert.equal(result.status,400);
    });
  }
  await check('same-day and zero before-date rules remain valid', async () => {
    for (const timingType of ['BEFORE_DUE_DATE','DUE_DATE']) {
      const result=await request('post','/api/reminders/rules',draft({timingType,daysOffset:0,enabled:true})); assert.equal(result.status,200);
    }
  });
  await check('Telegram channel cannot be changed into SMS by updating a row',async()=>{
    const result=await request('put','/api/reminders/rules/:id',draft({enabled:true}),1);
    assert.equal(result.status,400); assert.equal(result.data.code,'CHANNEL_CHANGE_REQUIRES_NEW_RULE');
    const current=db.prepare('SELECT * FROM reminder_rules WHERE id=1').get();
    for (const [key,value] of Object.entries(original)) assert.equal(current[key],value);
  });
  await check('lost binding prevents re-enabling but disabling remains allowed',async()=>{
    db.prepare('DELETE FROM settings WHERE key=?').run('meli_payamak_installment_due_notice_pattern_id');
    assert.equal((await request('put','/api/reminders/rules/:id',{enabled:false},validId)).status,200);
    assert.equal((await request('put','/api/reminders/rules/:id',{enabled:true},validId)).status,400);
    assert.equal(db.prepare('SELECT enabled FROM reminder_rules WHERE id=?').get(validId).enabled,0);
  });
  await check('readiness endpoint has no writes and returns no provider IDs/secrets',async()=>{
    const before=writes;
    const result=await request('post','/api/reminders/rules/validate-sms',draft());
    assert.equal(writes,before); assert.equal(result.status,200);
    assert.equal(result.data.data.readiness.deliveryMode,'shadow_only');
    assert.equal(JSON.stringify(result.data).includes('pattern_id'),false);
  });
  await check('list keeps Telegram text intact and SMS readiness distinct from matched audience',async()=>{
    const result=await request('get','/api/reminders/rules');
    assert.equal(result.status,200); assert.equal(result.data.smsSchemaReady,true);
    assert.equal(result.data.data.find(row=>row.id===1).template,'original text');
    const sms=result.data.data.find(row=>row.channel==='sms'); assert.equal(sms.matchedCount,null); assert.ok(sms.readiness);
  });
  for (const days of [3,7,30]) await check('overdue '+days+' uses one compatible business/provider contract',()=>{
    const result=readiness(draft({eventType:'INSTALLMENT_OVERDUE',timingType:'AFTER_DUE_DATE',daysOffset:days,templateKey:'installment_overdue',enabled:true}),{meli_payamak_installment_overdue_pattern_id:'456'});
    assert.equal(result.ready,true); assert.equal(result.expectedTokenCount,3);
  });
  for (const days of [0,3,7]) await check('check '+days+' requires its explicit provider binding',()=>{
    const c=draft({eventType:'CHECK_DUE',targetType:'check',templateKey:'check_due',daysOffset:days,enabled:true});
    assert.equal(readiness(c,{}).ready,false);
    assert.equal(readiness(c,{[`meli_payamak_check_due_${days||'today'}_pattern_id`]:'789'}).ready,true);
  });
  await check('check failure is immediate only and arbitrary check dates cannot borrow templates',()=>{
    const failed=draft({eventType:'CHECK_FAILED',targetType:'check',templateKey:'check_failed',timingType:'IMMEDIATE',daysOffset:0,enabled:true});
    assert.equal(readiness(failed,{meli_payamak_check_failed_pattern_id:'456'}).ready,true);
    assert.equal(readiness({...failed,timingType:'BEFORE_DUE_DATE'},{}).ready,false);
    assert.equal(readiness(draft({eventType:'CHECK_DUE',targetType:'check',templateKey:'check_due',daysOffset:4}),{meli_payamak_check_due_3_pattern_id:'123'}).ready,false);
  });
  await check('another provider cannot inherit MeliPayamak readiness',()=>{
    assert.equal(readiness(draft({enabled:true}),{sms_provider:'kavenegar',meli_payamak_installment_due_notice_pattern_id:'123'}).reasonCode,'CHANNEL_UNAVAILABLE');
  });
  await check('missing account credentials or invalid Body ID cannot report ready',()=>{
    assert.equal(modules.getSmsReminderReadiness(draft({enabled:true}),{meli_payamak_installment_due_notice_pattern_id:'123'}).reasonCode,'CHANNEL_UNAVAILABLE');
    assert.equal(readiness(draft({enabled:true}),{meli_payamak_installment_due_notice_pattern_id:'9999999999999999999999999999'}).ready,false);
  });
  for (const [kind,days] of [['check',0],['check',3],['check',7],['overdue',3],['overdue',7],['overdue',30]]) {
    await check('modern '+kind+' '+days+' shadow uses stored event/timing and original amount',async()=>{
      const checkKind=kind==='check';
      const stored={id:99,...draft({enabled:1,targetType:checkKind?'check':'installment',eventType:checkKind?'CHECK_DUE':'INSTALLMENT_OVERDUE',
        timingType:checkKind?(days?'BEFORE_DUE_DATE':'DUE_DATE'):'AFTER_DUE_DATE',daysOffset:days,templateKey:checkKind?'check_due':'installment_overdue'}),
        matchType:checkKind?'days_until':'overdue_days',value:days};
      const settings={...fixtureCredentials,installation_id:'fixture',[checkKind?`meli_payamak_check_due_${days||'today'}_pattern_id`:'meli_payamak_installment_overdue_pattern_id']:'123'};
      const s=await modules.prepareSchedulerRuleShadow(settings,{getEnabledReminderRules:async ch=>ch==='sms'?[stored]:[],getAsync:async()=>({timezone:'Asia/Tehran'})});
      const dueDate=moment('2026-09-15').add(checkKind?days:-days,'day').format('YYYY-MM-DD');
      const result=modules.observeSchedulerRuleCandidate(s,{kind:checkKind?'check':'installment',mode:'sms',
        row:{paymentId:90,checkId:12,customerId:43,customerFullName:'fixture',customerPhone:'fixture',checkNumber:'fixture',dueDate,originalAmount:12000000,originalAmountDue:12000000,effectiveRemaining:12000000},
        originalEventType:checkKind?`CHECK_DUE_${days||'TODAY'}`:null,legacyDate:'2026-09-15',evaluatedAt:'2026-09-15T07:00:00Z'},()=>{})[0];
      assert.equal(result.evaluation.decisions.find(d=>d.matched)?.scheduledFor,'2026-09-15');
    });
  }
  await check('modern stored rule produces equivalent legacy-7 business decision in shadow only',async()=>{
    const stored={id:99,...draft({enabled:1}),matchType:'days_until',value:7,updatedAt:'fixture'};
    const s=await modules.prepareSchedulerRuleShadow({...fixtureCredentials,installation_id:'fixture',meli_payamak_installment_due_notice_pattern_id:'123'}, {
      getEnabledReminderRules: async ch => ch==='sms' ? [stored] : [], getAsync:async()=>({timezone:'Asia/Tehran'}) });
    const result=modules.observeSchedulerRuleCandidate(s,{kind:'installment',mode:'sms',row:{paymentId:90,customerId:43,customerFullName:'fixture',customerPhone:'fixture',dueDate:'2026-09-22',originalAmountDue:12000000,effectiveRemaining:12000000},
      originalEventType:'INSTALLMENT_DUE_7',legacyDate:'2026-09-15',evaluatedAt:'2026-09-15T07:00:00Z'},()=>{})[0];
    assert.equal(result.evaluation.decisions[0].matched,true);
    assert.deepEqual(JSON.parse(JSON.stringify(result.differences[0].codes)),['RULE_DIFFERENT']); // NULL legacy rule vs stored id is intentional provenance
    assert.equal(result.differences.length,1);
  });
  await check('disabled modern rule produces no matched decision',async()=>{
    const stored={id:99,...draft({enabled:0}),matchType:'days_until',value:7};
    const s=await modules.prepareSchedulerRuleShadow({...fixtureCredentials,installation_id:'fixture',meli_payamak_installment_due_notice_pattern_id:'123'}, {
      getEnabledReminderRules:async ch=>ch==='sms'?[stored]:[],getAsync:async()=>({timezone:'Asia/Tehran'}) });
    const result=modules.observeSchedulerRuleCandidate(s,{kind:'installment',mode:'sms',row:{paymentId:90,customerId:43,dueDate:'2026-09-22'},originalEventType:'INSTALLMENT_DUE_7',legacyDate:'2026-09-15',evaluatedAt:'2026-09-15T07:00:00Z'},()=>{})[0];
    assert.equal(result.evaluation.decisions[0].reasonCode,'RULE_DISABLED');
  });
  console.log(`${passed}/${passed} SMS rule API/readiness/shadow checks passed; isolated in-memory DB only.`);
} finally { db.close(); }
