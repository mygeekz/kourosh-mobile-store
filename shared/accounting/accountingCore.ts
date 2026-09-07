export const ACCOUNTING_MONEY_EPSILON = 0.00001;

export type AccountingLedgerKind = "partner" | "customer";

export type AccountingMovement = {
  debit?: number | string | null;
  credit?: number | string | null;
};

export type NormalizedAccountingMovement = {
  debit: number;
  credit: number;
  amount: number;
  direction: "debit" | "credit" | "balanced";
};

export type AccountingMovementPolicy = {
  allowBalancedPair?: boolean;
};

export const asFiniteAccountingMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) throw new Error("مبلغ حسابداری نامعتبر است.");
  return parsed;
};

export const normalizeAccountingMovement = (
  movement: AccountingMovement,
  policy: AccountingMovementPolicy = {},
): NormalizedAccountingMovement => {
  const debit = asFiniteAccountingMoney(movement.debit);
  const credit = asFiniteAccountingMoney(movement.credit);
  if (debit < -ACCOUNTING_MONEY_EPSILON || credit < -ACCOUNTING_MONEY_EPSILON) {
    throw new Error("مبلغ حسابداری نمی‌تواند منفی باشد.");
  }
  const hasDebit = debit > ACCOUNTING_MONEY_EPSILON;
  const hasCredit = credit > ACCOUNTING_MONEY_EPSILON;
  if (!hasDebit && !hasCredit) {
    throw new Error("مبالغ نامعتبر: حداقل یکی از بدهکار/بستانکار باید مثبت باشد.");
  }
  if (hasDebit && hasCredit) {
    const isBalanced = Math.abs(debit - credit) <= ACCOUNTING_MONEY_EPSILON;
    if (!policy.allowBalancedPair || !isBalanced) {
      throw new Error("مبالغ نامعتبر: ثبت دستی باید فقط یک سمت بدهکار یا بستانکار داشته باشد.");
    }
    return { debit, credit, amount: debit, direction: "balanced" };
  }
  return {
    debit: hasDebit ? debit : 0,
    credit: hasCredit ? credit : 0,
    amount: hasDebit ? debit : credit,
    direction: hasDebit ? "debit" : "credit",
  };
};

export const accountingMovementDelta = (
  kind: AccountingLedgerKind,
  movement: AccountingMovement,
): number => {
  const normalized = normalizeAccountingMovement(movement, { allowBalancedPair: true });
  if (normalized.direction === "balanced") return 0;
  return kind === "partner"
    ? normalized.credit - normalized.debit
    : normalized.debit - normalized.credit;
};

export type AccountingMovementReadInspection = {
  debit: number;
  credit: number;
  delta: number;
  issue: null | "non_finite" | "negative" | "zero_movement" | "dual_sided";
};

// Historical/legacy reads must never make an account page unavailable merely
// because an old row predates today's write invariants. New writes still use
// normalizeAccountingMovement() and remain strict; this helper only inspects
// already-persisted rows and exposes anomalies to reconciliation/UI.
export const inspectAccountingMovementForRead = (
  kind: AccountingLedgerKind,
  movement: AccountingMovement,
): AccountingMovementReadInspection => {
  const rawDebit = Number(movement.debit ?? 0);
  const rawCredit = Number(movement.credit ?? 0);
  if (!Number.isFinite(rawDebit) || !Number.isFinite(rawCredit)) {
    return { debit: 0, credit: 0, delta: 0, issue: "non_finite" };
  }
  const debit = rawDebit;
  const credit = rawCredit;
  const delta = kind === "partner" ? credit - debit : debit - credit;
  let issue: AccountingMovementReadInspection["issue"] = null;
  if (debit < -ACCOUNTING_MONEY_EPSILON || credit < -ACCOUNTING_MONEY_EPSILON) issue = "negative";
  else if (Math.abs(debit) <= ACCOUNTING_MONEY_EPSILON && Math.abs(credit) <= ACCOUNTING_MONEY_EPSILON) issue = "zero_movement";
  else if (debit > ACCOUNTING_MONEY_EPSILON && credit > ACCOUNTING_MONEY_EPSILON && Math.abs(debit - credit) > ACCOUNTING_MONEY_EPSILON) issue = "dual_sided";
  return { debit, credit, delta, issue };
};

export const calculateAccountingBalanceFromMovements = (
  kind: AccountingLedgerKind,
  movements: AccountingMovement[],
): number => (movements || []).reduce((sum, movement) => sum + accountingMovementDelta(kind, movement), 0);

export const previewAccountingBalanceAfterMovement = (
  kind: AccountingLedgerKind,
  currentBalance: unknown,
  movement: AccountingMovement,
): number => {
  const base = asFiniteAccountingMoney(currentBalance);
  const debit = asFiniteAccountingMoney(movement.debit);
  const credit = asFiniteAccountingMoney(movement.credit);
  if (Math.abs(debit) <= ACCOUNTING_MONEY_EPSILON && Math.abs(credit) <= ACCOUNTING_MONEY_EPSILON) return base;
  return base + accountingMovementDelta(kind, { debit, credit });
};


export type AccountingSaleLine = {
  quantity?: unknown;
  unitPrice?: unknown;
  discountPerItem?: unknown;
};

export type AccountingSalesSummary = {
  subtotal: number;
  itemsDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
};

export const calculateSalesAccountingSummary = (
  lines: AccountingSaleLine[],
  globalDiscount: unknown = 0,
  taxPercentage: unknown = 0,
): AccountingSalesSummary => {
  const subtotal = (lines || []).reduce((sum, line) =>
    sum + Math.max(0, asFiniteAccountingMoney(line.quantity)) * Math.max(0, asFiniteAccountingMoney(line.unitPrice)), 0);
  const itemsDiscount = (lines || []).reduce((sum, line) =>
    sum + Math.max(0, asFiniteAccountingMoney(line.discountPerItem)) * Math.max(0, asFiniteAccountingMoney(line.quantity)), 0);
  const global = Math.max(0, asFiniteAccountingMoney(globalDiscount));
  const taxableAmount = Math.max(0, subtotal - itemsDiscount - global);
  const taxRate = Math.max(0, asFiniteAccountingMoney(taxPercentage));
  const taxAmount = taxableAmount * taxRate / 100;
  return { subtotal, itemsDiscount, taxableAmount, taxAmount, grandTotal: taxableAmount + taxAmount };
};

export type SaleProfitAccountingInput = {
  quantity?: unknown;
  saleAmount?: unknown;
  initialCostPerUnit?: unknown;
  marketCostPerUnit?: unknown;
  ownershipType?: string | null;
};

export type SaleProfitAccountingState = {
  quantity: number;
  saleAmount: number;
  initialCostPerUnit: number;
  marketCostPerUnit: number;
  initialCostAmount: number;
  marketCostAmount: number;
  ownerGainAmount: number;
  sharedProfitAmount: number;
  totalProfitAmount: number;
};

export const calculateSaleProfitAccountingState = (
  input: SaleProfitAccountingInput,
): SaleProfitAccountingState => {
  const quantity = Math.max(0, asFiniteAccountingMoney(input.quantity));
  const saleAmount = asFiniteAccountingMoney(input.saleAmount);
  const initialCostPerUnit = Math.max(0, asFiniteAccountingMoney(input.initialCostPerUnit));
  const marketCostPerUnit = Math.max(0, asFiniteAccountingMoney(input.marketCostPerUnit));
  const initialCostAmount = initialCostPerUnit * quantity;
  const marketCostAmount = marketCostPerUnit * quantity;
  const personal = String(input.ownershipType || '').trim().toLowerCase() === 'personal';
  const ownerGainAmount = personal ? marketCostAmount - initialCostAmount : 0;
  const sharedProfitAmount = personal ? saleAmount - marketCostAmount : saleAmount - initialCostAmount;
  return {
    quantity, saleAmount, initialCostPerUnit, marketCostPerUnit,
    initialCostAmount, marketCostAmount, ownerGainAmount, sharedProfitAmount,
    totalProfitAmount: ownerGainAmount + sharedProfitAmount,
  };
};

export const allocateAccountingAmountByShares = <T extends { sharePercent?: unknown }>(
  amount: unknown,
  shares: T[],
): Array<T & { amount: number }> => {
  const value = asFiniteAccountingMoney(amount);
  return (shares || []).map((share) => ({
    ...share,
    amount: value * (asFiniteAccountingMoney(share.sharePercent) / 100),
  }));
};

export type InstallmentContractAccountingInput = {
  actualSalePrice?: unknown;
  downPayment?: unknown;
  collectedAfterDownPayment?: unknown;
  canceled?: boolean;
};

export type InstallmentContractAccountingState = {
  contractDebt: number;
  collectedAfterDownPayment: number;
  remaining: number;
  overpayment: number;
};

export const calculateInstallmentContractAccountingState = (
  input: InstallmentContractAccountingInput,
): InstallmentContractAccountingState => {
  const actualSalePrice = Math.max(0, asFiniteAccountingMoney(input.actualSalePrice));
  const downPayment = Math.max(0, asFiniteAccountingMoney(input.downPayment));
  const collected = Math.max(0, asFiniteAccountingMoney(input.collectedAfterDownPayment));
  const contractDebt = Math.max(0, actualSalePrice - downPayment);
  return {
    contractDebt,
    collectedAfterDownPayment: collected,
    remaining: input.canceled ? 0 : Math.max(0, contractDebt - collected),
    overpayment: Math.max(0, collected - contractDebt),
  };
};
