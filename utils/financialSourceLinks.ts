export type FinancialSourceKind =
  | 'sales_order'
  | 'legacy_sale'
  | 'installment_sale'
  | 'installment_check'
  | 'repair'
  | 'phone'
  | 'product'
  | 'partner_settlement_batch';

export type FinancialSourceRouteInput = {
  kind: FinancialSourceKind;
  id?: number | null;
  parentId?: number | null;
  partnerId?: number | string | null;
  batchId?: string | null;
  paymentId?: number | null;
  checkId?: number | null;
};

export type FinancialSourceTarget = {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
};

const faNumber = (value: number) => Number(value || 0).toLocaleString('fa-IR');

export const buildFinancialSourceTarget = (input: FinancialSourceRouteInput): FinancialSourceTarget | null => {
  const id = Math.max(0, Math.floor(Number(input.id || 0)));
  const parentId = Math.max(0, Math.floor(Number(input.parentId || 0)));

  if (input.kind === 'sales_order' && id > 0) {
    return {
      path: `/invoices/${id}`,
      label: `فاکتور فروش #${faNumber(id)}`,
      shortLabel: 'فاکتور فروش',
      icon: 'fa-solid fa-file-invoice',
    };
  }

  if (input.kind === 'legacy_sale' && id > 0) {
    return {
      path: `/invoices/${id}?source=legacy`,
      label: `فروش نقدی قدیمی #${faNumber(id)}`,
      shortLabel: 'فروش نقدی',
      icon: 'fa-solid fa-cash-register',
    };
  }

  if (input.kind === 'installment_sale' && id > 0) {
    const paymentId = Math.max(0, Math.floor(Number(input.paymentId || 0)));
    const suffix = paymentId > 0 ? `?tab=installments&paymentId=${paymentId}` : '';
    return {
      path: `/installment-sales/${id}${suffix}`,
      label: `پرونده اقساطی #${faNumber(id)}`,
      shortLabel: paymentId > 0 ? 'پرداخت قسط' : 'پرونده اقساطی',
      icon: 'fa-solid fa-file-invoice-dollar',
    };
  }

  if (input.kind === 'installment_check' && parentId > 0) {
    const checkId = Math.max(0, Math.floor(Number(input.checkId || input.id || 0)));
    const suffix = checkId > 0 ? `&checkId=${checkId}` : '';
    return {
      path: `/installment-sales/${parentId}?tab=checks${suffix}`,
      label: checkId > 0 ? `چک اقساطی #${faNumber(checkId)}` : `چک‌های پرونده #${faNumber(parentId)}`,
      shortLabel: 'چک اقساطی',
      icon: 'fa-solid fa-money-check-dollar',
    };
  }

  if (input.kind === 'repair' && id > 0) {
    return {
      path: `/repairs/${id}`,
      label: `پرونده تعمیر #${faNumber(id)}`,
      shortLabel: 'پرونده تعمیر',
      icon: 'fa-solid fa-screwdriver-wrench',
    };
  }

  if (input.kind === 'phone' && id > 0) {
    return {
      path: `/mobile-phones?phoneId=${id}`,
      label: `گوشی #${faNumber(id)}`,
      shortLabel: 'گوشی',
      icon: 'fa-solid fa-mobile-screen-button',
    };
  }

  if (input.kind === 'product' && id > 0) {
    return {
      path: `/products?productId=${id}`,
      label: `کالا #${faNumber(id)}`,
      shortLabel: 'کالا',
      icon: 'fa-solid fa-box',
    };
  }

  if (input.kind === 'partner_settlement_batch') {
    const partnerId = String(input.partnerId || '').trim();
    const batchId = String(input.batchId || '').trim();
    if (!partnerId || !batchId) return null;
    const params = new URLSearchParams({ view: 'ledger', settlementBatchId: batchId });
    return {
      path: `/partners/${encodeURIComponent(partnerId)}?${params.toString()}`,
      label: `سند تسویه ${batchId}`,
      shortLabel: 'سند تسویه',
      icon: 'fa-solid fa-file-signature',
    };
  }

  return null;
};
