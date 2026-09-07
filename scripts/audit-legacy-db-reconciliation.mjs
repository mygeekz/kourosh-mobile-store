import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.argv[2] || process.env.KOUROSH_DB_PATH || 'kourosh_inventory.db');
if (!fs.existsSync(dbPath)) {
  console.error(`Legacy DB reconciliation audit: database not found: ${dbPath}`);
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const hasColumn = (table, column) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((row) => String(row.name) === column);
const money = (value) => Number(value || 0);
const moneyEq = (a, b) => Math.abs(money(a) - money(b)) <= 0.00001;
const jalaliKey = (raw) => {
  const match = String(raw || '').trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const isCashedStatus = (raw) => new Set([
  'نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده',
  'paid','Paid','cashed','Cashed',
]).has(String(raw || '').trim());

const hasSaleStatus = hasColumn('installment_sales', 'status');
const hasCancellationTable = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='installment_sale_cancellations'").get());

const result = {
  database: dbPath,
  health: {
    quickCheck: db.prepare('PRAGMA quick_check').get()?.quick_check || null,
    foreignKeyErrors: db.prepare('PRAGMA foreign_key_check').all().length,
  },
  schema: {
    saleDateISO: hasColumn('installment_sales', 'saleDateISO'),
    checkCashedAt: hasColumn('installment_checks', 'cashedAt'),
    reconciliationIssuesTable: Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounting_reconciliation_issues'").get()),
  },
  repairable: [],
  humanReview: [],
  saleCountMismatches: [],
};

const scheduleSales = db.prepare(`
  SELECT isale.id AS saleId,
         isale.actualSalePrice - isale.downPayment AS contractDebt,
         isale.numberOfInstallments,
         COALESCE(SUM(CASE WHEN COALESCE(ip.sourceType,'installment')='installment' THEN ip.amountDue ELSE 0 END),0) AS scheduledTotal${hasSaleStatus ? ', isale.status AS saleStatus' : ''}
    FROM installment_sales isale
    LEFT JOIN installment_payments ip ON ip.saleId=isale.id
   WHERE isale.saleType='installment'
   GROUP BY isale.id
`).all();
for (const row of scheduleSales) {
  const delta = money(row.contractDebt) - money(row.scheduledTotal);
  if (moneyEq(delta, 0)) continue;
  const last = db.prepare(`
    SELECT ip.id, ip.amountDue, ip.status,
           COALESCE((SELECT COUNT(*) FROM installment_transactions it WHERE it.installment_payment_id=ip.id),0) AS txCount,
           COALESCE((SELECT SUM(it.amount_paid) FROM installment_transactions it WHERE it.installment_payment_id=ip.id),0) AS paidAmount
      FROM installment_payments ip
     WHERE ip.saleId=? AND COALESCE(ip.sourceType,'installment')='installment'
     ORDER BY ip.installmentNumber DESC, ip.id DESC LIMIT 1
  `).get(row.saleId);
  const saleIsActive = !hasSaleStatus || String(row.saleStatus || 'active').trim().toLowerCase() === 'active';
  const safe = saleIsActive && Math.abs(delta) <= 1.00001 && last && Number(last.txCount || 0) === 0 && money(last.paidAmount) === 0 && String(last.status || 'پرداخت نشده') === 'پرداخت نشده' && money(last.amountDue) + delta > 0;
  (safe ? result.repairable : result.humanReview).push({
    type: 'installment_schedule_total_mismatch', saleId: Number(row.saleId),
    contractDebt: money(row.contractDebt), scheduledTotal: money(row.scheduledTotal), delta,
    safeAutomaticRepair: Boolean(safe), lastInstallmentId: last ? Number(last.id) : null,
  });
}

for (const row of db.prepare(`
  SELECT isale.id AS saleId,
         isale.actualSalePrice-isale.downPayment AS contractDebt,
         COALESCE(SUM(ic.amount),0) AS checksTotal
    FROM installment_sales isale
    LEFT JOIN installment_checks ic ON ic.saleId=isale.id
   WHERE isale.saleType='check'
   GROUP BY isale.id
`).all()) {
  if (moneyEq(row.contractDebt, row.checksTotal)) continue;
  result.humanReview.push({
    type: 'check_contract_total_mismatch', saleId: Number(row.saleId),
    contractDebt: money(row.contractDebt), checksTotal: money(row.checksTotal),
    delta: money(row.contractDebt)-money(row.checksTotal), safeAutomaticRepair: false,
  });
}

for (const row of db.prepare(`
  SELECT TRIM(checkNumber) AS checkNumber, COUNT(DISTINCT saleId) AS saleCount,
         GROUP_CONCAT(id) AS checkIds, GROUP_CONCAT(saleId) AS saleIds
    FROM installment_checks
   WHERE TRIM(COALESCE(checkNumber,''))<>''
   GROUP BY TRIM(checkNumber)
  HAVING COUNT(DISTINCT saleId)>1
`).all()) {
  result.humanReview.push({
    type: 'duplicate_check_number_across_sales', checkNumber: String(row.checkNumber),
    checkIds: String(row.checkIds).split(',').map(Number),
    saleIds: [...new Set(String(row.saleIds).split(',').map(Number))], safeAutomaticRepair: false,
  });
}

for (const row of db.prepare(`
  SELECT id AS saleId, saleDate, installmentsStartDate
    FROM installment_sales
   WHERE saleType='installment' AND TRIM(COALESCE(saleDate,''))<>'' AND TRIM(COALESCE(installmentsStartDate,''))<>''
`).all()) {
  const saleKey = jalaliKey(row.saleDate);
  const startKey = jalaliKey(row.installmentsStartDate);
  if (saleKey && startKey && startKey < saleKey) {
    result.humanReview.push({
      type: 'installment_start_before_sale_date', saleId: Number(row.saleId),
      saleDate: String(row.saleDate), installmentsStartDate: String(row.installmentsStartDate), safeAutomaticRepair: false,
    });
  }
}

const hasCashedAt = result.schema.checkCashedAt;
for (const row of db.prepare(`
  SELECT ic.id AS checkId, ic.saleId, ic.checkNumber, ic.amount, ic.dueDate, ic.status
         ${hasCashedAt ? ', ic.cashedAt' : ''}
    FROM installment_checks ic
   WHERE NOT EXISTS (
     SELECT 1 FROM customer_ledger cl
      WHERE cl.referenceType='installment_check_cashed' AND cl.referenceId=ic.id
   )
`).all()) {
  if (!isCashedStatus(row.status)) continue;
  const cashedAt = hasCashedAt ? String(row.cashedAt || '').trim() : '';
  (cashedAt ? result.repairable : result.humanReview).push({
    type: cashedAt ? 'cashed_check_missing_ledger' : 'cashed_check_unknown_cash_date',
    checkId: Number(row.checkId), saleId: Number(row.saleId), checkNumber: String(row.checkNumber || ''),
    amount: money(row.amount), dueDate: row.dueDate || null, cashedAt: cashedAt || null,
    safeAutomaticRepair: Boolean(cashedAt),
  });
}

const productIds = db.prepare('SELECT id, name, saleCount FROM products ORDER BY id').all();
for (const product of productIds) {
  const id = Number(product.id);
  const legacy = money(db.prepare("SELECT COALESCE(SUM(quantity),0) qty FROM sales_transactions WHERE itemType='inventory' AND itemId=?").get(id)?.qty);
  const order = money(db.prepare(`SELECT COALESCE(SUM(soi.quantity),0) qty FROM sales_order_items soi JOIN sales_orders so ON so.id=soi.orderId WHERE soi.itemType='inventory' AND soi.itemId=? AND COALESCE(so.status,'active')='active'`).get(id)?.qty);
  const returned = money(db.prepare(`SELECT COALESCE(SUM(sri.quantity),0) qty FROM sales_return_items sri JOIN sales_returns sr ON sr.id=sri.returnId JOIN sales_orders so ON so.id=sr.orderId WHERE sri.itemType='inventory' AND sri.itemId=? AND COALESCE(so.status,'active')='active'`).get(id)?.qty);
  const installmentSql = hasSaleStatus && hasCancellationTable
    ? `SELECT COALESCE(SUM(isi.quantity),0) qty
         FROM installment_sale_items isi
         JOIN installment_sales isale ON isale.id=isi.saleId
         LEFT JOIN installment_sale_cancellations isc ON isc.saleId=isale.id
        WHERE isi.itemType='inventory' AND isi.itemId=?
          AND (COALESCE(isale.status,'active')='active'
               OR (COALESCE(isale.status,'active')='canceled' AND COALESCE(isc.returnPhysicalItems,0)=0))`
    : "SELECT COALESCE(SUM(quantity),0) qty FROM installment_sale_items WHERE itemType='inventory' AND itemId=?";
  const installment = money(db.prepare(installmentSql).get(id)?.qty);
  const expected = Math.max(0, Math.round(legacy + order - returned + installment));
  if (Number(product.saleCount || 0) !== expected) {
    result.saleCountMismatches.push({ productId: id, name: product.name, stored: Number(product.saleCount || 0), expected });
  }
}

result.summary = {
  repairableCount: result.repairable.length,
  humanReviewCount: result.humanReview.length,
  saleCountMismatchCount: result.saleCountMismatches.length,
};
console.log(JSON.stringify(result, null, 2));
db.close();

if (result.health.quickCheck !== 'ok' || result.health.foreignKeyErrors > 0) process.exit(1);
