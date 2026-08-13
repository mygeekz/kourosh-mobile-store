import React, { useState } from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

type Props = {
  ctx: Record<string, any>;
};

type SignoffExportState = 'idle' | 'copied' | 'downloaded' | 'failed';

const asText = (value: unknown): string => String(value ?? '').trim();
const asNumber = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const toFaCount = (value: number): string => Math.max(0, value).toLocaleString('fa-IR');

const parseLedgerMeta = (entry: any): Record<string, any> | null => {
  try {
    return entry?.changeHistoryJson ? JSON.parse(String(entry.changeHistoryJson)) : null;
  } catch {
    return null;
  }
};

const normalizeTextSet = (value: unknown): Set<string> => new Set(
  Array.isArray(value)
    ? value.map((item) => asText(item)).filter(Boolean)
    : [],
);

const normalizeNumberSet = (value: unknown): Set<number> => new Set(
  Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0)
    : [],
);

const buildSafeFileName = (partnerId: string, settlementId: string): string => {
  const safePartnerId = partnerId.replace(/[^a-zA-Z0-9_-]/g, '') || 'partner';
  const safeSettlementId = settlementId.replace(/[^a-zA-Z0-9_-]/g, '') || 'settlement';
  return `partner-settlement-signoff-${safePartnerId}-${safeSettlementId}.json`;
};

const PartnerSettlementReconciliationExportSignoffPackSection: React.FC<Props> = ({ ctx }) => {
  const {
    currentUser,
    ledger = [],
    lastAtomicSettlementSubmitResult,
    partnerBusinessReadModel,
    profile,
    scrollToLedger,
    setActiveLedgerBatchId,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerViewFilter,
  } = ctx;
  const [exportState, setExportState] = useState<SignoffExportState>('idle');

  if (!lastAtomicSettlementSubmitResult) return null;

  const result = lastAtomicSettlementSubmitResult || {};
  const currencyUnit = readStoredCurrencyUnit();
  const partnerId = asText(profile?.id || result.partnerId);
  const partnerName = asText(profile?.name || profile?.fullName || profile?.title);
  const idempotencyKey = asText(result.idempotencyKey);
  const settlementId = asText(result.settlementId);
  const settlementFingerprint = asText(result.settlementFingerprint);
  const expectedLedgerEntryIds = normalizeTextSet(result.ledgerEntryIds);
  const expectedOpenLineIds = normalizeNumberSet(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.confirmedLineIds);
  const postSubmitDryRunAmount = asNumber(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.dryRunAmount);
  const postSubmitOpenLineCount = asNumber(partnerBusinessReadModel?.atomicSubmitDryRunHarness?.dryRunLineCount);
  const generatedAt = new Date().toISOString();

  const atomicLedgerRows = (Array.isArray(ledger) ? ledger : []).filter((entry: any) => {
    const meta = parseLedgerMeta(entry) || {};
    const entryId = asText(entry?.id);
    const batchId = asText(entry?.settlementBatchId) || asText(meta?.idempotencyKey);
    const entrySettlementId = asText(meta?.settlementId);
    const entryFingerprint = asText(meta?.settlementFingerprint);
    return (
      asText(entry?.referenceType) === 'partner_settlement_atomic_submit' ||
      (entryId && expectedLedgerEntryIds.has(entryId)) ||
      (idempotencyKey && batchId === idempotencyKey) ||
      (settlementId && entrySettlementId === settlementId) ||
      (settlementFingerprint && entryFingerprint === settlementFingerprint)
    );
  }).sort((a: any, b: any) => asNumber(a?.id) - asNumber(b?.id));

  const tracedResultRows = atomicLedgerRows.filter((entry: any) => {
    const meta = parseLedgerMeta(entry) || {};
    const entryId = asText(entry?.id);
    const batchId = asText(entry?.settlementBatchId) || asText(meta?.idempotencyKey);
    const entrySettlementId = asText(meta?.settlementId);
    const entryFingerprint = asText(meta?.settlementFingerprint);
    return (
      (entryId && expectedLedgerEntryIds.has(entryId)) ||
      (idempotencyKey && batchId === idempotencyKey) ||
      (settlementId && entrySettlementId === settlementId) ||
      (settlementFingerprint && entryFingerprint === settlementFingerprint)
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
  const signoffReady = expectedLedgerMatched && noOpenDryRunAfterSubmit && settledLinesNotReopened && mutationScopeSafe;
  const tracedDebit = tracedResultRows.reduce((sum: number, entry: any) => sum + asNumber(entry?.debit), 0);
  const tracedCredit = tracedResultRows.reduce((sum: number, entry: any) => sum + asNumber(entry?.credit), 0);
  const packAmount = tracedDebit || tracedCredit;

  const signoffPack = {
    phase: 'Business Phase 1R',
    packType: 'partner-settlement-reconciliation-signoff',
    generatedAt,
    generatedByRole: asText(currentUser?.roleName),
    partner: {
      id: partnerId,
      name: partnerName || null,
    },
    backendResult: {
      status: asText(result.status),
      settlementId,
      idempotencyKey,
      submittedAt: asText(result.submittedAt),
      submittedByRole: asText(result.submittedByRole),
      duplicateLock: asText(result.duplicateLock),
      settlementFingerprint,
      ledgerEntryIds: Array.isArray(result.ledgerEntryIds) ? result.ledgerEntryIds : [],
    },
    reconciliation: {
      signoffReady,
      expectedLedgerMatched,
      noOpenDryRunAfterSubmit,
      settledLinesNotReopened,
      mutationScopeSafe,
      tracedLedgerRows: tracedResultRows.length,
      expectedLedgerRows: expectedLedgerEntryIds.size,
      tracedAmount: packAmount,
      postSubmitDryRunAmount,
      postSubmitOpenLineCount,
      reopenedSettledLineIds,
    },
    mutationScope: {
      partnerLedger: mutationScope.partnerLedger === true,
      inventory: mutationScope.inventory === true,
      accountingGlobal: mutationScope.accountingGlobal === true,
      pricing: mutationScope.pricing === true,
      ml: mutationScope.ml === true,
    },
    ledgerTrace: tracedResultRows.map((entry: any) => ({
      id: asText(entry?.id),
      referenceType: asText(entry?.referenceType),
      referenceId: asText(entry?.referenceId),
      settlementBatchId: asText(entry?.settlementBatchId),
      debit: asNumber(entry?.debit),
      credit: asNumber(entry?.credit),
      transactionDate: asText(entry?.transactionDate || entry?.createdAt),
      description: asText(entry?.description),
    })),
    managerSignoffChecklist: [
      { key: 'ledger-trace-matched', ok: expectedLedgerMatched, label: 'ردیف‌های دفتر با نتیجه backend تطبیق شده‌اند.' },
      { key: 'dry-run-closed', ok: noOpenDryRunAfterSubmit, label: 'dry-run بعد از ثبت مبلغ باز نشان نمی‌دهد.' },
      { key: 'no-reopened-source-lines', ok: settledLinesNotReopened, label: 'ردیف تسویه‌شده دوباره در مانده باز دیده نمی‌شود.' },
      { key: 'mutation-scope-safe', ok: mutationScopeSafe, label: 'محدوده تغییر فقط دفتر همکار و audit موجود است.' },
    ],
  };

  const signoffPackText = JSON.stringify(signoffPack, null, 2);

  const copySignoffPack = async () => {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(signoffPackText);
      setExportState('copied');
    } catch {
      setExportState('failed');
    }
  };

  const downloadSignoffPack = () => {
    try {
      const blob = new Blob([signoffPackText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildSafeFileName(partnerId, settlementId);
      link.click();
      URL.revokeObjectURL(url);
      setExportState('downloaded');
    } catch {
      setExportState('failed');
    }
  };

  const focusSignoffBatch = () => {
    if (typeof setActiveLedgerBatchId === 'function' && idempotencyKey) setActiveLedgerBatchId(idempotencyKey);
    if (typeof setLedgerDisplayMode === 'function') setLedgerDisplayMode('table');
    if (typeof setLedgerRange === 'function') setLedgerRange('all');
    if (typeof setLedgerViewFilter === 'function') setLedgerViewFilter('all');
    if (typeof scrollToLedger === 'function') scrollToLedger();
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-reconciliation-export-signoff mx-6 mt-5 rounded-[30px] border border-indigo-200/80 bg-indigo-50/55 px-5 py-6 shadow-[0_16px_45px_rgba(79,70,229,0.08)] dark:border-indigo-900/50 dark:bg-indigo-950/20 sm:px-6" data-partner-settlement-reconciliation-export-signoff="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm dark:border-indigo-900/50 dark:bg-slate-950 dark:text-indigo-200">
            <i className="fa-solid fa-file-signature text-indigo-500" />
            بسته خروجی آشتی و تایید مدیر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">بسته امضای مدیر برای تسویه همکار</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            این بخش یک بسته خواندنی از نتیجه ثبت، ردگیری دفتر و وضعیت آشتی می‌سازد تا مدیر بتواند همان اطلاعات را برای بررسی نهایی کپی یا به‌صورت فایل JSON ذخیره کند.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${signoffReady ? 'border-indigo-200 bg-white text-indigo-800 dark:border-indigo-900/50 dark:bg-slate-950 dark:text-indigo-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'}`} data-partner-settlement-signoff-readiness={signoffReady ? 'ready' : 'needs-review'}>
          <i className="fa-solid fa-clipboard-check" />
          {signoffReady ? 'آماده امضای مدیر' : 'نیازمند مرور قبل از امضا'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ بسته</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50" data-partner-settlement-signoff-pack-amount={String(packAmount)}>{formatCurrencyText(packAmount, currencyUnit)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از ردیف‌های trace شده دفتر محاسبه شده است.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های trace</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{toFaCount(tracedResultRows.length)} / {toFaCount(expectedLedgerEntryIds.size)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">شناسه backend، batch و fingerprint بررسی می‌شوند.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مانده باز dry-run</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50" data-partner-settlement-signoff-open-amount={String(postSubmitDryRunAmount)}>{formatCurrencyText(postSubmitDryRunAmount, currencyUnit)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">برای signoff امن باید صفر یا بدون ردیف باز باشد.</p>
        </article>
        <article className="rounded-[22px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">خط باز تکراری</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50" data-partner-settlement-signoff-reopened-lines={String(reopenedSettledLineIds.length)}>{toFaCount(reopenedSettledLineIds.length)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">source line تسویه‌شده نباید دوباره باز شود.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[24px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">چک‌لیست امضای مدیر</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این چک‌لیست از وضعیت فعلی آشتی ساخته می‌شود و چیزی را ثبت یا اصلاح نمی‌کند.</p>
            </div>
            <button
              type="button"
              onClick={focusSignoffBatch}
              disabled={!idempotencyKey}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-800 shadow-sm transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200"
              data-partner-settlement-signoff-ledger-focus="true"
            >
              <i className="fa-solid fa-arrow-down-long" />
              نمایش batch در دفتر
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {signoffPack.managerSignoffChecklist.map((item) => (
              <div key={item.key} className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${item.ok ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'}`}>
                <i className={`fa-solid ${item.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'} mt-1`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-indigo-200 bg-white p-4 dark:border-indigo-900/40 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">خروجی قابل بایگانی</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">بسته JSON شامل نتیجه backend، trace دفتر، وضعیت dry-run و mutation scope است.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copySignoffPack}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-800 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200"
                data-partner-settlement-signoff-copy="true"
              >
                <i className="fa-regular fa-copy" />
                کپی بسته
              </button>
              <button
                type="button"
                onClick={downloadSignoffPack}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                data-partner-settlement-signoff-download="true"
              >
                <i className="fa-solid fa-download" />
                دانلود JSON
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400" data-partner-settlement-signoff-export-state={exportState}>
            {exportState === 'copied' && 'بسته برای مرور مدیر کپی شد.'}
            {exportState === 'downloaded' && 'فایل JSON بسته آشتی ساخته شد.'}
            {exportState === 'failed' && 'ساخت خروجی در مرورگر انجام نشد؛ متن JSON را دستی کپی کنید.'}
            {exportState === 'idle' && 'خروجی فقط در مرورگر ساخته می‌شود و هیچ مسیر backend جدیدی ندارد.'}
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-left text-[11px] font-semibold leading-5 text-slate-100 shadow-inner dark:border-slate-800" dir="ltr" data-partner-settlement-signoff-pack-preview="true">{signoffPackText}</pre>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70"><b className="text-slate-900 dark:text-slate-50">settlementId: </b><span className="break-all">{settlementId || '—'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70"><b className="text-slate-900 dark:text-slate-50">idempotency: </b><span className="break-all">{idempotencyKey || '—'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70"><b className="text-slate-900 dark:text-slate-50">زمان ثبت: </b><span>{result.submittedAt ? formatIsoToShamsiDateTime(result.submittedAt) : '—'}</span></div>
      </div>
    </section>
  );
};

export default PartnerSettlementReconciliationExportSignoffPackSection;
