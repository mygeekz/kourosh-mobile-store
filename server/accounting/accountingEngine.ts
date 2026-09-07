import { getAsync } from "../db/query";
import {
  ACCOUNTING_MONEY_EPSILON,
  calculateSalesAccountingSummary,
  calculateSaleProfitAccountingState,
  allocateAccountingAmountByShares,
  accountingMovementDelta,
  inspectAccountingMovementForRead,
  calculateAccountingBalanceFromMovements,
  calculateInstallmentContractAccountingState,
  normalizeAccountingMovement,
  type AccountingLedgerKind,
  type AccountingMovement,
  type AccountingMovementPolicy,
  type InstallmentContractAccountingInput,
  type InstallmentContractAccountingState,
  type NormalizedAccountingMovement,
} from "../../shared/accounting/accountingCore";

export {
  ACCOUNTING_MONEY_EPSILON,
  allocateAccountingAmountByShares,
  calculateSaleProfitAccountingState,
  calculateSalesAccountingSummary,
  accountingMovementDelta,
  inspectAccountingMovementForRead,
  calculateAccountingBalanceFromMovements,
  calculateInstallmentContractAccountingState,
  normalizeAccountingMovement,
};
export type {
  AccountingLedgerKind,
  AccountingMovement,
  AccountingMovementPolicy,
  InstallmentContractAccountingInput,
  InstallmentContractAccountingState,
  NormalizedAccountingMovement,
};

export const accountingLedgerDeltaSql = (
  kind: AccountingLedgerKind,
  alias?: string,
): string => {
  const prefix = alias ? `${alias}.` : "";
  return kind === "partner"
    ? `COALESCE(${prefix}credit,0)-COALESCE(${prefix}debit,0)`
    : `COALESCE(${prefix}debit,0)-COALESCE(${prefix}credit,0)`;
};

export const accountingLedgerBalanceSumSql = (
  kind: AccountingLedgerKind,
  alias?: string,
): string => `COALESCE(SUM(${accountingLedgerDeltaSql(kind, alias)}),0)`;

export const getCanonicalAccountingBalance = async (
  kind: AccountingLedgerKind,
  accountId: number,
): Promise<number> => {
  if (!Number.isInteger(Number(accountId)) || Number(accountId) <= 0) {
    throw new Error("شناسه حساب نامعتبر است.");
  }
  const isPartner = kind === "partner";
  const table = isPartner ? "partner_ledger" : "customer_ledger";
  const idColumn = isPartner ? "partnerId" : "customerId";
  const expression = accountingLedgerBalanceSumSql(kind);
  const row = await getAsync(
    `SELECT ${expression} AS balance FROM ${table} WHERE ${idColumn} = ?`,
    [Number(accountId)],
  );
  const value = Number(row?.balance || 0);
  return Number.isFinite(value) ? value : 0;
};

export const normalizeAccountingReference = (input: {
  referenceType?: unknown;
  referenceId?: unknown;
  manualFallbackType: string;
}): { referenceType: string | null; referenceId: number | null } => {
  const type = String(input.referenceType || "").trim();
  const rawId = input.referenceId;
  const id = rawId == null || rawId === "" ? null : Number(rawId);
  if (rawId != null && rawId !== "" && (!Number.isInteger(id) || Number(id) <= 0)) {
    throw new Error("شناسه مرجع حسابداری نامعتبر است.");
  }
  if (id != null && !type) {
    throw new Error("برای شناسه مرجع، نوع مرجع حسابداری نیز الزامی است.");
  }
  return {
    referenceType: type || input.manualFallbackType,
    referenceId: id,
  };
};

export const assertReasonableAccountingDate = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw || Number.isNaN(Date.parse(raw))) throw new Error("تاریخ حسابداری نامعتبر است.");
  const iso = new Date(raw).toISOString();
  const max = new Date();
  max.setUTCFullYear(max.getUTCFullYear() + 2);
  if (new Date(iso).getTime() > max.getTime()) {
    throw new Error("تاریخ حسابداری بیش از دو سال در آینده است و نیاز به بررسی دارد.");
  }
  return iso;
};
