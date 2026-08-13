import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

type Props = {
  ctx: Record<string, any>;
};

const asText = (value: unknown): string => String(value ?? '').trim();
const asNumber = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const parseMeta = (entry: any): Record<string, any> | null => {
  try {
    return entry?.changeHistoryJson ? JSON.parse(String(entry.changeHistoryJson)) : null;
  } catch {
    return null;
  }
};

const normalizeEntryIds = (ids: unknown): Set<string> => new Set(
  Array.isArray(ids)
    ? ids.map((id) => asText(id)).filter(Boolean)
    : [],
);

const PartnerSettlementSubmitResultReviewSection: React.FC<Props> = ({ ctx }) => {
  const {
    ledger = [],
    lastAtomicSettlementSubmitResult,
    scrollToLedger,
    setActiveLedgerBatchId,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerViewFilter,
  } = ctx;

  if (!lastAtomicSettlementSubmitResult) return null;

  const result = lastAtomicSettlementSubmitResult || {};
  const idempotencyKey = asText(result.idempotencyKey);
  const settlementId = asText(result.settlementId);
  const expectedEntryIds = normalizeEntryIds(result.ledgerEntryIds);
  const tracedEntries = (Array.isArray(ledger) ? ledger : []).filter((entry: any) => {
    const entryId = asText(entry?.id);
    const batchId = asText(entry?.settlementBatchId);
    const meta = parseMeta(entry);
    return (
      (entryId && expectedEntryIds.has(entryId)) ||
      (idempotencyKey && batchId === idempotencyKey) ||
      (settlementId && asText(meta?.settlementId) === settlementId)
    );
  }).sort((a: any, b: any) => asNumber(a?.id) - asNumber(b?.id));

  const tracedDebit = tracedEntries.reduce((sum: number, entry: any) => sum + asNumber(entry?.debit), 0);
  const tracedCredit = tracedEntries.reduce((sum: number, entry: any) => sum + asNumber(entry?.credit), 0);
  const traceComplete = expectedEntryIds.size > 0 && tracedEntries.length >= expectedEntryIds.size;
  const currencyUnit = readStoredCurrencyUnit();
  const mutationScope = result.mutationScope || {};

  const focusLedgerTrace = () => {
    if (typeof setActiveLedgerBatchId === 'function' && idempotencyKey) setActiveLedgerBatchId(idempotencyKey);
    if (typeof setLedgerDisplayMode === 'function') setLedgerDisplayMode('table');
    if (typeof setLedgerRange === 'function') setLedgerRange('all');
    if (typeof setLedgerViewFilter === 'function') setLedgerViewFilter('all');
    if (typeof scrollToLedger === 'function') scrollToLedger();
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-submit-result-review mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-submit-result-review="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-list-check text-slate-400" />
            مرور نتیجه ثبت و ردگیری دفتر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">ردگیری نتیجه ثبت تسویه همکار</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این بخش فقط نتیجه آخرین ارسال مدیر را با ردیف‌های دفتر همکار تطبیق می‌دهد و برای بررسی شفاف بعد از ثبت استفاده می‌شود.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${traceComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'}`} data-partner-settlement-submit-trace-status={traceComplete ? 'matched' : 'pending-ledger-refresh'}>
          <i className="fa-solid fa-link" />
          {traceComplete ? 'ردیف‌های دفتر تطبیق شد' : 'در انتظار تازه‌سازی دفتر'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">وضعیت backend</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{asText(result.status) || '—'}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">پاسخ ساختاریافته مسیر اتمیک.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های ثبت‌شده</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{tracedEntries.length.toLocaleString('fa-IR')} / {expectedEntryIds.size.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">تطبیق با شناسه ردیف یا کلید جلوگیری از تکرار.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">جمع بدهکار دفتر</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatCurrencyText(tracedDebit, currencyUnit)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">فقط از ردیف‌های trace شده محاسبه می‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">محدوده تغییر</div>
          <div className="mt-3 text-sm font-black leading-7 text-slate-950 dark:text-slate-50">دفتر همکار: {mutationScope.partnerLedger === true ? 'فعال' : '—'}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">موجودی، مشتری، فاکتور، قیمت و ML باید غیرفعال باشند.</p>
        </article>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">شناسه‌های قابل پیگیری</h4>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این شناسه‌ها برای یافتن همان دسته در دفتر همکار استفاده می‌شوند.</p>
          </div>
          <button
            type="button"
            onClick={focusLedgerTrace}
            disabled={!idempotencyKey}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            data-partner-settlement-submit-trace-ledger-button="true"
          >
            <i className="fa-solid fa-arrow-down-long" />
            نمایش در دفتر همکار
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="font-black text-slate-900 dark:text-slate-50">شناسه تسویه: </span>
            <span className="break-all">{settlementId || '—'}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="font-black text-slate-900 dark:text-slate-50">کلید جلوگیری از تکرار: </span>
            <span className="break-all">{idempotencyKey || '—'}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="font-black text-slate-900 dark:text-slate-50">زمان ثبت: </span>
            <span>{result.submittedAt ? formatIsoToShamsiDateTime(result.submittedAt) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-800 dark:text-slate-50">ردیف‌های trace شده دفتر</div>
        {tracedEntries.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tracedEntries.map((entry: any) => (
              <div key={String(entry.id)} className="grid grid-cols-1 gap-2 px-4 py-3 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300 md:grid-cols-[80px_1fr_150px_150px]">
                <div className="font-black text-slate-900 dark:text-slate-50">#{entry.id}</div>
                <div>{entry.description || '—'}</div>
                <div>{formatCurrencyText(asNumber(entry.debit || entry.credit), currencyUnit)}</div>
                <div>{entry.transactionDate ? formatIsoToShamsiDateTime(entry.transactionDate) : '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
            نتیجه backend ثبت شده، اما ردیف‌های دفتر هنوز در داده فعلی صفحه دیده نمی‌شوند. با تازه‌سازی Partner Detail یا فیلتر دسته تسویه، trace کامل نمایش داده می‌شود.
          </p>
        )}
      </div>
    </section>
  );
};

export default PartnerSettlementSubmitResultReviewSection;
