export type ManagerProfitBucket = {
  realizedRevenue: number;
  realizedProfit: number;
  fullProfit: number;
  rowsCount: number;
};

export type ManagerProfitBuckets = {
  accessories: ManagerProfitBucket;
  cashPhone: ManagerProfitBucket;
  installmentPhone: ManagerProfitBucket;
  credit: ManagerProfitBucket;
};

export type ManagerProfitGroup = keyof ManagerProfitBuckets | 'all';

/**
 * Financial calculations and report presentation retain the exact backend amount.
 * Any display-level rounding would distort collection rates and cross-card reconciliation.
 */
export const normalizeManagerMoney = (value: unknown): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

export const normalizeManagerProfitBucket = (raw: any): ManagerProfitBucket => {
  const fullProfit = normalizeManagerMoney(raw?.fullProfit);
  const rawRealizedProfit = normalizeManagerMoney(raw?.realizedProfit);
  const realizedProfit = fullProfit >= 0
    ? Math.min(fullProfit, Math.max(0, rawRealizedProfit))
    : Math.max(fullProfit, Math.min(0, rawRealizedProfit));

  return {
    realizedRevenue: normalizeManagerMoney(raw?.realizedRevenue),
    realizedProfit,
    fullProfit,
    rowsCount: Number.isFinite(Number(raw?.rowsCount)) ? Number(raw.rowsCount) : 0,
  };
};

export const emptyManagerProfitBucket = (): ManagerProfitBucket => ({
  realizedRevenue: 0,
  realizedProfit: 0,
  fullProfit: 0,
  rowsCount: 0,
});

export const emptyManagerProfitBuckets = (): ManagerProfitBuckets => ({
  accessories: emptyManagerProfitBucket(),
  cashPhone: emptyManagerProfitBucket(),
  installmentPhone: emptyManagerProfitBucket(),
  credit: emptyManagerProfitBucket(),
});

export const normalizeManagerProfitBuckets = (raw: any): ManagerProfitBuckets => ({
  accessories: normalizeManagerProfitBucket(raw?.accessories),
  cashPhone: normalizeManagerProfitBucket(raw?.cashPhone),
  installmentPhone: normalizeManagerProfitBucket(raw?.installmentPhone),
  credit: normalizeManagerProfitBucket(raw?.credit),
});

export const getUncollectedManagerProfit = (bucket: ManagerProfitBucket): number =>
  Math.max(0, bucket.fullProfit - bucket.realizedProfit);

export const getCollectedInstallmentProfit = (bucket: ManagerProfitBucket): number =>
  Math.min(Math.max(0, bucket.fullProfit), Math.max(0, bucket.realizedProfit));

export const getInstallmentUncollectedProfit = (bucket: ManagerProfitBucket): number =>
  Math.max(0, bucket.fullProfit - getCollectedInstallmentProfit(bucket));

export const getManagerProfitCollectionRate = (
  bucket: ManagerProfitBucket,
  collectedProfit = bucket.realizedProfit,
): number => {
  const fullProfit = Math.max(0, Number(bucket.fullProfit || 0));
  if (fullProfit === 0) return 0;
  return Math.min(100, Math.max(0, (Number(collectedProfit || 0) / fullProfit) * 100));
};

export const buildManagerProfitDetailsHref = (
  group: ManagerProfitGroup,
  from: string,
  to: string,
): string => {
  const qs = new URLSearchParams({ group, from, to, focus: 'uncollected' });
  return `/reports/realized-profit?${qs.toString()}`;
};
