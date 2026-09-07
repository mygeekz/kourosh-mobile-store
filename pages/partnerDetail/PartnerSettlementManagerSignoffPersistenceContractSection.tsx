import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

type Props = {
  ctx: Record<string, any>;
};

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

const PartnerSettlementManagerSignoffPersistenceContractSection: React.FC<Props> = ({ ctx }) => {
  const {
    currentUser,
    ledger = [],
    lastAtomicSettlementSubmitResult,
    partnerBusinessReadModel,
  } = ctx;

  const result = lastAtomicSettlementSubmitResult;
  if (!result?.ok || !['submitted', 'already-submitted'].includes(asText(result.status))) return null;

  const idempotencyKey = asText(result.idempotencyKey);
  const settlementId = asText(result.settlementId);
  const expectedLedgerEntryIds = new Set(
    Array.isArray(result.ledgerEntryIds) ? result.ledgerEntryIds.map((item: unknown) => asText(item)).filter(Boolean) : [],
  );
  const ledgerRows = Array.isArray(ledger) ? ledger : [];
  const tracedLedgerRows = ledgerRows.filter((entry: any) => {
    if (expectedLedgerEntryIds.has(asText(entry?.id))) return true;
    const meta = parseLedgerMeta(entry);
    return asText(entry?.settlementBatchId) === idempotencyKey || asText(meta?.settlementId) === settlementId;
  });
  const firstMeta = tracedLedgerRows.map(parseLedgerMeta).find(Boolean) || {};
  const settlementFingerprint = asText(result.settlementFingerprint || firstMeta.settlementFingerprint);
  const sourceFingerprint = asText(firstMeta.sourceFingerprint);
  const reconciliationHarness = partnerBusinessReadModel?.atomicSubmitDryRunHarness || {};
  const postSubmitOpenAmount = asNumber(reconciliationHarness.dryRunAmount);
  const postSubmitOpenLineCount = Array.isArray(reconciliationHarness.confirmedLineIds)
    ? reconciliationHarness.confirmedLineIds.length
    : 0;
  const mutationScope = result.mutationScope || {};
  const mutationScopeSafe =
    mutationScope.partnerLedger === true &&
    mutationScope.inventory === false &&
    mutationScope.accountingGlobal === false &&
    mutationScope.pricing === false &&
    mutationScope.ml === false;
  const ledgerTraceReady = tracedLedgerRows.length >= expectedLedgerEntryIds.size && expectedLedgerEntryIds.size > 0;
  const dryRunClosed = postSubmitOpenAmount <= 0 && postSubmitOpenLineCount === 0;
  const managerRoleReady = ['Admin', 'Manager', 'مدیر', 'ادمین'].includes(asText(currentUser?.roleName));
  const persistenceReady = ledgerTraceReady && mutationScopeSafe && managerRoleReady && Boolean(settlementFingerprint || sourceFingerprint);
  const contractMutationLocks = [
    'تأیید مدیر فقط پس از تکمیل کنترل‌های تسویه قابل انجام است.',
    'تأیید این بخش نباید موجودی، حسابداری، قیمت‌گذاری یا اطلاعات مشتریان را تغییر دهد.',
    'ثبت تسویه اصلی و سوابق دفتر بدون تغییر باقی می‌ماند.',
    'هیچ تسویه خودکار یا زمان‌بندی‌شده‌ای از این بخش انجام نمی‌شود.',
  ];
  const requiredSignoffEvidence = [
    'شناسه تسویه',
    'کد جلوگیری از ثبت تکراری',
    'کد صحت تسویه',
    'سوابق دفتر همکار',
    'نتیجه تطبیق پس از ثبت',
    'سطح دسترسی مدیر',
    'چک‌لیست تأیید',
  ];
  return (
    <section
      className="partner-detail-section-shell partner-settlement-manager-signoff-persistence-contract mx-6 mt-5 rounded-[30px] border border-slate-200/90 bg-white/80 px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-950/35 sm:px-6"
      data-partner-settlement-manager-signoff-persistence-contract="true"
      data-partner-settlement-manager-signoff-persistence-ready={persistenceReady ? 'true' : 'false'}
      data-partner-settlement-manager-signoff-ledger-trace-ready={ledgerTraceReady ? 'true' : 'false'}
      data-partner-settlement-manager-signoff-schema-migration="false"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <i className="fa-solid fa-file-shield" aria-hidden="true" />
            کنترل تأیید مدیر
          </span>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50">کنترل تأیید مدیر تسویه</h3>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              این بخش شرایط لازم برای تأیید نهایی تسویه توسط مدیر را بررسی می‌کند و وضعیت هر کنترل را به‌صورت شفاف نمایش می‌دهد.
            </p>
          </div>
        </div>
        <div className={`rounded-2xl border px-3 py-2 text-xs font-bold ${persistenceReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
          {persistenceReady ? 'آماده تأیید نهایی' : 'نیازمند تکمیل بررسی‌ها'}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">شناسه تسویه</p>
          <p className="mt-2 break-all text-sm font-black text-slate-900 dark:text-slate-50">{settlementId || '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">ردیف‌های دفتر قابل استناد</p>
          <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">{toFaCount(tracedLedgerRows.length)} از {toFaCount(expectedLedgerEntryIds.size)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">مانده باز بعد از ثبت</p>
          <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(postSubmitOpenAmount, readStoredCurrencyUnit())}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">زمان ثبت در سیستم</p>
          <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">{formatIsoToShamsiDateTime(asText(result.submittedAt)) || '—'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">کنترل‌های ایمنی تسویه</h4>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {contractMutationLocks.map((item) => (
              <li key={item} className="flex gap-2">
                <i className="fa-solid fa-lock mt-1 text-emerald-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">مدارک لازم برای تأیید مدیر</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {requiredSignoffEvidence.map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            پس از تکمیل همه موارد بالا، مدیر می‌تواند نتیجه تسویه را با اطمینان بررسی و تأیید کند.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PartnerSettlementManagerSignoffPersistenceContractSection;
