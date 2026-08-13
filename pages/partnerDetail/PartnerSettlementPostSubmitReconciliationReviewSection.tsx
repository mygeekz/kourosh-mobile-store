import React from 'react';
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

const normalizeIdSet = (value: unknown): Set<string> => new Set(
  Array.isArray(value)
    ? value.map((item) => asText(item)).filter(Boolean)
    : [],
);

const normalizeNumberSet = (value: unknown): Set<number> => new Set(
  Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0)
    : [],
);

const toFaCount = (value: number): string => Math.max(0, value).toLocaleString('fa-IR');

const PartnerSettlementPostSubmitReconciliationReviewSection: React.FC<Props> = ({ ctx }) => {
  const {
    ledger = [],
    lastAtomicSettlementSubmitResult,
    partnerBusinessReadModel,
    scrollToLedger,
    setActiveLedgerBatchId,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerViewFilter,
  } = ctx;

  if (!lastAtomicSettlementSubmitResult) return null;

  const result = lastAtomicSettlementSubmitResult || {};
  const currencyUnit = readStoredCurrencyUnit();
  const idempotencyKey = asText(result.idempotencyKey);
  const settlementId = asText(result.settlementId);
  const expectedLedgerEntryIds = normalizeIdSet(result.ledgerEntryIds);
  const expectedOpenLineIds = normalizeNumberSet(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.confirmedLineIds);
  const postSubmitDryRunAmount = asNumber(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.dryRunAmount);
  const postSubmitOpenLineCount = asNumber(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.dryRunLineCount);

  const atomicLedgerRows = (Array.isArray(ledger) ? ledger : []).filter((entry: any) => {
    const meta = parseLedgerMeta(entry) || {};
    const entryId = asText(entry?.id);
    const batchId = asText(entry?.settlementBatchId) || asText(meta?.idempotencyKey);
    const entrySettlementId = asText(meta?.settlementId);
    return (
      asText(entry?.referenceType) === 'partner_settlement_atomic_submit' ||
      (entryId && expectedLedgerEntryIds.has(entryId)) ||
      (idempotencyKey && batchId === idempotencyKey) ||
      (settlementId && entrySettlementId === settlementId)
    );
  }).sort((a: any, b: any) => asNumber(a?.id) - asNumber(b?.id));

  const tracedResultRows = atomicLedgerRows.filter((entry: any) => {
    const meta = parseLedgerMeta(entry) || {};
    const entryId = asText(entry?.id);
    const batchId = asText(entry?.settlementBatchId) || asText(meta?.idempotencyKey);
    return (
      (entryId && expectedLedgerEntryIds.has(entryId)) ||
      (idempotencyKey && batchId === idempotencyKey) ||
      (settlementId && asText(meta?.settlementId) === settlementId)
    );
  });

  const settledLineIds = new Set<number>();
  for (const entry of atomicLedgerRows) {
    const meta = parseLedgerMeta(entry) || {};
    const sourceLineIds = Array.isArray(meta?.sourceLineIds)
      ? meta.sourceLineIds
      : [entry?.referenceId, meta?.lineId];
    for (const lineId of sourceLineIds) {
      const numericLineId = Number(lineId);
      if (Number.isFinite(numericLineId) && numericLineId > 0) settledLineIds.add(numericLineId);
    }
  }

  const reopenedSettledLineIds = Array.from(expectedOpenLineIds).filter((lineId) => settledLineIds.has(lineId));
  const expectedLedgerMatched = expectedLedgerEntryIds.size === 0 || tracedResultRows.length >= expectedLedgerEntryIds.size;
  const noOpenDryRunAfterSubmit = postSubmitDryRunAmount <= 0 && postSubmitOpenLineCount <= 0;
  const settledLinesNotReopened = reopenedSettledLineIds.length === 0;
  const mutationScope = result.mutationScope || {};
  const mutationScopeSafe = mutationScope.partnerLedger === true &&
    mutationScope.inventory === false &&
    mutationScope.accountingGlobal === false &&
    mutationScope.pricing === false &&
    mutationScope.ml === false;
  const reconciliationStatus = expectedLedgerMatched && noOpenDryRunAfterSubmit && settledLinesNotReopened && mutationScopeSafe
    ? 'reconciled'
    : 'needs-review';
  const tracedDebit = tracedResultRows.reduce((sum: number, entry: any) => sum + asNumber(entry?.debit), 0);
  const tracedCredit = tracedResultRows.reduce((sum: number, entry: any) => sum + asNumber(entry?.credit), 0);
  const latestLedgerDate = tracedResultRows
    .map((entry: any) => asText(entry?.transactionDate || entry?.createdAt))
    .filter(Boolean)
    .sort()
    .pop();

  const focusReconciledBatch = () => {
    if (typeof setActiveLedgerBatchId === 'function' && idempotencyKey) setActiveLedgerBatchId(idempotencyKey);
    if (typeof setLedgerDisplayMode === 'function') setLedgerDisplayMode('table');
    if (typeof setLedgerRange === 'function') setLedgerRange('all');
    if (typeof setLedgerViewFilter === 'function') setLedgerViewFilter('all');
    if (typeof scrollToLedger === 'function') scrollToLedger();
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-post-submit-reconciliation mx-6 mt-5 rounded-[30px] border border-emerald-200/80 bg-emerald-50/55 px-5 py-6 shadow-[0_16px_45px_rgba(16,185,129,0.08)] dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:px-6" data-partner-settlement-post-submit-reconciliation="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-200">
            <i className="fa-solid fa-scale-balanced text-emerald-500" />
            مرور آشتی پس از ثبت تسویه
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">تطبیق پس از ثبت اتمیک همکار</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            این بخش نتیجه آخرین submit مدیر را با دفتر همکار و dry-run فعلی تطبیق می‌دهد تا مطمئن شویم همان ردیف‌های تسویه دوباره به‌عنوان مانده باز دیده نمی‌شوند.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${reconciliationStatus === 'reconciled' ? 'border-emerald-200 bg-white text-emerald-800 dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'}`} data-partner-settlement-post-submit-reconciliation-status={reconciliationStatus}>
          <i className="fa-solid fa-shield-check" />
          {reconciliationStatus === 'reconciled' ? 'آشتی پس از ثبت تایید شد' : 'نیازمند مرور مدیر'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های دفتر</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{toFaCount(tracedResultRows.length)} / {toFaCount(expectedLedgerEntryIds.size)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">تطبیق با شناسه ردیف، batch یا settlement id.</p>
        </article>
        <article className="rounded-[22px] border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ trace شده</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatCurrencyText(tracedDebit || tracedCredit, currencyUnit)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از ردیف‌های اتمیک همین نتیجه محاسبه می‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مانده dry-run فعلی</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50" data-partner-settlement-post-submit-open-amount={String(postSubmitDryRunAmount)}>{formatCurrencyText(postSubmitDryRunAmount, currencyUnit)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">بعد از submit موفق باید صفر یا فاقد ردیف باز باشد.</p>
        </article>
        <article className="rounded-[22px] border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">خط تکراری باز</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50" data-partner-settlement-post-submit-reopened-lines={String(reopenedSettledLineIds.length)}>{toFaCount(reopenedSettledLineIds.length)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">ردیف تسویه‌شده نباید دوباره در dry-run باز شود.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[24px] border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">چک‌لیست آشتی مالی</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این چک‌ها فقط خواندنی هستند و هیچ ارسال یا اصلاح خودکار انجام نمی‌دهند.</p>
            </div>
            <button
              type="button"
              onClick={focusReconciledBatch}
              disabled={!idempotencyKey}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              data-partner-settlement-post-submit-ledger-focus="true"
            >
              <i className="fa-solid fa-arrow-down-long" />
              نمایش batch در دفتر
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: 'ردیف‌های برگشتی backend در دفتر پیدا شدند.', ok: expectedLedgerMatched },
              { label: 'dry-run فعلی همان مبلغ را باز نشان نمی‌دهد.', ok: noOpenDryRunAfterSubmit },
              { label: 'source line تسویه‌شده دوباره در ردیف‌های باز دیده نمی‌شود.', ok: settledLinesNotReopened },
              { label: 'محدوده تغییر فقط دفتر همکار و audit موجود است.', ok: mutationScopeSafe },
            ].map((item) => (
              <div key={item.label} className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${item.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'}`}>
                <i className={`fa-solid ${item.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'} mt-1`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-emerald-200 bg-white dark:border-emerald-900/40 dark:bg-slate-950/70">
          <div className="border-b border-emerald-100 px-4 py-3 text-sm font-black text-slate-900 dark:border-emerald-900/40 dark:text-slate-50">شناسه‌های آشتی و ردگیری</div>
          <div className="grid grid-cols-1 gap-3 p-4 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"><b className="text-slate-900 dark:text-slate-50">settlementId:</b> <span className="break-all">{settlementId || '—'}</span></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"><b className="text-slate-900 dark:text-slate-50">idempotency:</b> <span className="break-all">{idempotencyKey || '—'}</span></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"><b className="text-slate-900 dark:text-slate-50">duplicate lock:</b> <span>{asText(result.duplicateLock) || '—'}</span></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"><b className="text-slate-900 dark:text-slate-50">آخرین ردیف:</b> <span>{latestLedgerDate ? formatIsoToShamsiDateTime(latestLedgerDate) : '—'}</span></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70 md:col-span-2"><b className="text-slate-900 dark:text-slate-50">fingerprint:</b> <span className="break-all">{asText(result.settlementFingerprint) || '—'}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSettlementPostSubmitReconciliationReviewSection;
