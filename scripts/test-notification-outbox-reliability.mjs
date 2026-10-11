import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import moment from 'jalali-moment';

const require = createRequire(import.meta.url);
const now = new Date().toISOString();
const ageDate = hours => new Date(Date.parse(now) - hours * 3600000).toISOString();
function loadSource(file, dependencies = {}, logger = console) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    reportDiagnostics: true,
  });
  assert.equal((code.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(code.outputText, {
    module, exports: module.exports, console: logger,
    require: name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('.')) throw new Error('Unmocked local dependency: ' + name);
      return require(name);
    },
    setInterval() { throw new Error('No production timer allowed'); },
  });
  return module.exports;
}
const messages = loadSource('../shared/messages.ts');
const events = {
  INSTALLMENT_PAYMENT_RECEIVED: ['payment_confirmation', 341282, ['name','3000000'], 'installment_payment',77,1],
  INSTALLMENT_SALE_CREATED: ['installment_sale_created',423846,['name','33','23000000'],'installment_sale',33],
  INSTALLMENT_SETTLED: ['installment_settlement',341280,['name'],'installment_sale',33],
  ACCOUNT_BALANCE_STATUS: ['account_balance',431875,['بدهی','3000000'],'customer',35],
  INSTALLMENT_DUE_NOTICE: ['installment_due_notice',423847,['name','1405/06/23','13000000'],'installment_payment',77],
  INSTALLMENT_OVERDUE_NOTICE: ['installment_overdue',341281,['name','13000000','1405/06/23'],'installment_payment',77],
  INSTALLMENT_DUE_TODAY: ['installment_due_today',423847,['name','1405/06/23','13000000'],'installment_payment',77],
  INSTALLMENT_DUE_3: ['installment_due_3',103,['name','13000000','1405/06/23'],'installment_payment',77],
  INSTALLMENT_DUE_7: ['installment_due_7',107,['name','13000000','1405/06/23'],'installment_payment',77],
  CHECK_FAILED: ['check_failed',109,['name','1405/06/23','5000000'],'installment_check',9],
  INVOICE_PAYMENT_RECEIVED: ['invoice_payment_received',110,['name','12','7000000'],'customer',35,8],
};
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE notification_outbox (
    id INTEGER PRIMARY KEY, channel TEXT,provider TEXT,eventType TEXT,entityType TEXT,entityId INTEGER,
    recipient TEXT,payloadJson TEXT,status TEXT,attempts INTEGER,maxAttempts INTEGER,nextAttemptAt TEXT,lastError TEXT,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    telegramMessageId INTEGER,eventKey TEXT,capCustomerId INTEGER);
    CREATE TABLE notification_sent_log(id INTEGER PRIMARY KEY,dayKey TEXT,channel TEXT,eventType TEXT,entityType TEXT,entityId INTEGER,recipient TEXT);
    CREATE TABLE installment_sales(id INTEGER PRIMARY KEY,customerId INTEGER,actualSalePrice REAL);
    CREATE TABLE installment_payments(id INTEGER PRIMARY KEY,saleId INTEGER,amountDue REAL,dueDate TEXT);
    CREATE TABLE installment_transactions(id INTEGER PRIMARY KEY,installment_payment_id INTEGER,amount_paid REAL);
    CREATE TABLE customers(id INTEGER PRIMARY KEY,currentBalance REAL,fullName TEXT,phoneNumber TEXT);
    CREATE VIEW v_customer_effective_balance AS SELECT id AS customerId,currentBalance FROM customers;
    CREATE TABLE installment_checks(id INTEGER PRIMARY KEY,saleId INTEGER,amount REAL);
    CREATE TABLE customer_ledger(id INTEGER PRIMARY KEY,customerId INTEGER,debit REAL,credit REAL);
    CREATE TABLE sales_orders(id INTEGER PRIMARY KEY,customerId INTEGER,grandTotal REAL);
    CREATE TABLE sms_logs(id INTEGER PRIMARY KEY,eventType TEXT,entityType TEXT,entityId INTEGER,provider TEXT,recipient TEXT,patternId TEXT,tokensJson TEXT,requestJson TEXT,createdAt TEXT);
    INSERT INTO customers VALUES(35,3000000,'fixture-name','fixture-phone'),(36,0,'other','other');
    INSERT INTO installment_sales VALUES(33,35,23000000);
    INSERT INTO installment_payments VALUES(77,33,13000000,'1405/06/23'),(78,33,3000000,'1405/06/23');
    INSERT INTO installment_transactions VALUES(1,77,3000000),(2,77,10000000),(3,78,3000000);
    INSERT INTO installment_checks VALUES(9,33,5000000);
    INSERT INTO customer_ledger VALUES(8,35,0,7000000),(9,36,0,7000000);
    INSERT INTO sales_orders VALUES(12,35,23000000);`);
  const sends=[],logs=[],retries=[],smsLogs=[],outboxLogs=[];
  const logger=Object.fromEntries(['info','warn','error'].map(level=>[level,(...args)=>logs.push({level,args})]));
  const integrity=loadSource('../server/utils/notificationAmountIntegrity.ts',{'../../shared/messages':messages},logger);
  const context=loadSource('../server/utils/notificationContext.ts',{'../../shared/messages':messages},logger);
  const settings={sms_provider:'meli_payamak',meli_payamak_username:'fixture',meli_payamak_password:'fixture',telegram_bot_token:'fixture',telegram_chat_id:'fixture'};
  for(const [suffix,id] of Object.values(events)) settings['meli_payamak_'+suffix+'_pattern_id']=id;
  const getAsync=async(sql,params=[])=>db.prepare(sql).get(...params);
  const runAsync=async(sql,params=[])=>{const result=db.prepare(sql).run(...params);return {...result,lastID:Number(result.lastInsertRowid)}};
  let failure=false,throws=false,loggingFailure=false;
  const send=async(...args)=>{sends.push(args);if(throws)throw Error('fixture error');return failure?{success:false,message:'fixture failure'}:{success:true}};
  const sms=Object.fromEntries(['sendMeliPayamakPatternSms','sendKavenegarPatternSms','sendSmsIrPatternSms','sendIppanelPatternSms'].map(key=>[key,send]));
  const telegram={setTelegramProxy(){},sendTelegramMessage:send,sendTelegramPhoto:send,sendTelegramDocument:send};
  const clockMoment=Object.assign((...args)=>args.length?moment(...args):moment.utc(now),moment);
  const runtime=loadSource('../server/utils/notificationOutboxRuntime.ts',{
    'jalali-moment':clockMoment,'./notificationAmountIntegrity':integrity,'./notificationContext':context,'../smsService':sms,'../telegramService':telegram,
  },logger).createNotificationOutboxRuntime({
    ensureNotificationOutboxTables:async()=>{},ensureReminderRulesTables:async()=>{},
    insertSmsLog:async entry=>{if(loggingFailure)throw Error('fixture logging failure');outboxLogs.push(entry)},
    getAllSettingsAsObject:async()=>settings,getAsync,runAsync,
    hasCustomerDailyCap:async()=>false,hasPendingCustomerCapInOutbox:async()=>false,
    ensureCustomerIsNotInvalid:async()=>true,markCustomerTelegramInvalid:async()=>{},
    computeNextAllowedTelegramSendISOFromHours:()=>null,computeNextAllowedTelegramSendISO:()=>null,
    classifyTelegramError:()=>({code:'fixture'}),computeNextAttemptISO:n=>{retries.push(n);return ageDate(-1)},
    lookupCustomerTelegramChatId:async()=>'fixture',lookupPartnerTelegramChatId:async()=>'fixture',
  });
  function insert(event='INSTALLMENT_PAYMENT_RECEIVED',overrides={},payloadOverrides={}) {
    const spec=events[event]||['general',999,['name','1'],'customer',35];
    const row={id:1,channel:'sms',eventType:event,entityType:spec[3],entityId:spec[4],recipient:'fixture-phone',
      payloadJson:JSON.stringify({provider:'meli_payamak',recipient:'fixture-phone',meliBodyId:spec[1],tokens:spec[2],sourceTransactionId:spec[5],...payloadOverrides}),
      status:'pending',attempts:0,maxAttempts:6,nextAttemptAt:null,lastError:null,createdAt:ageDate(1),updatedAt:now,...overrides};
    db.prepare('INSERT INTO notification_outbox('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
    return row;
  }
  function route() {
    const handlers=new Map();
    const app={get(){},post:(path,...callbacks)=>handlers.set(path,callbacks.at(-1))};
    loadSource('../server/routes/reminderRuntime.routes.ts',{
      '../../shared/messages':messages,'../utils/notificationAmountIntegrity':integrity,'../smsService':sms,'../telegramService':telegram,
      '../database':{getAsync,allAsync:async(sql,p=[])=>db.prepare(sql).all(...p),getAllSettingsAsObject:async()=>settings,
        getInstallmentPaymentDetailsForSms:async id=>({id,saleId:33,amountDue:13000000,dueDate:'1405/06/23',customerPhoneNumber:'fixture-phone',customerFullName:'name'}),
      },
    },logger).registerReminderRuntimeRoutes(app,{
      authorizeRole:()=>()=>{},insertSmsLog:async row=>smsLogs.push(row),
      inferEntityTypeFromEvent:integrity.financialSmsEntityType,makeCorrId:()=> 'fixture',
      formatPriceForSms:String,
    });
    return async(path,req)=>{
      const res={statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
      await handlers.get(path)({params:{id:'1'},user:{id:1},...req},res,e=>{throw e});
      return res;
    };
  }
  function log(row,payload,request={financialSms:{context:row,payload}}) {
    db.prepare('INSERT INTO sms_logs VALUES(?,?,?,?,?,?,?,?,?,?)').run(1,row.eventType,row.entityType,row.entityId,
      'meli_payamak','fixture-phone',String(payload.meliBodyId),JSON.stringify(payload.tokens),JSON.stringify(request),row.createdAt);
  }
  return {db,sends,logs,retries,smsLogs,outboxLogs,context,settings,getAsync,runAsync,sms,telegram,integrity,runtime,insert,route,log,
    row:()=>db.prepare('SELECT * FROM notification_outbox WHERE id=1').get(),
    fail:(throwError=false)=>{failure=true;throws=throwError},
    failLogging:()=>{loggingFailure=true},
  };
}
let passed=0;
async function check(name,test){const f=fixture();try{await test(f);console.log('PASS '+name);passed++}finally{f.db.close()}}
function rejection(f,code){assert.equal(f.row().status,'failed');assert.match(f.row().lastError,new RegExp('^'+code+':'));assert.equal(f.sends.length,0);return JSON.parse(f.row().lastError.slice(code.length+2))}
for(const event of Object.keys(events)){
  await check(event+' valid source sends unchanged',async f=>{
    const original=f.insert(event);await f.runtime.processOneOutboxRow();
    assert.equal(f.row().status,'done');assert.equal(f.sends.length,1);assert.equal(f.row().payloadJson,original.payloadJson);
    assert.equal(JSON.stringify(f.sends[0][2]),JSON.stringify(JSON.parse(original.payloadJson).tokens));
  });
  await check(event+' seven-day expiry blocks sending and repeat selection',async f=>{
    f.insert(event,{createdAt:ageDate(24*30)});await f.runtime.processOneOutboxRow();
    const d=rejection(f,'NOTIFICATION_EXPIRED');assert.equal(d.expiredAt,ageDate(24*23));assert.equal(await f.runtime.processOneOutboxRow(),false);
  });
}
await check('max attempts are ignored without starving eligible pending rows',async f=>{
  f.insert(undefined,{attempts:6,status:'failed'});f.insert(undefined,{id:2,attempts:7});f.insert(undefined,{id:3,maxAttempts:0});
  assert.equal(await f.runtime.processOneOutboxRow(),false);assert.equal(f.sends.length,0);
  f.insert(undefined,{id:4});await f.runtime.processOneOutboxRow();assert.equal(f.sends.length,1);
});
for(const throws of [false,true]) await check('retry/backoff preserved '+throws,async f=>{
  f.fail(throws);f.insert(undefined,{attempts:4,status:'failed'});await f.runtime.processOneOutboxRow();
  assert.equal(f.row().attempts,5);assert.deepEqual(f.retries,[5]);assert.equal(await f.runtime.processOneOutboxRow(),false);
  f.db.exec('UPDATE notification_outbox SET nextAttemptAt=NULL');await f.runtime.processOneOutboxRow();
  assert.equal(f.row().attempts,6);assert.equal(f.row().status,'failed');assert.equal(await f.runtime.processOneOutboxRow(),false);assert.equal(f.sends.length,2);
});
for(const createdAt of [ageDate(24*6),ageDate(24*7),now.replace('T',' ').replace('Z','')])
  await check('fresh/boundary UTC timestamp '+createdAt,async f=>{f.insert(undefined,{createdAt});await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done')});
for(const createdAt of ['', 'bad']) await check('missing/invalid creation time blocks '+createdAt,async f=>{
  f.insert(undefined,{createdAt});await f.runtime.processOneOutboxRow();rejection(f,'VALIDATION_SOURCE_MISSING');
});
for(const sourceTransactionId of [undefined,999,3]) await check('missing/deleted/unrelated exact transaction '+sourceTransactionId,async f=>{
  f.insert(undefined,{createdAt:now}, {sourceTransactionId});await f.runtime.processOneOutboxRow();rejection(f,'VALIDATION_SOURCE_MISSING');
});
await check('wrong transaction within same installment cannot match another receipt',async f=>{
  f.insert(undefined,{}, {sourceTransactionId:2});await f.runtime.processOneOutboxRow();
  const d=rejection(f,'AMOUNT_MISMATCH');assert.equal(d.expectedAmount,10000000);assert.equal(d.payloadAmount,3000000);
});
for(const value of ['300000','30000000','-3000000','−۳٬۰۰۰٬۰۰۰','','3,00,000']){
  await check('invalid/tenfold amount blocked '+value,async f=>{
    const row=f.insert(undefined,{attempts:2},{tokens:['name',value]});await f.runtime.processOneOutboxRow();
    const d=rejection(f,'AMOUNT_MISMATCH');assert.equal(d.checkedAt,now);assert.equal(f.row().attempts,2);assert.equal(f.row().payloadJson,row.payloadJson);
    assert.equal(await f.runtime.processOneOutboxRow(),false);
  });
}
await check('Persian and Arabic digits retain exact amount',async f=>{
  f.insert(undefined,{}, {tokens:['name','٣٬٠٠٠٬٠٠٠']});await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done');
});
for(const changes of [{tokens:['name','33','3000000','date']},{meliBodyId:999},{tokens:['name;300000','3000000']}])
  await check('unverified template/token layout cannot pass '+JSON.stringify(changes),async f=>{
    f.insert(undefined,{},changes);await f.runtime.processOneOutboxRow();rejection(f,'VALIDATION_TEMPLATE_MISMATCH');
  });
await check('scheduled due reminder wrong amount blocked',async f=>{
  f.insert('INSTALLMENT_DUE_TODAY',{}, {tokens:['name','1405/06/23','1']});await f.runtime.processOneOutboxRow();rejection(f,'AMOUNT_MISMATCH');
});
await check('invoice receipt belongs to exact customer ledger source',async f=>{
  f.insert('INVOICE_PAYMENT_RECEIVED',{}, {sourceTransactionId:9});await f.runtime.processOneOutboxRow();rejection(f,'VALIDATION_SOURCE_MISSING');
});
await check('source DB exception retries without sending',async f=>{
  f.insert();f.db.exec('DROP TABLE installment_transactions');await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'pending');assert.equal(f.row().attempts,1);assert.equal(f.sends.length,0);
});
await check('balance direction is checked and credit absolute amount remains valid',async f=>{
  f.insert('ACCOUNT_BALANCE_STATUS',{}, {tokens:['طلب','3000000']});await f.runtime.processOneOutboxRow();rejection(f,'AMOUNT_MISMATCH');
  f.db.exec("UPDATE customers SET currentBalance=-3000000; UPDATE notification_outbox SET lastError=NULL,status='pending'");
  await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done');
});
await check('Telegram and nonfinancial SMS remain independent',async f=>{
  f.insert(undefined,{channel:'telegram',createdAt:ageDate(24*30),payloadJson:JSON.stringify({text:'fixture',chatId:'fixture'})});
  await f.runtime.processOneOutboxRow();f.insert('GENERAL_NOTIFICATION',{id:2,createdAt:ageDate(24*30)});
  await f.runtime.processOneOutboxRow();assert.equal(f.sends.length,2);
});
for(const scenario of ['valid','wrong','missing','expired']) await check('actual manual retry route '+scenario,async f=>{
  const row=f.insert(undefined,{createdAt:scenario==='expired'?ageDate(24*30):now});
  const payload=JSON.parse(row.payloadJson);if(scenario==='wrong')payload.sourceTransactionId=2;
  f.log(row,payload,scenario==='missing'?{}:{financialSms:{context:row,payload}});
  const res=await f.route()('/api/sms/logs/:id/retry',{});
  assert.equal(f.sends.length,scenario==='valid'?1:0);assert.equal(res.body.success,scenario==='valid');
  assert.equal(f.smsLogs.length,1);
  assert.equal(f.smsLogs[0].request.financialSms.context.createdAt,row.createdAt);
  if(scenario!=='valid')assert.equal(f.smsLogs[0].response.validation.reason,scenario==='missing'?'VALIDATION_SOURCE_MISSING':scenario==='expired'?'NOTIFICATION_EXPIRED':'AMOUNT_MISMATCH');
});
await check('manual retry of retry preserves original expiry and exact reference',async f=>{
  const row=f.insert(undefined,{createdAt:ageDate(24*30)}),payload=JSON.parse(row.payloadJson);
  f.log({...row,createdAt:ageDate(1)},payload,{financialSms:{context:row,payload}});
  const res=await f.route()('/api/sms/logs/:id/retry',{});
  assert.equal(res.body.data.validation.reason,'NOTIFICATION_EXPIRED');assert.equal(f.sends.length,0);
});
await check('manual trigger route uses same guard and preserves template order',async f=>{
  const res=await f.route()('/api/sms/trigger-event',{body:{eventType:'INSTALLMENT_DUE_TODAY',targetId:77}});
  assert.equal(res.body.success,true);assert.equal(f.sends.length,1);assert.equal(f.sends[0][2][2],'13000000');
  assert.equal(f.smsLogs[0].request.financialSms.context.entityType,'installment_payment');
});
await check('creation forwards exact source reference and scheduled sender uses canonical tokens',async f=>{
  const queued=[];
  const producer=loadSource('../server/utils/telegramEventNotificationRuntime.ts',{'../../shared/messages':messages,'./notificationContext':f.context,
    '../notifications/rules/schedulerRuleShadow':{}}, {warn(){},error(){}}).createTelegramEventNotificationRuntime({
    getAllSettingsAsObject:async()=>f.settings,getAsync:f.getAsync,enqueueOutbox:async x=>{queued.push(x);return{queued:true,id:1}},
    getInstallmentPaymentDetailsForSms:async()=>({id:77,saleId:33,amountDue:13000000,dueDate:'1405/06/23',customerFullName:'name',customerPhoneNumber:'fixture-phone'}),
    formatPriceForSms:String,buildAppLink:()=>'',buildTelegramDeepLinkKeyboard:()=>null,
    getTelegramTemplateForAudience:()=>({template:''}),safeReplaceTemplate:()=>'',normalizeTelegramParseMode:()=> 'HTML',
  });
  await producer.sendCustomCustomerNotification('INSTALLMENT_PAYMENT_RECEIVED',77,'sms',{amount:3000000,sourceTransactionId:1});
  assert.equal(queued[0].payload.sourceTransactionId,1);assert.equal(queued[0].payload.tokens[1],'3000000');
  assert.equal(queued[0].payload.notificationContext.amount.value,'3000000');
  assert.equal(queued[0].payload.notificationContext.amount.meaning,'payment_received');
  assert.equal(queued[0].payload.notificationContext.contractId,33);
  await producer.enqueueEventNotifications('INSTALLMENT_DUE_TODAY',77,'sms');
  const scheduled=queued.at(-1);
  const validation=await f.integrity.validateFinancialSms({...scheduled,createdAt:now},scheduled.payload,f.getAsync,f.settings,now);
  assert.equal(validation,null);assert.equal(scheduled.payload.tokens[2],'13000000');
  assert.equal(scheduled.payload.notificationContext.amount.meaning,'installment_original_amount');
  assert.equal(scheduled.payload.notificationContext.amount.value,'13000000');
});
await check('installment creation stores the ID returned by the repository, not a request ID',async f=>{
  const notifications=[];
  const service=loadSource('../server/services/installments.service.ts',{
    '../../utils/exactNumber':{formatExactNumberText:String},'../../shared/messages':messages,
    '../utils/notificationAmountIntegrity':f.integrity,'../smsService':f.sms,'../telegramService':f.telegram,
    '../database':{getAsync:f.getAsync,getAllSettingsAsObject:async()=>f.settings},'../validators':{},
    '../repositories/installments.repo':{installmentsRepo:{getInstallmentPaymentSaleId:async()=>null,addInstallmentTransaction:async()=>({id:456})}},
  }).installmentsService;
  const result=await service.recordInstallmentPaymentTransaction({paymentId:77,body:{amount:3000000,date:'2026-09-14',sourceTransactionId:999},notifyCustomer:async(...args)=>notifications.push(args)});
  assert.equal(result.data.id,456);assert.equal(notifications[0][3].sourceTransactionId,456);
  assert.equal(notifications[0][3].amount,3000000);assert.equal(f.sends.length,0);
});
await check('invoice receipt creation stores the exact inserted ledger row ID',async f=>{
  const notifications=[];
  const service=loadSource('../server/services/customers.service.ts',{
    '../repositories/customers.repo':{customersRepo:{addCustomerLedgerEntry:async()=>({id:808})}},
    '../errors':{AppError:Error},'../db/domains/installmentLedger.db':{},
  }).customersService;
  const result=await service.createCustomerLedgerEntry({customerId:35,payload:{description:'invoice #12',credit:7000000},notifyCustomer:async(...args)=>notifications.push(args)});
  assert.equal(result.id,808);const notification=notifications.find(args=>args[0]==='INVOICE_PAYMENT_RECEIVED');
  assert.equal(notification[3].sourceTransactionId,808);assert.equal(notification[3].amount,7000000);
});
await check('direct automatic settlement service validates before provider and retains retry context',async f=>{
  let count=0;const captured=[];
  const service=loadSource('../server/services/installments.service.ts',{
    '../../utils/exactNumber':{formatExactNumberText:String},'../../shared/messages':messages,
    '../utils/notificationAmountIntegrity':f.integrity,'../smsService':f.sms,'../telegramService':f.telegram,
    '../database':{getAsync:f.getAsync,getAllSettingsAsObject:async()=>f.settings,getInstallmentSaleDetailsForSms:async()=>({saleId:33,totalPrice:23000000,customerFullName:'name',customerPhoneNumber:'fixture-phone'})},
    '../validators':{},'../repositories/installments.repo':{installmentsRepo:{getInstallmentPaymentSaleId:async()=>33,countUnpaidInstallmentPayments:async()=>count++===0?1:0,addInstallmentTransaction:async()=>({id:1})}},
  }).installmentsService;
  const result=await service.recordInstallmentPaymentTransaction({paymentId:77,body:{amount:3000000,date:'2026-09-14'},insertSmsLog:async row=>captured.push(row)});
  assert.equal(result.smsSuccess,true);assert.equal(f.sends.length,1);
  assert.equal(captured[0].request.financialSms.context.entityId,33);
  assert.equal(captured[0].request.financialSms.context.entityType,'installment_sale');
});
for(const provider of ['kavenegar','sms_ir','ippanel'])await check(provider+' cannot bypass financial validation',async f=>{
  const suffix=provider==='kavenegar'?'template':provider==='sms_ir'?'template_id':'pattern_code';
  f.settings[provider+'_payment_confirmation_'+suffix]=provider==='sms_ir'?55:'fixture-pattern';
  if(provider==='kavenegar')f.settings.kavenegar_api_key='fixture';
  if(provider==='sms_ir')f.settings.sms_ir_api_key='fixture';
  if(provider==='ippanel'){f.settings.ippanel_token='fixture';f.settings.ippanel_from_number='fixture'}
  const key=provider==='kavenegar'?'kavenegarTemplate':provider==='sms_ir'?'smsIrTemplateId':'ippanelPatternCode';
  f.insert(undefined,{}, {provider,[key]:f.settings[provider+'_payment_confirmation_'+suffix]});
  await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done');
  f.sends.length=0;f.db.exec("UPDATE notification_outbox SET status='pending'");
  const payload=JSON.parse(f.row().payloadJson);payload.tokens[1]='300000';
  f.db.prepare('UPDATE notification_outbox SET payloadJson=?').run(JSON.stringify(payload));
  await f.runtime.processOneOutboxRow();rejection(f,'AMOUNT_MISMATCH');
});
await check('legacy manual retry with ambiguous entity type cannot infer a source',async f=>{
  const row=f.insert('INSTALLMENT_SALE_CREATED'),payload=JSON.parse(row.payloadJson);
  f.log({...row,entityType:'installment'},payload,{});await f.route()('/api/sms/logs/:id/retry',{});
  assert.equal(f.sends.length,0);assert.equal(f.smsLogs[0].response.validation.reason,'VALIDATION_SOURCE_MISSING');
});
await check('new payment notification cannot omit its exact source reference',async f=>{
  f.insert(undefined,{createdAt:now},{sourceTransactionId:undefined});
  await f.runtime.processOneOutboxRow();
  assert.equal(rejection(f,'VALIDATION_SOURCE_MISSING').issue,'TRANSACTION_REFERENCE_MISSING');
});
await check('legacy payment without source is not recovered from a unique matching amount',async f=>{
  f.db.exec('DELETE FROM installment_transactions WHERE id<>1');
  const createdAt=new Date(Date.parse(f.integrity.FINANCIAL_SMS_SOURCE_MIGRATION_AT)-1000).toISOString();
  f.insert(undefined,{createdAt},{sourceTransactionId:undefined});
  await f.runtime.processOneOutboxRow();
  rejection(f,'LEGACY_SOURCE_UNAVAILABLE');
});
await check('source-only repair with independently known fixture reference passes pure validation',async f=>{
  const checkedAt=f.integrity.FINANCIAL_SMS_SOURCE_MIGRATION_AT;
  const createdAt=new Date(Date.parse(checkedAt)-1000).toISOString();
  const row=f.insert(undefined,{createdAt},{sourceTransactionId:undefined});
  const original=JSON.parse(row.payloadJson);
  const before=await f.integrity.validateFinancialSms(row,original,f.getAsync,f.settings,checkedAt);
  assert.equal(before.reason,'LEGACY_SOURCE_UNAVAILABLE');
  // The test created transaction 1, so its provenance is known. This is NOT
  // an inferred production mapping and does not execute a database repair.
  const repaired={...original,sourceTransactionId:1};
  assert.equal(await f.integrity.validateFinancialSms(row,repaired,f.getAsync,f.settings,checkedAt),null);
  assert.equal(JSON.stringify(repaired.tokens),JSON.stringify(original.tokens));
  const {sourceTransactionId,...unchanged}=repaired;
  assert.deepEqual(unchanged,original);
  assert.equal(f.row().payloadJson,row.payloadJson);
  assert.equal(f.sends.length,0);
});
await check('source repair cannot bypass expiry or obsolete token contracts',async f=>{
  const row=f.insert(undefined,{createdAt:ageDate(24*30)});
  const payload=JSON.parse(row.payloadJson);
  assert.equal((await f.integrity.validateFinancialSms(row,payload,f.getAsync,f.settings,now)).reason,'NOTIFICATION_EXPIRED');
  const obsolete={...payload,tokens:['name','33','3000000','1405/06/23']};
  assert.equal((await f.integrity.validateFinancialSms({...row,createdAt:now},obsolete,f.getAsync,f.settings,now)).reason,'VALIDATION_TEMPLATE_MISMATCH');
  assert.equal(f.sends.length,0);
});
await check('legacy quarantine preserves payload, original timestamps and attempt count',async f=>{
  const migration=Date.parse(f.integrity.FINANCIAL_SMS_SOURCE_MIGRATION_AT);
  const row=f.insert(undefined,{createdAt:new Date(migration-1000).toISOString(),updatedAt:ageDate(24),attempts:2},{sourceTransactionId:undefined});
  await f.runtime.processOneOutboxRow();rejection(f,'LEGACY_SOURCE_UNAVAILABLE');
  for(const key of ['payloadJson','createdAt','updatedAt','attempts'])assert.equal(f.row()[key],row[key]);
  assert.equal(await f.runtime.processOneOutboxRow(),false);
  f.db.exec("UPDATE notification_outbox SET status='pending',lastError=NULL");
  await f.runtime.processOneOutboxRow();rejection(f,'LEGACY_SOURCE_UNAVAILABLE');
  assert.equal(f.row().updatedAt,row.updatedAt);
});
await check('migration boundary does not classify a new missing reference as legacy',async f=>{
  f.insert(undefined,{createdAt:f.integrity.FINANCIAL_SMS_SOURCE_MIGRATION_AT},{sourceTransactionId:undefined});
  await f.runtime.processOneOutboxRow();rejection(f,'VALIDATION_SOURCE_MISSING');
});
for(const [name,patch,reason] of [
  ['missing reference',{sourceTransactionId:undefined},'VALIDATION_SOURCE_MISSING'],
  ['nonexistent reference',{sourceTransactionId:999},'VALIDATION_SOURCE_MISSING'],
  ['wrong transaction in same installment',{sourceTransactionId:2},'AMOUNT_MISMATCH'],
  ['wrong amount',{tokens:['name','300000']},'AMOUNT_MISMATCH'],
])await check('creation gate rejects '+name+' before queue insert',async f=>{
  const row=f.insert(undefined,{createdAt:now},patch);f.db.exec('DELETE FROM notification_outbox');
  const result=await f.runtime.enqueueOutbox({...row,payload:JSON.parse(row.payloadJson)});
  assert.equal(result.queued,false);assert.equal(result.reason,reason);
  assert.equal(f.db.prepare('SELECT count(*) n FROM notification_outbox').get().n,0);
  assert.equal(f.sends.length,0);
});
await check('new valid payment enters queue and sends through both validation gates',async f=>{
  const row=f.insert();f.db.exec('DELETE FROM notification_outbox');
  const result=await f.runtime.enqueueOutbox({...row,payload:JSON.parse(row.payloadJson)});
  assert.equal(result.queued,true);assert.equal(f.sends.length,0);
  const {notificationContext,...unchanged}=JSON.parse(f.row().payloadJson);
  assert.deepEqual(unchanged,JSON.parse(row.payloadJson));assert.equal(notificationContext.sourceId,1);
  await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done');assert.equal(f.sends.length,1);
});
for(const event of ['INSTALLMENT_SALE_CREATED','INSTALLMENT_SETTLED','ACCOUNT_BALANCE_STATUS'])
  await check('creation gate leaves '+event+' unchanged without transaction ID',async f=>{
    const row=f.insert(event);f.db.exec('DELETE FROM notification_outbox');
    const result=await f.runtime.enqueueOutbox({...row,payload:JSON.parse(row.payloadJson)});
    assert.equal(result.queued,true);
    const {notificationContext,...unchanged}=JSON.parse(f.row().payloadJson);
    assert.deepEqual(unchanged,JSON.parse(row.payloadJson));assert.equal(notificationContext.eventType,event);
    await f.runtime.processOneOutboxRow();assert.equal(f.row().status,'done');
  });
await check('outbox records accepted provider outcome without changing provider arguments',async f=>{
  const row=f.insert(undefined,{}, {notificationContext:{customerId:35,contractId:33,amount:{value:'۳٬۰۰۰٬۰۰۰',meaning:'payment_received',currency:'toman'}}});
  await f.runtime.processOneOutboxRow();
  assert.equal(f.row().status,'done');assert.equal(f.sends.length,1);assert.equal(f.outboxLogs.length,1);
  assert.equal(JSON.stringify(f.sends[0][2]),JSON.stringify(JSON.parse(row.payloadJson).tokens));
  const entry=f.outboxLogs[0];
  assert.equal(entry.request.observation.outboxId,1);assert.equal(entry.request.observation.outcome,'provider_accepted');
  assert.equal(entry.request.observation.validationOutcome,'no_rejection_returned');
  assert.equal(entry.request.observation.providerCalled,true);assert.equal(entry.request.observation.attempt,1);
  assert.ok(entry.correlationId.startsWith('notification_1_'));
  assert.equal(entry.request.notificationContext.amount.value,'۳٬۰۰۰٬۰۰۰');
  assert.equal(entry.request.notificationContext.transactionId,1);assert.equal(entry.request.notificationContext.contractId,33);
  assert.equal(entry.request.financialSms.context.createdAt,row.createdAt);
  assert.equal(f.row().payloadJson,row.payloadJson);
});
await check('outbox records blocked validation without provider call',async f=>{
  f.insert(undefined,{}, {tokens:['name','300000']});await f.runtime.processOneOutboxRow();
  const entry=f.outboxLogs[0];assert.equal(entry.request.observation.outcome,'validation_blocked');
  assert.equal(entry.request.observation.validation.expectedAmount,3000000);
  assert.equal(entry.request.observation.validation.payloadAmount,300000);assert.equal(f.sends.length,0);
  assert.equal(entry.request.observation.providerCalled,false);assert.equal(entry.request.observation.attempt,null);
});
await check('enqueue rejection is observable and does not insert or send',async f=>{
  const row=f.insert(undefined,{createdAt:now},{sourceTransactionId:undefined});f.db.exec('DELETE FROM notification_outbox');
  const result=await f.runtime.enqueueOutbox({...row,id:undefined,payload:JSON.parse(row.payloadJson)});
  assert.equal(result.queued,false);assert.equal(f.outboxLogs[0].request.observation.outcome,'enqueue_rejected');
  assert.equal(f.outboxLogs[0].request.observation.outboxId,null);assert.equal(f.row(),undefined);assert.equal(f.sends.length,0);
});
await check('legacy observation cannot recover a source or update payload and timestamps',async f=>{
  const row=f.insert(undefined,{createdAt:'2026-09-01T00:00:00Z'},{sourceTransactionId:undefined});
  await f.runtime.processOneOutboxRow();assert.equal(f.outboxLogs[0].request.observation.outcome,'legacy_blocked');
  assert.equal(f.outboxLogs[0].request.notificationContext.sourceId,null);
  for(const key of ['payloadJson','createdAt','updatedAt'])assert.equal(f.row()[key],row[key]);
  assert.equal(f.sends.length,0);
});
for(const failed of [false,true])await check('logging failure cannot alter send/retry outcome '+failed,async f=>{
  f.insert();f.failLogging();if(failed)f.fail();await f.runtime.processOneOutboxRow();
  assert.equal(f.sends.length,1);assert.equal(f.row().status,failed?'pending':'done');
  assert.equal(f.row().attempts,failed?1:0);
});
await check('Telegram enqueue payload and processing remain unchanged',async f=>{
  const row=f.insert('GENERAL',{channel:'telegram'},{text:'fixture',capCustomerId:35});f.db.exec('DELETE FROM notification_outbox');
  await f.runtime.enqueueOutbox({...row,payload:JSON.parse(row.payloadJson)});
  assert.equal(f.row().payloadJson,row.payloadJson);await f.runtime.processOneOutboxRow();assert.equal(f.outboxLogs.length,0);
});
await check('new observations do not copy arbitrary secrets or provider raw bodies',async f=>{
  f.insert(undefined,{}, {password:'DO_NOT_LOG',apiKey:'DO_NOT_LOG',notificationContext:{password:'DO_NOT_LOG'}});
  await f.runtime.processOneOutboxRow();assert.equal(JSON.stringify(f.outboxLogs).includes('DO_NOT_LOG'),false);
});
await check('actual manual retry carries original observational context without changing credentials or tokens',async f=>{
  const row=f.insert(undefined,{createdAt:now}),payload=JSON.parse(row.payloadJson);
  const notificationContext=f.context.buildNotificationContext(row,payload,{contractId:33,createdBy:null,amount:{value:'3000000',meaning:'payment_received',currency:'toman'}});
  f.log(row,payload,{financialSms:{context:row,payload},notificationContext});
  await f.route()('/api/sms/logs/:id/retry',{});
  assert.equal(f.sends.length,1);assert.equal(f.smsLogs.length,1);
  assert.equal(JSON.stringify(f.smsLogs[0].request.notificationContext),JSON.stringify(notificationContext));
  assert.equal(JSON.stringify(f.sends[0][2]),JSON.stringify(payload.tokens));
  assert.equal(f.smsLogs[0].relatedLogId,1);
});
console.log(passed+'/'+passed+' unified financial SMS/outbox checks passed');
