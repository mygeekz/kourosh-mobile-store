// Read-only real-data observations; evaluatedAt simulations do not reconstruct historical balances.
// No scheduler invocation, application bootstrap, provider or outbox capability.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import moment from 'jalali-moment';
import { compile,extract,loadShadowModules,readOnlyCandidateReaders } from './lib/notification-rule-shadow-harness.mjs';

const shadow=loadShadowModules();
const {normalizeAutoSendMode:normalizeMode}=compile(extract('server/utils/telegramRuntimeHelpers.ts',['normalizeAutoSendMode']));
const db=new DatabaseSync(fileURLToPath(new URL('../server/kourosh_inventory.db',import.meta.url)),{readOnly:true});
const counts=()=>({candidates:0,exactTechnicalEquality:0,semanticParity:0,semanticMismatches:0,legacyMatched:0,newMatched:0,reasons:{}});
function add(count,entry) {
  count.candidates++;count.exactTechnicalEquality+=Number(entry.exactTechnicalEquality);count.semanticParity+=Number(entry.semanticParity);
  count.semanticMismatches+=Number(!entry.semanticParity);count.legacyMatched+=entry.legacy.length;count.newMatched+=entry.evaluator.length;
  for (const code of entry.differenceReasons) count.reasons[code]=(count.reasons[code]||0)+1;
}
try {
  db.exec('PRAGMA busy_timeout=15000;PRAGMA query_only=ON;BEGIN');
  const readers=readOnlyCandidateReaders(db);
  const keys=[...new Set([...shadow.smsReminderSettingKeys,'installation_id','auto_send_installment_due','auto_send_check_due',
    'meli_payamak_installment_due_3_pattern_id','meli_payamak_installment_due_7_pattern_id'])];
  const settings=Object.fromEntries(db.prepare(`SELECT key,value FROM settings WHERE key IN (${keys.map(()=>'?').join(',')})`).all(...keys).map(r=>[r.key,r.value]));
  const state=await shadow.prepareSchedulerRuleShadow(settings,readers);
  const rows={installment:await readers.getPendingInstallmentPaymentsWithCustomer(),check:await readers.getPendingInstallmentChecksWithCustomer()};
  const civilAt=iso=>new Intl.DateTimeFormat('en-CA',{timeZone:state.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
  function evaluate(kind,row,evaluatedAt,scenario) {
    const due=shadow.schedulerCivilDate(row.dueDate);assert.ok(due,'Invalid real source date');
    const date=civilAt(evaluatedAt),daysUntil=Math.round((Date.parse(due)-Date.parse(date))/86400000);
    const originalEventType=[0,3,7].includes(daysUntil)?`${kind==='installment'?'INSTALLMENT':'CHECK'}_DUE_${daysUntil||'TODAY'}`:null;
    const result=shadow.observeSchedulerRuleCandidate(state,{kind,row,mode:'sms',originalEventType,legacyDate:date,evaluatedAt},()=>{})[0];
    const templateKey=kind==='check'?'check_due':result.normalizedEvent==='INSTALLMENT_OVERDUE'?'installment_overdue':'installment_due_notice';
    const base={customerId:result.customerId,sourceType:kind,sourceId:result.sourceId,normalizedEvent:result.normalizedEvent,scheduledFor:date,channel:'sms',
      templateKey,amountMeaning:kind==='check'?'check_amount':'scheduled_installment_amount'};
    const legacy=originalEventType?[{...base,ruleId:null}]:[];
    const evaluator=result.evaluation.decisions.filter(d=>d.matched).map(d=>({...base,ruleId:d.ruleId,scheduledFor:d.scheduledFor,templateKey:d.templateKey,
      amountMeaning:shadowContractMeaning(d.templateKey)}));
    const business=list=>list.map(({ruleId,...entry})=>JSON.stringify(entry)).sort();
    const semanticParity=JSON.stringify(business(legacy))===JSON.stringify(business(evaluator));
    const blocked=result.evaluation.decisions.filter(d=>!d.matched&&!['RULE_DISABLED','EVENT_NOT_MATCHED','TARGET_NOT_MATCHED','NOT_DUE_YET','OCCURRENCE_PASSED','CONDITION_NOT_MET'].includes(d.reasonCode))
      .map(d=>({ruleId:d.ruleId,reasonCode:d.reasonCode}));
    const applicableRejections=result.evaluation.decisions.filter(d=>!d.matched&&d.scheduledFor===date).map(d=>({ruleId:d.ruleId,reasonCode:d.reasonCode}));
    return {...base,evaluatedAt,scenario,legacy,evaluator,blocked,applicableRejections,
      currentFacts:{recipientAvailable:Boolean(String(row.customerPhone??row.customerPhoneNumber??'').trim()),outstanding:kind==='installment'?row.effectiveRemaining>0:true},
      exactTechnicalEquality:result.differences.length===0,semanticParity,
      differenceReasons:[...new Set(result.differences.flatMap(d=>d.codes))]};
  }
  // Use the actual registry for both contract meanings, rather than amount values or provider tokens.
  const registry=compile(fs.readFileSync(fileURLToPath(new URL('../server/notifications/rules/notificationTemplateRegistry.ts',import.meta.url)),'utf8')).notificationTemplateRegistry;
  function shadowContractMeaning(key){return registry.find(t=>t.key===key)?.amountMeaning??null;}
  const now=new Date().toISOString();
  const report={evaluatedAt:now,timezone:state.timezone,readOnly:true,scope:'pre-enqueue candidate semantics; caps/dedup/provider delivery not executed',
    simulationFacts:'Current outstanding balances and active contracts; dates simulated only, not historical accounting reconstruction',
    ruleCounts:{sms:state.rules.filter(r=>r.channel==='sms').length,telegram:state.rules.filter(r=>r.channel==='telegram').length},
    localBindings:{installment_due_notice:'LOCAL_BINDING_READY',installment_overdue:'LOCAL_BINDING_READY'},
    providerContractLimit:'Business-key normalization is not proof of provider token-order/text equality. No provider-side verification or send performed.',
    legacyDueBindingPresence:Object.fromEntries([3,7].map(n=>[n,Boolean(String(settings['meli_payamak_installment_due_'+n+'_pattern_id']||'').trim())])),
    current:{INSTALLMENT_DUE:counts(),INSTALLMENT_OVERDUE:counts(),CHECK_DUE:counts()},multiDate:{},currentCandidates:[],simulatedCandidates:[]};
  // Validate local binding status, without printing the settings or assuming remote provider approval.
  for(const [key,event] of [['installment_due_notice','INSTALLMENT_DUE'],['installment_overdue','INSTALLMENT_OVERDUE']]) {
    const rule=state.rules.find(r=>r.eventType===event&&r.channel==='sms');
    report.localBindings[key]=rule&&state.smsRuleReady[rule.id]?'LOCAL_BINDING_READY':'NOT_READY';
  }
  report.modes={installment:normalizeMode(settings.auto_send_installment_due),check:normalizeMode(settings.auto_send_check_due)};
  for(const kind of ['installment','check']) {
    for(const row of rows[kind]) {
      // Production SMS candidates only when the existing scheduler channel enables SMS.
      if(['sms','both'].includes(report.modes[kind])) {
        const entry=evaluate(kind,row,now,'current');report.currentCandidates.push(entry);add(report.current[entry.normalizedEvent],entry);
      }
      const offsets=kind==='installment'?[-7,-3,0,3,7,30]:[-7,-3,0];
      const due=shadow.schedulerCivilDate(row.dueDate);assert.ok(due);
      for(const offset of offsets) {
        const scenario=(kind==='check'?'CHECK_':'INSTALLMENT_')+(offset<0?'BEFORE_'+(-offset):offset===0?'DUE_DATE':'OVERDUE_'+offset);
        const date=moment.utc(due,'YYYY-MM-DD',true).add(offset,'day').format('YYYY-MM-DD');
        const entry=evaluate(kind,row,date+'T12:00:00+03:30',scenario);
        report.simulatedCandidates.push(entry);add(report.multiDate[scenario]||=(counts()),entry);
      }
    }
  }
  // Check real current selector exclusion, including settled sales. Do not create fake eligible rows.
  const pendingIds=new Set(rows.installment.map(r=>Number(r.paymentId)));
  const allInstallments=db.prepare("SELECT ip.id,ip.saleId,COALESCE(s.status,'active') contractStatus FROM installment_payments ip JOIN installment_sales s ON s.id=ip.saleId WHERE COALESCE(ip.sourceType,'installment')='installment'").all();
  let inactiveExcluded=0,settledSaleExcluded=0;const saleStates=new Map();
  for(const row of allInstallments) {
    if(row.contractStatus!=='active'){assert.ok(!pendingIds.has(row.id));inactiveExcluded++;}
    if(!saleStates.has(row.saleId))saleStates.set(row.saleId,await readers.getInstallmentSaleReceivableState(row.saleId));
    if(saleStates.get(row.saleId).remaining<=0.00001){assert.ok(!pendingIds.has(row.id),'Settled sale became eligible');settledSaleExcluded++;}
  }
  report.currentStateExclusions={inactiveExcluded,settledSaleExcluded,pendingInstallments:rows.installment.length,pendingChecks:rows.check.length};
  // Compare the existing legacy SMS source getter to the evaluator's original amount.
  // Neither amount is rendered or written to this report.
  let sameAmountSource=0;
  for(const row of rows.installment) {
    const source=await readers.getInstallmentPaymentDetailsForSms(row.paymentId);
    assert.equal(source.customerId,row.customerId);
    assert.equal(source.amountDue,row.originalAmountDue,'Legacy/new source amounts differ');
    assert.equal(Boolean(String(source.customerPhoneNumber||'').trim()),Boolean(String(row.customerPhone||'').trim()));
    sameAmountSource++;
  }
  report.amountSourceParity={checked:sameAmountSource,matched:sameAmountSource,legacyField:'installment_payments.amountDue',newField:'originalAmountDue',amountMeaning:'scheduled_installment_amount'};
  report.mismatchExplanations={
    missingRecipientDue:report.simulatedCandidates.filter(e=>e.normalizedEvent==='INSTALLMENT_DUE'&&!e.semanticParity&&!e.currentFacts.recipientAvailable).length,
    overdueNewOccurrences:report.simulatedCandidates.filter(e=>e.normalizedEvent==='INSTALLMENT_OVERDUE'&&!e.semanticParity&&!e.legacy.length&&e.evaluator.length).length,
    checkNoSmsRule:report.simulatedCandidates.filter(e=>e.normalizedEvent==='CHECK_DUE'&&!e.semanticParity).length,
  };
  report.connectionChanges=db.prepare('SELECT total_changes() n').get().n;assert.equal(report.connectionChanges,0);
  const output=process.argv[2];
  if(output) {fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({...report,currentCandidates:undefined,simulatedCandidates:undefined,detailReport:output},null,2));}
  else console.log(JSON.stringify(report,null,2));
} catch(error) {console.error(JSON.stringify({code:'SMS_SHADOW_PARITY_AUDIT_FAILED',errorCode:error?.code||error?.name}));process.exitCode=1;}
finally{try{db.exec('ROLLBACK');}finally{db.close();}}
