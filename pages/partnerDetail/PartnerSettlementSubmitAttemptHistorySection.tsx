import React from 'react';
import { Button } from '@/components/ui';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

type Props = {
  ctx: Record<string, any>;
};

const asText = (value: unknown): string => String(value ?? '').trim();
const asNumber = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const parseLedgerMeta = (entry: any): Record<string, any> | null => {
  try {
    return entry?.changeHistoryJson ? JSON.parse(String(entry.changeHistoryJson)) : null;
  } catch {
    return null;
  }
};

const statusLabel = (status: unknown, ok: unknown): string => {
  const normalized = asText(status);
  if (normalized === 'submitted') return 'ثبت موفق';
  if (normalized === 'already-submitted') return 'قبلاً ثبت شده';
  if (normalized === 'rejected') return 'رد شده';
  if (ok === false) return 'ناموفق';
  return normalized || 'در انتظار بررسی';
};

const PartnerSettlementSubmitAttemptHistorySection: React.FC<Props> = ({ ctx }) => {
  const {
    atomicSettlementSubmitAttempts = [],
    ledger = [],
    lastAtomicSettlementSubmitError,
    lastAtomicSettlementSubmitResult,
    scrollToLedger,
    setActiveLedgerBatchId,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerViewFilter,
  } = ctx;

  const attempts = Array.isArray(atomicSettlementSubmitAttempts) ? atomicSettlementSubmitAttempts : [];
  const atomicLedgerEntries = (Array.isArray(ledger) ? ledger : []).filter((entry: any) => {
    const meta = parseLedgerMeta(entry);
    return asText(entry?.referenceType) === 'partner_settlement_atomic_submit' || asText(meta?.phase) === 'Business Phase 1L';
  }).sort((a: any, b: any) => asNumber(b?.id) - asNumber(a?.id));

  if (!attempts.length && !atomicLedgerEntries.length && !lastAtomicSettlementSubmitResult && !lastAtomicSettlementSubmitError) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const latestAttempt = attempts[0] || lastAtomicSettlementSubmitResult || lastAtomicSettlementSubmitError || null;
  const successCount = attempts.filter((attempt: any) => attempt?.ok === true).length;
  const failedCount = attempts.filter((attempt: any) => attempt?.ok === false).length;
  const tracedBatchIds = Array.from(new Set(atomicLedgerEntries.map((entry: any) => asText(entry?.settlementBatchId)).filter(Boolean))).slice(0, 5);

  const focusBatch = (batchId: string) => {
    if (!batchId) return;
    if (typeof setActiveLedgerBatchId === 'function') setActiveLedgerBatchId(batchId);
    if (typeof setLedgerDisplayMode === 'function') setLedgerDisplayMode('table');
    if (typeof setLedgerRange === 'function') setLedgerRange('all');
    if (typeof setLedgerViewFilter === 'function') setLedgerViewFilter('all');
    if (typeof scrollToLedger === 'function') scrollToLedger();
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-submit-attempt-history mx-6 mt-5 rounded-[30px] border border-indigo-200/80 bg-indigo-50/60 px-5 py-6 shadow-[0_16px_45px_rgba(79,70,229,0.08)] dark:border-indigo-900/50 dark:bg-indigo-950/20 sm:px-6" data-partner-settlement-submit-attempt-history="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm dark:border-indigo-900/50 dark:bg-slate-950 dark:text-indigo-200">
            <i className="fa-solid fa-clock-rotate-left text-indigo-500" />
            تاریخچه تلاش ثبت و تایم‌لاین مدیر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">سوابق تلاش‌های ثبت تسویه</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            این بخش سوابق تلاش‌های ثبت تسویه و نتیجه هر تلاش را برای پیگیری دقیق نمایش می‌دهد و بدون اقدام شما ثبت جدیدی انجام نمی‌شود.
          </p>
        </div>
        <div className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 text-sm font-black text-indigo-800 shadow-sm dark:border-indigo-900/50 dark:bg-slate-950 dark:text-indigo-200" data-partner-settlement-submit-attempt-history-count={String(attempts.length)}>
          <i className="fa-solid fa-shield-halved" />
          {attempts.length.toLocaleString('fa-IR')} تلاش ثبت‌شده در نشست فعلی
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">آخرین وضعیت</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{latestAttempt ? statusLabel(latestAttempt.status, latestAttempt.ok) : '—'}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">آخرین نتیجه ثبت یا خطای کنترل‌شده.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">موفق / ناموفق</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{successCount.toLocaleString('fa-IR')} / {failedCount.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">فقط در حافظه React همین صفحه.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های ثبت‌شده دفتر</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{atomicLedgerEntries.length.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از دفتر همکار فعلی مشتق می‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">محدوده تغییر</div>
          <div className="mt-3 text-sm font-black leading-7 text-slate-950 dark:text-slate-50">فقط trace خواندنی</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">موجودی، مشتری، فاکتور، قیمت و ML بدون تغییر می‌مانند.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="overflow-hidden rounded-[24px] border border-indigo-200 bg-white dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="border-b border-indigo-100 px-4 py-3 text-sm font-black text-slate-900 dark:border-indigo-900/40 dark:text-slate-50">تاریخچه تلاش‌های نشست فعلی</div>
          {attempts.length ? (
            <div className="divide-y divide-indigo-50 dark:divide-slate-800">
              {attempts.map((attempt: any) => (
                <div key={asText(attempt.attemptId) || `${attempt.idempotencyKey}-${attempt.requestedAt}`} className="px-4 py-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm font-black text-slate-950 dark:text-slate-50">{statusLabel(attempt.status, attempt.ok)}</div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{attempt.submittedAt || attempt.failedAt || attempt.requestedAt ? formatIsoToShamsiDateTime(attempt.submittedAt || attempt.failedAt || attempt.requestedAt) : '—'}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400 md:grid-cols-2">
                    <span className="break-all"><b className="text-slate-800 dark:text-slate-100">idempotency:</b> {asText(attempt.idempotencyKey) || '—'}</span>
                    <span><b className="text-slate-800 dark:text-slate-100">مبلغ:</b> {formatCurrencyText(asNumber(attempt.confirmedAmount), currencyUnit)}</span>
                    <span><b className="text-slate-800 dark:text-slate-100">نقش:</b> {asText(attempt.requestedByRole) || '—'}</span>
                    <span><b className="text-slate-800 dark:text-slate-100">ردیف‌ها:</b> {asNumber(attempt.confirmedLineCount).toLocaleString('fa-IR')}</span>
                  </div>
                  {attempt.message ? <p className="mt-2 text-xs font-semibold leading-6 text-rose-600 dark:text-rose-300">{attempt.message}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">هنوز تلاشی برای ثبت تسویه در این نشست ثبت نشده است. پس از اقدام مدیر، نتیجه موفق یا ناموفق اینجا نمایش داده می‌شود.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-[24px] border border-indigo-200 bg-white dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="border-b border-indigo-100 px-4 py-3 text-sm font-black text-slate-900 dark:border-indigo-900/40 dark:text-slate-50">تایم‌لاین audit دفتر همکار</div>
          {atomicLedgerEntries.length ? (
            <div className="divide-y divide-indigo-50 dark:divide-slate-800">
              {atomicLedgerEntries.slice(0, 6).map((entry: any) => {
                const meta = parseLedgerMeta(entry) || {};
                const batchId = asText(entry?.settlementBatchId) || asText(meta?.idempotencyKey);
                return (
                  <div key={String(entry.id)} className="px-4 py-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-sm font-black text-slate-950 dark:text-slate-50">#{entry.id} — {entry.description || 'ردیف تسویه'}</div>
                      <Button type="button" onClick={() => focusBatch(batchId)} disabled={!batchId} variant="secondary" size="xs" data-partner-settlement-submit-attempt-history-ledger-focus="true" leftIcon={<i className="fa-solid fa-arrow-down-long" />}>نمایش در دفتر</Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400 md:grid-cols-2">
                      <span><b className="text-slate-800 dark:text-slate-100">مبلغ:</b> {formatCurrencyText(asNumber(entry.debit || entry.credit), currencyUnit)}</span>
                      <span><b className="text-slate-800 dark:text-slate-100">زمان:</b> {entry.transactionDate ? formatIsoToShamsiDateTime(entry.transactionDate) : '—'}</span>
                      <span className="break-all md:col-span-2"><b className="text-slate-800 dark:text-slate-100">batch:</b> {batchId || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">پس از ثبت موفق و تازه‌سازی دفتر، سوابق تسویه در این فهرست زمانی نمایش داده می‌شوند.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PartnerSettlementSubmitAttemptHistorySection;
