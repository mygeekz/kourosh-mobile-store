export type BalanceState = 'positive' | 'negative' | 'settled' | 'overdue';
export type BalanceSubject = 'customer' | 'partner';

export const getBalanceState = (
  balance?: number | null,
  options: { overdue?: boolean } = {}
): BalanceState => {
  const amount = Number(balance || 0);
  if (options.overdue && amount !== 0) return 'overdue';
  if (amount === 0) return 'settled';
  if (amount > 0) return 'positive';
  return 'negative';
};

export const getBalanceLabel = (state: BalanceState, subject: BalanceSubject = 'customer') => {
  if (subject === 'partner') {
    if (state === 'positive') return 'شما به این همکار بدهکار هستید';
    if (state === 'negative') return 'شما از این همکار طلبکار هستید';
    if (state === 'overdue') return 'مانده نیازمند پیگیری';
    return 'حساب این همکار تسویه است';
  }
  if (state === 'positive') return 'این مشتری بستانکار است';
  if (state === 'negative') return 'این مشتری بدهکار است';
  if (state === 'overdue') return 'بدهی سررسید گذشته';
  return 'حساب این مشتری تسویه است';
};

export const getBalanceActionLabel = (state: BalanceState, subject: BalanceSubject = 'customer') => {
  if (subject === 'partner') {
    if (state === 'positive') return 'ثبت پرداخت';
    if (state === 'negative') return 'ثبت دریافت';
    if (state === 'overdue') return 'پیگیری تسویه';
    return 'تراکنش جدید';
  }
  if (state === 'positive') return 'ثبت پرداخت';
  if (state === 'negative') return 'ثبت دریافت';
  if (state === 'overdue') return 'پیگیری فوری';
  return 'تراکنش جدید';
};

export const getBalanceBadgeClass = (state: BalanceState) => {
  switch (state) {
    case 'positive': return 'adaptive-badge adaptive-badge--positive';
    case 'negative': return 'adaptive-badge adaptive-badge--negative';
    case 'overdue': return 'adaptive-badge adaptive-badge--overdue';
    default: return 'adaptive-badge adaptive-badge--settled';
  }
};

export const getBalanceRowClass = (state: BalanceState) => {
  switch (state) {
    case 'positive': return 'adaptive-row adaptive-row--positive';
    case 'negative': return 'adaptive-row adaptive-row--negative';
    case 'overdue': return 'adaptive-row adaptive-row--overdue';
    default: return 'adaptive-row adaptive-row--settled';
  }
};

export const getBalancePanelClass = (state: BalanceState) => {
  switch (state) {
    case 'positive': return 'adaptive-panel adaptive-panel--positive';
    case 'negative': return 'adaptive-panel adaptive-panel--negative';
    case 'overdue': return 'adaptive-panel adaptive-panel--overdue';
    default: return 'adaptive-panel adaptive-panel--settled';
  }
};
