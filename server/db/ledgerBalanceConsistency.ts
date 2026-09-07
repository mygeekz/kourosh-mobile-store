import { allAsync, getAsync, runAsync } from './query';
import { accountingMovementDelta, getCanonicalAccountingBalance } from "../accounting/accountingEngine";

// v336 centralizes the canonical formulas in accountingEngine. Keep the v333
// contract visible here for successor audits/documentation:
// partner canonical = SUM(COALESCE(credit,0) - COALESCE(debit,0))
// customer canonical = SUM(COALESCE(debit,0) - COALESCE(credit,0))

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getPartnerLedgerCanonicalBalance = async (partnerId: number): Promise<number> =>
  getCanonicalAccountingBalance("partner", partnerId);

export const getCustomerLedgerRawCanonicalBalance = async (customerId: number): Promise<number> =>
  getCanonicalAccountingBalance("customer", customerId);

export const rebuildPartnerLedgerBalanceCache = async (partnerId: number): Promise<number> => {
  const rows = await allAsync(
    `SELECT id, debit, credit
       FROM partner_ledger
      WHERE partnerId = ?
      ORDER BY datetime(COALESCE(transactionDate, createdAt, updatedAt)) ASC, id ASC`,
    [partnerId],
  );
  let balance = 0;
  for (const row of rows as any[]) {
    balance += accountingMovementDelta("partner", row);
    await runAsync(`UPDATE partner_ledger SET balance = ? WHERE id = ?`, [balance, Number(row.id)]);
  }
  return balance;
};

export const rebuildCustomerLedgerBalanceCache = async (customerId: number): Promise<number> => {
  const rows = await allAsync(
    `SELECT id, debit, credit
       FROM customer_ledger
      WHERE customerId = ?
      ORDER BY datetime(COALESCE(transactionDate, createdAt, updatedAt)) ASC, id ASC`,
    [customerId],
  );
  let rawBalance = 0;
  for (const row of rows as any[]) {
    rawBalance += accountingMovementDelta("customer", row);
    await runAsync(`UPDATE customer_ledger SET balance = ? WHERE id = ?`, [rawBalance, Number(row.id)]);
  }

  let persistedBalance = rawBalance;
  try {
    const effective = await getAsync(
      `SELECT currentBalance FROM v_customer_effective_balance WHERE customerId = ?`,
      [customerId],
    );
    if (effective && Number.isFinite(Number(effective.currentBalance))) {
      persistedBalance = Number(effective.currentBalance);
    }
  } catch (_error) {
    // View may not exist during very early schema bootstrap; raw ledger balance is still safe.
  }
  await runAsync(`UPDATE customers SET currentBalance = ? WHERE id = ?`, [persistedBalance, customerId]).catch(() => undefined);
  return persistedBalance;
};

export const rebuildAllLedgerBalanceCaches = async (): Promise<{ partners: number; customers: number }> => {
  const partnerRows = await allAsync(`SELECT DISTINCT partnerId FROM partner_ledger WHERE partnerId IS NOT NULL`).catch(() => [] as any[]);
  const customerRows = await allAsync(`SELECT DISTINCT customerId FROM customer_ledger WHERE customerId IS NOT NULL`).catch(() => [] as any[]);
  for (const row of partnerRows as any[]) await rebuildPartnerLedgerBalanceCache(Number(row.partnerId));
  for (const row of customerRows as any[]) await rebuildCustomerLedgerBalanceCache(Number(row.customerId));
  return { partners: partnerRows.length, customers: customerRows.length };
};
