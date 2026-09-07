import { allAsync, getAsync } from '../db/query';
import { accountingMovementDelta, calculateInstallmentContractAccountingState } from './accountingEngine';
import { getPartnerAccountingBreakdown } from './accountingGovernance';

const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

const withRunning = (kind: 'customer' | 'partner', rows: any[]) => {
  let running = 0;
  return rows.map((row) => {
    const debit = asNumber(row.debit);
    const credit = asNumber(row.credit);
    const delta = accountingMovementDelta(kind, { debit, credit });
    running += delta;
    return { ...row, debit, credit, delta, runningBalance: running };
  });
};

export const getAccountingDrilldown = async (kindInput: unknown, idInput: unknown) => {
  const kind = String(kindInput || '').trim().toLowerCase();
  const id = Number(idInput || 0);
  if (!Number.isInteger(id) || id <= 0) throw new Error('شناسه مسیر حسابداری نامعتبر است.');

  if (kind === 'customer') {
    const entity = await getAsync(`SELECT id, fullName AS title FROM customers WHERE id=? LIMIT 1`, [id]);
    if (!entity) throw new Error('مشتری یافت نشد.');
    const rows = await allAsync(`SELECT id,transactionDate,createdAt,updatedAt,description,COALESCE(debit,0) debit,COALESCE(credit,0) credit,referenceType,referenceId FROM customer_ledger WHERE customerId=? ORDER BY datetime(COALESCE(transactionDate,createdAt,updatedAt)) ASC,id ASC`, [id]);
    const entries = withRunning('customer', rows);
    return { kind, entity, target: { label: 'مانده حساب مشتری', amount: (entries.length ? entries[entries.length - 1].runningBalance : 0) }, entries };
  }

  if (kind === 'partner') {
    const data = await getPartnerAccountingBreakdown(id);
    if (!data) throw new Error('همکار یافت نشد.');
    return { kind, entity: { id, title: data.partner.partnerName }, target: { label: 'مانده قطعی دفتر همکار', amount: data.summary.canonicalBalance }, entries: data.entries, profitAllocations: data.profitAllocations, summary: data.summary };
  }

  if (kind === 'installment') {
    const sale: any = await getAsync(`SELECT s.*,c.fullName customerName FROM installment_sales s LEFT JOIN customers c ON c.id=s.customerId WHERE s.id=? LIMIT 1`, [id]);
    if (!sale) throw new Error('پرونده اقساطی یافت نشد.');
    const payments = await allAsync(`SELECT t.id,t.payment_date transactionDate,t.notes description,COALESCE(t.amount_paid,0) amount,p.id installmentPaymentId,p.installmentNumber,p.dueDate FROM installment_transactions t JOIN installment_payments p ON p.id=t.installment_payment_id WHERE p.saleId=? ORDER BY date(t.payment_date) ASC,t.id ASC`, [id]).catch(() => [] as any[]);
    const collected = payments.reduce((sum: number, row: any) => sum + asNumber(row.amount), 0);
    const state = calculateInstallmentContractAccountingState({ actualSalePrice: sale.actualSalePrice, downPayment: sale.downPayment, collectedAfterDownPayment: collected, canceled: String(sale.status || '') === 'canceled' });
    let running = state.contractDebt;
    const entries = [
      { id: `contract:${id}`, transactionDate: sale.saleDateISO || sale.saleDate || sale.dateCreated, description: `اصل بدهی قرارداد پس از پیش‌پرداخت`, debit: state.contractDebt, credit: 0, delta: state.contractDebt, runningBalance: state.contractDebt, referenceType: 'installment_sale', referenceId: id },
      ...payments.map((row: any) => { running -= asNumber(row.amount); return { ...row, debit: 0, credit: asNumber(row.amount), delta: -asNumber(row.amount), runningBalance: Math.max(0, running), referenceType: 'installment_transaction', referenceId: row.id }; }),
    ];
    const checks = await allAsync(`SELECT id,checkNumber,bankName,dueDate,amount,status FROM installment_checks WHERE saleId=? ORDER BY id`, [id]).catch(() => [] as any[]);
    return { kind, entity: { id, title: `قرارداد اقساطی ${sale.customerName || sale.customerId || id}` }, target: { label: 'مانده قابل وصول', amount: state.remaining }, entries, checks, summary: { ...state, actualSalePrice: asNumber(sale.actualSalePrice), downPayment: asNumber(sale.downPayment), collected } };
  }

  if (kind === 'sale') {
    const sale: any = await getAsync(`SELECT s.*,c.fullName customerName FROM sales_orders s LEFT JOIN customers c ON c.id=s.customerId WHERE s.id=? LIMIT 1`, [id]);
    if (!sale) throw new Error('فاکتور فروش یافت نشد.');
    const items = await allAsync(`SELECT id,itemType,itemId,description,quantity,unitPrice,COALESCE(discountPerItem,0) discountPerItem,totalPrice,COALESCE(buyPrice,0) buyPrice FROM sales_order_items WHERE orderId=? ORDER BY id`, [id]);
    const snapshots = await allAsync(`SELECT * FROM sale_profit_snapshots WHERE sourceKind='sales_order' AND sourceId=? ORDER BY id`, [id]).catch(() => [] as any[]);
    const snapshotIds = snapshots.map((row: any) => Number(row.id)).filter(Boolean);
    const allocations = snapshotIds.length ? await allAsync(`SELECT * FROM sale_profit_allocations WHERE snapshotId IN (${snapshotIds.map(()=>'?').join(',')}) ORDER BY snapshotId,id`, snapshotIds).catch(() => [] as any[]) : [];
    const totalCost = items.reduce((sum: number, row: any) => sum + asNumber(row.buyPrice) * asNumber(row.quantity), 0);
    const totalProfit = snapshots.reduce((sum: number, row: any) => sum + asNumber(row.totalProfitAmount), 0);
    const entries = items.map((row: any) => ({ id: row.id, description: row.description, quantity: asNumber(row.quantity), saleAmount: asNumber(row.totalPrice), costAmount: asNumber(row.buyPrice) * asNumber(row.quantity), delta: asNumber(row.totalPrice), referenceType: 'sales_order_item', referenceId: row.id }));
    return { kind, entity: { id, title: `فاکتور ${id}${sale.customerName ? ` - ${sale.customerName}` : ''}` }, target: { label: 'مبلغ نهایی فروش', amount: asNumber(sale.grandTotal) }, entries, items, snapshots, allocations, summary: { subtotal: asNumber(sale.subtotal), grandTotal: asNumber(sale.grandTotal), totalCost, totalProfit } };
  }

  if (kind === 'profit') {
    const snapshot: any = await getAsync(`SELECT * FROM sale_profit_snapshots WHERE id=? LIMIT 1`, [id]);
    if (!snapshot) throw new Error('Snapshot سود یافت نشد.');
    const allocations = await allAsync(`SELECT * FROM sale_profit_allocations WHERE snapshotId=? ORDER BY id`, [id]);
    const capitalAllocations = await allAsync(`SELECT * FROM sale_profit_capital_allocations WHERE snapshotId=? ORDER BY id`, [id]).catch(() => [] as any[]);
    return { kind, entity: { id, title: snapshot.itemDescription || `Snapshot سود ${id}` }, target: { label: 'سود کل منجمدشده', amount: asNumber(snapshot.totalProfitAmount) }, entries: allocations.map((row: any) => ({ ...row, delta: asNumber(row.amount), description: row.allocationType, referenceType: 'profit_allocation', referenceId: row.id })), snapshot, allocations, capitalAllocations };
  }

  throw new Error('نوع Drill-down حسابداری پشتیبانی نمی‌شود.');
};
