import { allAsync, getAsync } from "../db/query";
import { accountingMovementDelta } from "./accountingEngine";
import {
  consumeAccountingConfirmation,
  prepareAccountingConfirmation,
  type AccountingActor,
} from "./accountingGovernance";
import { recordAccountingAuditEvent } from "./accountingAuditTrail";

export type SensitiveAccountingAction =
  | "sales_order_cancel"
  | "sales_order_delete"
  | "installment_sale_cancel"
  | "phone_sensitive_update"
  | "product_sensitive_update"
  | "customer_ledger_correction"
  | "customer_ledger_reversal"
  | "partner_ledger_correction"
  | "partner_ledger_reversal"
  | "partner_settlement_submit";

export type FinancialImpact = {
  title: string;
  summaryText: string;
  severity: "warning" | "danger";
  money: Record<string, number>;
  counts: Record<string, number>;
  details?: Record<string, unknown>;
};

const num = (value: unknown): number => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const faMoney = (value: number): string => `${Math.abs(Math.round(value)).toLocaleString("fa-IR")} تومان`;

export const actorFromRequestUser = (user: any): AccountingActor => ({
  userId: user?.id == null ? null : Number(user.id),
  username: user?.username || null,
  role: user?.roleName || user?.role || null,
});

export const prepareSensitiveAccountingOperation = (input: {
  action: SensitiveAccountingAction;
  scopeKey: string;
  actor: AccountingActor;
  payload: unknown;
  impact: FinancialImpact;
}) => {
  const confirmation = prepareAccountingConfirmation(input.action, input.scopeKey, input.actor, {
    payload: input.payload,
    impact: input.impact,
  });
  return { ...confirmation, action: input.action, scopeKey: input.scopeKey, impact: input.impact };
};

export const consumeSensitiveAccountingOperation = (input: {
  token: unknown;
  action: SensitiveAccountingAction;
  scopeKey: string;
  actor: AccountingActor;
  payload: unknown;
}) => consumeAccountingConfirmation(input.token, input.action, input.scopeKey, input.actor, { payload: input.payload });

export const buildSalesOrderImpact = async (
  orderId: number,
  action: "cancel" | "delete",
): Promise<FinancialImpact> => {
  const order = await getAsync(`SELECT * FROM sales_orders WHERE id=?`, [orderId]);
  if (!order) throw new Error("فاکتور یافت نشد.");
  const items = await allAsync(`SELECT itemType,itemId,quantity,unitPrice,buyPrice FROM sales_order_items WHERE orderId=?`, [orderId]);
  const allocation = await getAsync(
    `SELECT COUNT(spa.id) AS count, COALESCE(SUM(spa.amount),0) AS amount
       FROM sale_profit_snapshots sps
       LEFT JOIN sale_profit_allocations spa ON spa.snapshotId=sps.id AND spa.sourceStatus='active'
      WHERE sps.sourceKind='sales_order' AND sps.sourceId=?`,
    [orderId],
  ).catch(() => ({ count: 0, amount: 0 }));
  const total = num(order.grandTotal);
  const isCredit = String(order.paymentMethod || "").toLowerCase() === "credit";
  const customerBalanceDelta = isCredit ? -total : 0;
  const allocationAmount = num(allocation?.amount);
  const itemCount = (items || []).reduce((sum: number, row: any) => sum + Math.max(0, num(row.quantity)), 0);
  const verb = action === "delete" ? "حذف" : "ابطال";
  const parts = [
    `${verb} فاکتور #${orderId}`,
    isCredit ? `مانده مشتری ${faMoney(customerBalanceDelta)} تغییر می‌کند` : "مانده مشتری از این فاکتور تغییر مستقیمی ندارد",
    `${itemCount.toLocaleString("fa-IR")} قلم/واحد به وضعیت قابل‌بازگشت انبار می‌رود`,
    `${Number(allocation?.count || 0).toLocaleString("fa-IR")} تخصیص سود با مجموع ${faMoney(allocationAmount)} غیرفعال می‌شود`,
  ];
  return {
    title: `${verb} فاکتور فروش`,
    summaryText: parts.join("؛ "),
    severity: "danger",
    money: { invoiceTotal: total, customerBalanceDelta, profitAllocationAmount: allocationAmount },
    counts: { inventoryUnits: itemCount, profitAllocations: Number(allocation?.count || 0) },
    details: { orderId, customerId: order.customerId ?? null, paymentMethod: order.paymentMethod ?? null, status: order.status ?? "active" },
  };
};

const sensitivePhoneFields = ["purchasePrice", "currentPurchasePrice", "supplierId", "ownershipProfileId"] as const;
export const buildPhoneSensitiveUpdateImpact = async (phoneId: number, payload: any): Promise<FinancialImpact | null> => {
  const before = await getAsync(`SELECT * FROM phones WHERE id=?`, [phoneId]);
  if (!before) throw new Error("گوشی یافت نشد.");
  const changed = sensitivePhoneFields.filter((field) => payload?.[field] !== undefined && String(payload[field] ?? "") !== String(before[field] ?? ""));
  if (!changed.length) return null;
  const oldPurchase = num(before.purchasePrice);
  const newPurchase = payload.purchasePrice === undefined || payload.purchasePrice === null || String(payload.purchasePrice).trim() === "" ? oldPurchase : num(payload.purchasePrice);
  const oldSupplier = Number(before.supplierId || 0) || null;
  const newSupplier = payload.supplierId === undefined || payload.supplierId === null || String(payload.supplierId).trim() === "" ? oldSupplier : (Number(payload.supplierId || 0) || null);
  const soldRefs = await getAsync(
    `SELECT
       (SELECT COUNT(*) FROM sales_order_items WHERE itemType='phone' AND itemId=?) +
       (SELECT COUNT(*) FROM installment_sale_items WHERE itemType='phone' AND itemId=?) AS count`,
    [phoneId, phoneId],
  ).catch(() => ({ count: 0 }));
  const supplierNetDelta = newPurchase - oldPurchase;
  return {
    title: "تغییر مالی حساس گوشی",
    summaryText: `بهای خرید ${faMoney(oldPurchase)} → ${faMoney(newPurchase)}؛ ${oldSupplier === newSupplier ? "تأمین‌کننده تغییر نمی‌کند" : `تأمین‌کننده ${oldSupplier ?? "—"} → ${newSupplier ?? "—"}`}؛ اثر دفتر خرید با Reversal + Replacement ثبت می‌شود؛ ${Number(soldRefs?.count || 0).toLocaleString("fa-IR")} ارجاع فروش تاریخی بدون بازنویسی Snapshot باقی می‌ماند.`,
    severity: "warning",
    money: { oldPurchasePrice: oldPurchase, newPurchasePrice: newPurchase, supplierLedgerNetDelta: supplierNetDelta },
    counts: { historicalSaleReferences: Number(soldRefs?.count || 0), changedSensitiveFields: changed.length },
    details: { phoneId, changedFields: changed, oldSupplierId: oldSupplier, newSupplierId: newSupplier },
  };
};

const sensitiveProductFields = ["purchasePrice", "supplierId", "ownershipProfileId"] as const;
export const buildProductSensitiveUpdateImpact = async (productId: number, payload: any): Promise<FinancialImpact | null> => {
  const before = await getAsync(`SELECT * FROM products WHERE id=?`, [productId]);
  if (!before) throw new Error("محصول یافت نشد.");
  const changed = sensitiveProductFields.filter((field) => payload?.[field] !== undefined && String(payload[field] ?? "") !== String(before[field] ?? ""));
  if (!changed.length) return null;
  const oldPurchase = num(before.purchasePrice);
  const newPurchase = payload.purchasePrice === undefined || payload.purchasePrice === null || String(payload.purchasePrice).trim() === "" ? oldPurchase : num(payload.purchasePrice);
  const stock = Math.max(0, num(before.stock_quantity));
  const inventoryValueDelta = (newPurchase - oldPurchase) * stock;
  const oldSupplier = Number(before.supplierId || 0) || null;
  const newSupplier = payload.supplierId === undefined || payload.supplierId === null || String(payload.supplierId).trim() === "" ? oldSupplier : (Number(payload.supplierId || 0) || null);
  return {
    title: "تغییر مالی حساس محصول",
    summaryText: `بهای خرید ${faMoney(oldPurchase)} → ${faMoney(newPurchase)}؛ ارزش موجودی جاری ${faMoney(inventoryValueDelta)} تغییر می‌کند؛ ${oldSupplier === newSupplier ? "تأمین‌کننده تغییر نمی‌کند" : `تأمین‌کننده ${oldSupplier ?? "—"} → ${newSupplier ?? "—"}`}؛ Snapshot فروش‌های گذشته دست‌نخورده می‌ماند.`,
    severity: "warning",
    money: { oldPurchasePrice: oldPurchase, newPurchasePrice: newPurchase, inventoryValueDelta },
    counts: { stockUnits: stock, changedSensitiveFields: changed.length },
    details: { productId, changedFields: changed, oldSupplierId: oldSupplier, newSupplierId: newSupplier },
  };
};

export const buildLedgerMutationImpact = async (input: {
  kind: "customer" | "partner";
  accountId: number;
  entryId: number;
  action: "correct" | "reverse";
  replacement?: any;
}): Promise<FinancialImpact> => {
  const table = input.kind === "partner" ? "partner_ledger" : "customer_ledger";
  const accountColumn = input.kind === "partner" ? "partnerId" : "customerId";
  const row = await getAsync(`SELECT * FROM ${table} WHERE id=? AND ${accountColumn}=?`, [input.entryId, input.accountId]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  const oldDelta = accountingMovementDelta(input.kind, { debit: row.debit, credit: row.credit });
  const replacementDebit = input.replacement?.debit == null || input.replacement?.debit === "" ? num(row.debit) : num(input.replacement.debit);
  const replacementCredit = input.replacement?.credit == null || input.replacement?.credit === "" ? num(row.credit) : num(input.replacement.credit);
  const newDelta = input.action === "correct" && input.replacement
    ? accountingMovementDelta(input.kind, { debit: replacementDebit, credit: replacementCredit })
    : 0;
  const balanceDelta = newDelta - oldDelta;
  return {
    title: input.action === "correct" ? "اصلاح سند دفتر با برگشت" : "برگشت سند دفتر",
    summaryText: `سند #${input.entryId} مستقیم ویرایش/حذف نمی‌شود؛ سند برگشتی ساخته می‌شود${input.action === "correct" ? " و سند جایگزین جدید ثبت می‌شود" : ""}. اثر خالص روی مانده: ${balanceDelta >= 0 ? "+" : "−"}${faMoney(balanceDelta)}.`,
    severity: "danger",
    money: { originalMovement: oldDelta, replacementMovement: newDelta, balanceDelta },
    counts: { reversalEntries: 1, replacementEntries: input.action === "correct" ? 1 : 0 },
    details: { kind: input.kind, accountId: input.accountId, entryId: input.entryId, referenceType: row.referenceType || null, referenceId: row.referenceId || null },
  };
};

export const recordSensitiveAccountingMutation = async (input: {
  action: SensitiveAccountingAction;
  entityType: string;
  entityId: number;
  actor: AccountingActor;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  accountType?: "partner" | "customer" | "system" | null;
  accountId?: number | null;
}) => recordAccountingAuditEvent({
  eventType: input.action,
  entityType: input.entityType,
  entityId: input.entityId,
  accountType: input.accountType || null,
  accountId: input.accountId || null,
  actor: input.actor,
  reason: input.reason || null,
  before: input.before,
  after: input.after,
  source: "sensitive_accounting_operation_v341",
});
