import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

function load(file, deps) {
  const module={exports:{}};
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true,
  });
  assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  vm.runInNewContext(compiled.outputText,{
    module,exports:module.exports,console:{error(){},warn(){}},
    require(name){assert.ok(Object.hasOwn(deps,name),'Unmocked import: '+name);return deps[name]},
  });
  return module.exports;
}
const messages=load('shared/messages.ts',{});
const context=load('server/utils/notificationContext.ts',{'../../shared/messages':messages});
const db=new DatabaseSync(':memory:');
// Exercise the actual log INSERT against an isolated schema; never import the application database.
db.exec(`CREATE TABLE sms_logs(id INTEGER PRIMARY KEY,createdAt TEXT,createdByUserId INTEGER,createdByUsername TEXT,
  provider TEXT,eventType TEXT,entityType TEXT,entityId INTEGER,recipient TEXT,patternId TEXT,tokensJson TEXT,success INTEGER,
  requestJson TEXT,httpStatus INTEGER,rawResponseText TEXT,durationMs INTEGER,correlationId TEXT,responseJson TEXT,error TEXT,errorText TEXT,relatedLogId INTEGER)`);
let failWrite=false;
const logs=load('server/utils/smsLogHelpers.ts',{
  './notificationContext':context,
  '../database':{runAsync:async(sql,params)=>{if(failWrite)throw Error('fixture write failed');return db.prepare(sql).run(...params)}},
});
let passed=0;
async function check(name,fn){await fn();console.log('PASS '+name);passed++}
const latest=()=>db.prepare('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 1').get();
try {
  await check('context does not infer legacy transaction, generic entity, rule or template version',()=>{
    const c=context.buildNotificationContext({eventType:'INSTALLMENT_PAYMENT_RECEIVED',entityType:'installment',entityId:77,createdAt:'2026-09-01T00:00:00Z'},{});
    assert.equal(c.sourceId,null);assert.equal(c.transactionId,null);assert.equal(c.installmentId,null);
    assert.equal(c.ruleId,null);assert.equal(c.templateVersion,null);assert.equal(c.amount.value,null);
    assert.equal(context.buildNotificationContext({eventType:'INSTALLMENT_PAYMENT_RECEIVED'},{},{transactionId:999}).sourceId,null);
  });
  await check('known typed source and rule metadata are preserved without mutation',()=>{
    const payload={sourceTransactionId:10,meta:{ruleId:4},secret:'DO_NOT_LOG'};
    const original=JSON.stringify(payload);
    const c=context.buildNotificationContext({eventType:'INSTALLMENT_PAYMENT_RECEIVED',entityType:'installment_payment',entityId:77},payload,{customerId:35,contractId:33});
    assert.equal(c.ruleId,4);assert.equal(c.sourceType,'installment_transactions');assert.equal(c.sourceId,10);
    assert.equal(c.installmentId,77);assert.equal(c.customerId,35);assert.equal(c.contractId,33);
    assert.equal(JSON.stringify(payload),original);assert.equal(JSON.stringify(c).includes('DO_NOT_LOG'),false);
  });
  await check('catalog order supplies exact display amount without conversion',()=>{
    const a=context.notificationTemplateAmount('INSTALLMENT_DUE_NOTICE','meli_payamak_installment_due_notice_pattern_id',['name','date','۱۲٬۰۰۰٬۰۰۰']);
    assert.equal(a.value,'۱۲٬۰۰۰٬۰۰۰');assert.equal(a.meaning,'installment_original_amount');
    assert.equal(context.notificationTemplateAmount('INSTALLMENT_SETTLED','meli_payamak_installment_settlement_pattern_id',['name']).value,null);
    assert.equal(context.notificationTemplateAmount('INSTALLMENT_DUE_NOTICE','unknown',['name','12000000']).value,null);
  });
  await check('SQL log keeps original retry context, token order, timestamp and relation',async()=>{
    const financialSms={context:{eventType:'INSTALLMENT_PAYMENT_RECEIVED',entityType:'installment_payment',entityId:77,createdAt:'2026-09-01T00:00:00Z'},payload:{sourceTransactionId:10,tokens:['name','۳٬۰۰۰٬۰۰۰']}};
    const c=context.buildNotificationContext(financialSms.context,financialSms.payload,{customerId:35,createdBy:null,amount:{value:'۳٬۰۰۰٬۰۰۰',meaning:'payment_received',currency:'toman'}});
    const request={financialSms,notificationContext:c};const original=JSON.stringify(request);
    await logs.insertSmsLog({provider:'meli_payamak',eventType:'INSTALLMENT_PAYMENT_RECEIVED',entityType:'installment',entityId:77,recipient:'fixture',tokens:financialSms.payload.tokens,success:false,relatedLogId:3,reqUser:{id:2,username:'retry-actor'},request,response:{validation:{reason:'AMOUNT_MISMATCH',expectedAmount:12000000,payloadAmount:3000000,password:'DO_NOT_LOG'}}});
    const row=latest(),saved=JSON.parse(row.requestJson);
    assert.equal(saved.notificationContext.createdAt,financialSms.context.createdAt);
    assert.equal(saved.notificationContext.createdBy,null);assert.equal(row.createdByUserId,2);
    assert.equal(saved.notificationContext.transactionId,10);assert.equal(saved.notificationContext.amount.value,'۳٬۰۰۰٬۰۰۰');
    assert.equal(row.tokensJson,JSON.stringify(financialSms.payload.tokens));assert.equal(row.relatedLogId,3);
    assert.equal(saved.validation.reason,'AMOUNT_MISMATCH');assert.equal(saved.validation.password,undefined);
    assert.equal(JSON.stringify(saved.financialSms),JSON.stringify(financialSms));assert.equal(JSON.stringify(request),original);
  });
  await check('unknown direct SMS context stays explicit and legacy request fields survive',async()=>{
    await logs.insertSmsLog({provider:'meli_payamak',eventType:'INSTALLMENT_COMPLETED',entityType:'installment',entityId:33,recipient:'fixture',success:true,request:{existingField:'kept'}});
    const saved=JSON.parse(latest().requestJson);assert.equal(saved.existingField,'kept');
    assert.equal(saved.notificationContext.contractId,null);assert.equal(saved.notificationContext.amount.value,null);
  });
  await check('Telegram log request remains unchanged',async()=>{
    const request={telegram:true};await logs.insertSmsLog({provider:'telegram',recipient:'fixture',success:true,request});
    assert.equal(latest().requestJson,JSON.stringify(request));
  });
  await check('log database failure does not throw into caller',async()=>{
    failWrite=true;await logs.insertSmsLog({provider:'meli_payamak',recipient:'fixture',success:true});
  });
  console.log(`${passed}/${passed} notification observability checks passed; in-memory DB only, no provider loaded`);
} finally {db.close()}
