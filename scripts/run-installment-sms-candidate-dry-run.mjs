import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const argv = process.argv.slice(2);
const dbArg = argv.find(v => !v.startsWith('--')) || 'server/kourosh_inventory.db';
const atArg = argv.find(v => v.startsWith('--evaluated-at='));
const evaluatedAt = atArg ? atArg.slice('--evaluated-at='.length) : new Date().toISOString();
const dbPath = path.resolve(dbArg);
const REPORT_VERSION = 1;

const fail = (code, extra = {}) => {
  console.error(JSON.stringify({ status: 'NOT_READY', code, ...extra }, null, 2));
  process.exitCode = 1;
};

if (!fs.existsSync(dbPath)) {
  fail('DATABASE_NOT_FOUND', { database: dbPath });
} else {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout=15000; PRAGMA query_only=ON; BEGIN');

    const tableNames = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => String(r.name)));
    const requiredTables = ['reminder_rules','settings','reminder_config','installment_payments','installment_sales','installment_transactions','installment_checks','customers','customer_ledger','notification_outbox','sms_logs'];
    const missingTables = requiredTables.filter(t => !tableNames.has(t));
    if (missingTables.length) throw Object.assign(new Error('missing tables'), { code: 'SCHEMA_NOT_READY', missingTables });

    const ruleColumns = new Set(db.prepare('PRAGMA table_info(reminder_rules)').all().map(r => String(r.name)));
    const requiredRuleColumns = ['eventType','timingType','daysOffset','templateKey'];
    const missingRuleColumns = requiredRuleColumns.filter(c => !ruleColumns.has(c));
    if (missingRuleColumns.length) throw Object.assign(new Error('missing rule columns'), { code: 'SMS_RULE_SCHEMA_NOT_READY', missingRuleColumns });

    const config = db.prepare('SELECT timezone FROM reminder_config WHERE id=1 LIMIT 1').get();
    const timezone = String(config?.timezone || 'Asia/Tehran');
    // Validate timezone without leaking any other setting.
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(evaluatedAt));

    const settingKeys = [
      'sms_provider','auto_send_installment_due','meli_payamak_username','meli_payamak_password',
      'meli_payamak_installment_due_notice_pattern_id','meli_payamak_installment_overdue_pattern_id',
    ];
    const settings = Object.fromEntries(
      db.prepare(`SELECT key,value FROM settings WHERE key IN (${settingKeys.map(() => '?').join(',')})`).all(...settingKeys)
        .map(r => [String(r.key), r.value]),
    );
    const provider = String(settings.sms_provider || 'meli_payamak').trim().toLowerCase();
    const providerAccountConfigured = provider === 'meli_payamak' && Boolean(String(settings.meli_payamak_username || '').trim() && String(settings.meli_payamak_password || '').trim());
    const templateConfigured = {
      installment_due_notice: /^[1-9]\d*$/.test(String(settings.meli_payamak_installment_due_notice_pattern_id || '').trim()),
      installment_overdue: /^[1-9]\d*$/.test(String(settings.meli_payamak_installment_overdue_pattern_id || '').trim()),
    };

    const rules = db.prepare(`
      SELECT id, enabled, channel, eventType, timingType, daysOffset, templateKey, targetType
        FROM reminder_rules
       WHERE enabled=1 AND channel='sms'
         AND eventType IN ('INSTALLMENT_DUE','INSTALLMENT_OVERDUE')
       ORDER BY id ASC
    `).all().map(r => ({
      id: Number(r.id), enabled: Number(r.enabled) === 1, channel: String(r.channel), eventType: String(r.eventType),
      timingType: String(r.timingType), daysOffset: Number(r.daysOffset), templateKey: String(r.templateKey), targetType: String(r.targetType || ''),
    }));

    const expectedRules = [
      [4,'INSTALLMENT_DUE','BEFORE_DUE_DATE',7,'installment_due_notice'],
      [5,'INSTALLMENT_DUE','BEFORE_DUE_DATE',3,'installment_due_notice'],
      [6,'INSTALLMENT_DUE','BEFORE_DUE_DATE',0,'installment_due_notice'],
      [7,'INSTALLMENT_OVERDUE','AFTER_DUE_DATE',3,'installment_overdue'],
      [8,'INSTALLMENT_OVERDUE','AFTER_DUE_DATE',7,'installment_overdue'],
      [9,'INSTALLMENT_OVERDUE','AFTER_DUE_DATE',30,'installment_overdue'],
    ];
    const ruleShapeIssues = [];
    for (const [id,eventType,timingType,daysOffset,templateKey] of expectedRules) {
      const rule = rules.find(r => r.id === id);
      if (!rule || rule.eventType !== eventType || rule.timingType !== timingType || rule.daysOffset !== daysOffset || rule.templateKey !== templateKey) {
        ruleShapeIssues.push({ id, expected: { eventType, timingType, daysOffset, templateKey } });
      }
    }

    const rawRows = db.prepare(`
      SELECT ip.id AS paymentId, ip.saleId, ip.dueDate, ip.amountDue AS originalAmountDue,
             MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
               SELECT SUM(it.amount_paid) FROM installment_transactions it WHERE it.installment_payment_id = ip.id
             ),0)) AS physicalRemaining,
             isale.customerId, isale.actualSalePrice, isale.downPayment, isale.status AS saleStatus,
             c.fullName AS customerFullName, c.phoneNumber AS customerPhone
        FROM installment_payments ip
        JOIN installment_sales isale ON isale.id = ip.saleId
        JOIN customers c ON c.id = isale.customerId
       WHERE COALESCE(ip.sourceType,'installment')='installment'
         AND COALESCE(isale.status,'active')='active'
         AND COALESCE(ip.amountDue,0)>0
       ORDER BY ip.saleId ASC, ip.dueDate ASC, ip.id ASC
    `).all();

    const grouped = new Map();
    for (const row of rawRows) {
      const saleId = Number(row.saleId || 0);
      if (!grouped.has(saleId)) grouped.set(saleId, []);
      grouped.get(saleId).push(row);
    }

    const pending = [];
    let settledSaleRowsExcluded = 0;
    let fullyCoveredRowsExcluded = 0;
    for (const [saleId, saleRows] of grouped) {
      const sale = saleRows[0];
      const transactionPaid = Math.max(0, Number(db.prepare(`
        SELECT COALESCE(SUM(it.amount_paid),0) AS paid
          FROM installment_transactions it
          JOIN installment_payments ip ON ip.id=it.installment_payment_id
         WHERE ip.saleId=?
      `).get(saleId)?.paid || 0));
      const cashedCheckRemainder = Math.max(0, Number(db.prepare(`
        SELECT COALESCE(SUM(CASE
          WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
          THEN MAX(0,COALESCE(ic.amount,0)-COALESCE((
            SELECT SUM(it.amount_paid)
              FROM installment_payments rp
              JOIN installment_transactions it ON it.installment_payment_id=rp.id
             WHERE rp.sourceType='check_recovery' AND rp.sourceId=ic.id
          ),0)) ELSE 0 END),0) AS paid
          FROM installment_checks ic WHERE ic.saleId=?
      `).get(saleId)?.paid || 0));
      const manualLedgerReceipt = Math.max(0, Number(db.prepare(`
        SELECT COALESCE(SUM(COALESCE(credit,0)),0) AS paid
          FROM customer_ledger
         WHERE referenceType='installment_manual_receipt' AND referenceId=?
      `).get(saleId)?.paid || 0));
      const debt = Math.max(0, Number(sale.actualSalePrice || 0) - Math.max(0, Number(sale.downPayment || 0)));
      const collectedAfterDownPayment = transactionPaid + cashedCheckRemainder + manualLedgerReceipt;
      const saleRemaining = Math.max(0, debt - collectedAfterDownPayment);
      if (saleRemaining <= 0.00001) {
        settledSaleRowsExcluded += saleRows.length;
        continue;
      }
      saleRows.sort((a,b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')) || Number(a.paymentId)-Number(b.paymentId));
      const normalTransactionPaid = saleRows.reduce((sum,row) => sum + Math.max(0, Number(row.originalAmountDue || 0)-Number(row.physicalRemaining || 0)), 0);
      let externalCollectionToAllocate = Math.max(0, collectedAfterDownPayment - normalTransactionPaid);
      for (const row of saleRows) {
        const physicalRemaining = Math.max(0, Number(row.physicalRemaining || 0));
        const externalCovered = Math.min(physicalRemaining, externalCollectionToAllocate);
        externalCollectionToAllocate = Math.max(0, externalCollectionToAllocate - externalCovered);
        const effectiveRemaining = Math.max(0, physicalRemaining - externalCovered);
        if (effectiveRemaining <= 0.00001) {
          fullyCoveredRowsExcluded++;
          continue;
        }
        pending.push({ ...row, effectiveRemaining });
      }
    }

    const dateParts = (date, calendar) => {
      const locale = calendar === 'persian' ? 'fa-IR-u-ca-persian-nu-latn' : 'en-CA-u-ca-gregory-nu-latn';
      const parts = new Intl.DateTimeFormat(locale, { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
      const get = t => parts.find(p => p.type === t)?.value;
      const sep = calendar === 'persian' ? '/' : '-';
      return [get('year'),get('month'),get('day')].join(sep);
    };
    const evaluatedDate = new Date(evaluatedAt);
    if (!Number.isFinite(evaluatedDate.getTime())) throw Object.assign(new Error('invalid evaluatedAt'), { code: 'INVALID_EVALUATED_AT' });
    const localGregorian = dateParts(evaluatedDate, 'gregory');
    const [ly,lm,ld] = localGregorian.split('-').map(Number);
    const localNoonUtc = new Date(Date.UTC(ly,lm-1,ld,12,0,0));
    const shifted = days => new Date(localNoonUtc.getTime() + days*86400000);
    const targetDates = rule => {
      const shift = rule.timingType === 'BEFORE_DUE_DATE' ? rule.daysOffset : rule.timingType === 'AFTER_DUE_DATE' ? -rule.daysOffset : 0;
      const d = shifted(shift);
      return { gregorian: dateParts(d,'gregory'), persian: dateParts(d,'persian') };
    };
    const dueMatches = (raw, target) => {
      const value = String(raw || '').trim();
      return value === target.persian || value === target.gregorian;
    };

    const dayKeyUtc = evaluatedDate.toISOString().slice(0,10);
    const sentCap = db.prepare("SELECT 1 AS ok FROM reminder_daily_cap WHERE dayKey=? AND channel='sms' AND customerId=? LIMIT 1");
    const pendingCap = db.prepare(`SELECT 1 AS ok FROM notification_outbox
      WHERE channel='sms' AND status IN ('pending','processing') AND createdAt>=? AND IFNULL(capCustomerId,0)=? LIMIT 1`);

    const details = [];
    for (const rule of rules) {
      const target = targetDates(rule);
      for (const row of pending) {
        if (!dueMatches(row.dueDate, target)) continue;
        const customerId = Number(row.customerId || 0);
        const phonePresent = Boolean(String(row.customerPhone || '').trim());
        const templateReady = Boolean(templateConfigured[rule.templateKey]);
        const accountReady = providerAccountConfigured;
        const alreadySentToday = customerId > 0 ? Boolean(sentCap.get(dayKeyUtc, customerId)) : false;
        const alreadyPending = customerId > 0 ? Boolean(pendingCap.get(`${dayKeyUtc}T00:00:00Z`, customerId)) : false;
        let delivery = 'READY';
        if (!phonePresent) delivery = 'BLOCKED_NO_PHONE';
        else if (!accountReady) delivery = 'BLOCKED_PROVIDER_ACCOUNT';
        else if (!templateReady) delivery = 'BLOCKED_TEMPLATE';
        else if (alreadySentToday) delivery = 'BLOCKED_DAILY_CAP';
        else if (alreadyPending) delivery = 'BLOCKED_PENDING_OUTBOX_CAP';
        details.push({
          ruleId: rule.id, eventType: rule.eventType, timingType: rule.timingType, daysOffset: rule.daysOffset,
          templateKey: rule.templateKey, paymentId: Number(row.paymentId), saleId: Number(row.saleId), customerId,
          dueDate: String(row.dueDate), amountSource: 'installment_payments.amountDue', amountPresent: Number.isFinite(Number(row.originalAmountDue)),
          outstanding: Number(row.effectiveRemaining) > 0, recipientPresent: phonePresent, delivery,
        });
      }
    }

    const byRule = rules.map(rule => {
      const list = details.filter(d => d.ruleId === rule.id);
      const counts = {};
      for (const item of list) counts[item.delivery] = (counts[item.delivery] || 0) + 1;
      return { ruleId: rule.id, eventType: rule.eventType, timingType: rule.timingType, daysOffset: rule.daysOffset,
        templateKey: rule.templateKey, targetDueDate: targetDates(rule), candidates: list.length, delivery: counts };
    });
    const deliveryTotals = {};
    for (const item of details) deliveryTotals[item.delivery] = (deliveryTotals[item.delivery] || 0) + 1;

    const report = {
      reportVersion: REPORT_VERSION,
      mode: 'candidate_dry_run',
      evaluatedAt: evaluatedDate.toISOString(),
      timezone,
      localDate: { gregorian: dateParts(evaluatedDate,'gregory'), persian: dateParts(evaluatedDate,'persian') },
      database: dbPath,
      readOnly: true,
      providerCalls: 0,
      outboxWrites: 0,
      provider: { name: provider || 'meli_payamak', accountConfigured: providerAccountConfigured,
        templatesConfigured: templateConfigured },
      rulesFound: rules.length,
      ruleShapeIssues,
      selection: { sourceRows: rawRows.length, pendingRows: pending.length, settledSaleRowsExcluded, fullyCoveredRowsExcluded },
      totals: { candidates: details.length, ...deliveryTotals },
      byRule,
      safety: { smsSent: false, outboxMutated: false, connectionChanges: db.prepare('SELECT total_changes() AS n').get().n },
      // No names, phone numbers, provider credentials or message bodies are written to the report.
      candidates: details,
    };
    if (report.safety.connectionChanges !== 0) throw Object.assign(new Error('unexpected DB changes'), { code: 'READ_ONLY_INVARIANT_FAILED' });

    const reportDir = path.resolve('reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `sms-candidate-dry-run-${report.localDate.gregorian}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, candidates: undefined, report: reportPath }, null, 2));
  } catch (error) {
    const code = error?.code || 'CANDIDATE_DRY_RUN_FAILED';
    const extra = {};
    if (Array.isArray(error?.missingTables)) extra.missingTables = error.missingTables;
    if (Array.isArray(error?.missingRuleColumns)) extra.missingRuleColumns = error.missingRuleColumns;
    fail(code, extra);
  } finally {
    try { db.exec('ROLLBACK'); } catch {}
    db.close();
  }
}
