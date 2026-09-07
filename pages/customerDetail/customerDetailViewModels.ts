import moment from 'jalali-moment';
import { formatKnownShamsiDate, getCustomerPurchaseDateValue } from './customerDetailControllerSupport';

export const buildLatestPurchaseDateLabel = (purchaseHistory: any[]) => {
  const firstPurchaseWithDate = purchaseHistory.find((item: any) => getCustomerPurchaseDateValue(item));
  return firstPurchaseWithDate ? formatKnownShamsiDate(getCustomerPurchaseDateValue(firstPurchaseWithDate), '—') : '—';
};

export const buildOpenInstallmentDue = (customerInstallmentSales: any[]) => {
  const dueItems = customerInstallmentSales.flatMap((sale) => {
    const summary = String(sale?.itemsSummary || sale?.phoneModel || 'فروش اقساطی').trim();
    const saleStatus = String(sale?.overallStatus || '').trim();
    const normalizedSaleStatus = saleStatus.toLowerCase();
    const saleDueDate = String(sale?.nextDueDate || '').trim();
    const saleDueAmount = Number(sale?.nextDueAmount || sale?.installmentAmount || 0);
    const isClosedSale = [
      'تکمیل شده',
      'فسخ شده',
      'completed',
      'settled',
      'canceled',
      'cancelled',
    ].includes(normalizedSaleStatus);

    if (
      saleDueDate
      && saleDueAmount > 0
      && !isClosedSale
    ) {
      return [{
        saleId: Number(sale.id),
        paymentId: 0,
        installmentNumber: 0,
        dueDate: saleDueDate,
        amountDue: saleDueAmount,
        summary,
        overallStatus: saleStatus,
      }];
    }

    return (sale?.payments || [])
      .filter((payment: any) => !payment?.paid && Number(payment?.amountDue || 0) > 0 && String(payment?.dueDate || '').trim())
      .map((payment: any) => ({
        saleId: Number(sale.id),
        paymentId: Number(payment.id),
        installmentNumber: Number(payment.installmentNumber || 0),
        dueDate: String(payment.dueDate),
        amountDue: Number(payment.amountDue || 0),
        summary,
        overallStatus: saleStatus,
      }));
  });

  if (!dueItems.length) return null;

  const sorted = dueItems.sort((a, b) => {
    const ma = moment(a.dueDate, 'jYYYY/jMM/jDD', true);
    const mb = moment(b.dueDate, 'jYYYY/jMM/jDD', true);
    const ta = ma.isValid() ? ma.valueOf() : Number.MAX_SAFE_INTEGER;
    const tb = mb.isValid() ? mb.valueOf() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return a.installmentNumber - b.installmentNumber;
  });

  return sorted[0];
};

export const buildOpenInstallmentDueStatus = (openInstallmentDue: any) => {
  if (!openInstallmentDue?.dueDate) {
    return {
      label: 'بدون سررسید باز',
      hint: 'در حال حاضر قسط بازی برای این مشتری ثبت اطلاعات نشده است.',
      tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      icon: 'fa-badge-check',
      severity: 'neutral' as const,
    };
  }

  const today = moment().startOf('day');
  const due = moment(openInstallmentDue.dueDate, 'jYYYY/jMM/jDD', true).startOf('day');
  if (!due.isValid()) {
    return {
      label: 'تاریخ نامعتبر',
      hint: 'تاریخ سررسید این قسط معتبر نیست و نیاز به بررسی و ادامه دارد.',
      tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      icon: 'fa-calendar-xmark',
      severity: 'neutral' as const,
    };
  }

  const dayDiff = due.diff(today, 'days');
  if (dayDiff < 0) {
    const overdueDays = Math.abs(dayDiff).toLocaleString('fa-IR');
    return {
      label: 'عقب‌افتاده',
      hint: `${overdueDays} روز از این سررسید گذشته است.`,
      tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
      icon: 'fa-triangle-exclamation',
      severity: 'danger' as const,
    };
  }
  if (dayDiff === 0) {
    return {
      label: 'امروز',
      hint: 'این قسط امروز سررسید می‌شود و بهتر است امروز پیگیری شود.',
      tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
      icon: 'fa-clock',
      severity: 'warning' as const,
    };
  }
  if (dayDiff === 1) {
    return {
      label: 'فردا',
      hint: 'این قسط فردا سررسید می‌شود.',
      tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
      icon: 'fa-calendar-day',
      severity: 'info' as const,
    };
  }
  const inDays = dayDiff.toLocaleString('fa-IR');
  return {
    label: `${inDays} روز دیگر`,
    hint: `تا این سررسید ${inDays} روز باقی مانده است.`,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
    icon: 'fa-calendar-check',
    severity: 'success' as const,
  };
};

export const filterCustomerLedgerEntries = (
  ledger: any[],
  ledgerViewFilter: 'all' | 'debit' | 'credit' | 'recent' | string,
  ledgerSearch: string,
  ledgerRange: 'all' | 'today' | 'week' | 'month' | string
) => {
  const now = Date.now();
  const q = ledgerSearch.trim().toLowerCase();
  return ledger.filter((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    const ts = new Date(entry.transactionDate || '').getTime();
    if (ledgerViewFilter === 'debit' && debit <= 0) return false;
    if (ledgerViewFilter === 'credit' && credit <= 0) return false;
    if (ledgerViewFilter === 'recent' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
    if (ledgerRange === 'today') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (!ts || ts < start) return false;
    }
    if (ledgerRange === 'week' && (!ts || now - ts > 7 * 24 * 60 * 60 * 1000)) return false;
    if (ledgerRange === 'month' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
    if (q) {
      const hay = [entry.description, entry.transactionDate, entry.createdAt, entry.updatedAt, String(entry.balance ?? ''), String(entry.debit ?? ''), String(entry.credit ?? '')]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

export const buildLedgerPrintStats = (ledger: any[]) => {
  const totalDebit = ledger.reduce((sum, entry) => sum + Number(entry?.debit || 0), 0);
  const totalCredit = ledger.reduce((sum, entry) => sum + Number(entry?.credit || 0), 0);
  const latestTransaction = ledger
    .map((entry) => entry?.transactionDate || entry?.createdAt || entry?.updatedAt || '')
    .filter(Boolean)
    .sort()
    .at(-1) || '';

  return {
    totalDebit,
    totalCredit,
    debitCount: ledger.filter((entry) => Number(entry?.debit || 0) > 0).length,
    creditCount: ledger.filter((entry) => Number(entry?.credit || 0) > 0).length,
    latestTransaction,
  };
};
