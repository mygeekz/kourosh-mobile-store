import React from 'react';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

const asText = (value: unknown): string => String(value ?? '').trim();
const isManagerRole = (roleName: unknown): boolean => {
  const normalized = asText(roleName).toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

const parseLedgerMeta = (entry: any): Record<string, any> | null => {
  try {
    return entry?.changeHistoryJson ? JSON.parse(String(entry.changeHistoryJson)) : null;
  } catch {
    return null;
  }
};

type Props = {
  ctx: Record<string, any>;
};

const PartnerSettlementManagerSignoffPersistenceImplementationSection: React.FC<Props> = ({ ctx }) => {
  const {
    currentUser,
    ledger = [],
    lastAtomicSettlementSubmitResult,
    lastManagerSignoffPersistenceResult,
    lastManagerSignoffPersistenceError,
    handlePartnerManagerSignoffPersistence,
    isPersistingManagerSignoff,
  } = ctx;

  const submitResult = lastAtomicSettlementSubmitResult;
  if (!submitResult?.ok || !['submitted', 'already-submitted'].includes(asText(submitResult.status))) return null;

  const settlementId = asText(submitResult.settlementId);
  const idempotencyKey = asText(submitResult.idempotencyKey);
  const expectedLedgerEntryIds = new Set(
    Array.isArray(submitResult.ledgerEntryIds)
      ? submitResult.ledgerEntryIds.map((item: unknown) => asText(item)).filter(Boolean)
      : [],
  );
  const tracedLedgerRows = Array.isArray(ledger)
    ? ledger.filter((entry: any) => {
        if (expectedLedgerEntryIds.has(asText(entry?.id))) return true;
        const meta = parseLedgerMeta(entry);
        return asText(entry?.settlementBatchId) === idempotencyKey || asText(meta?.settlementId) === settlementId;
      })
    : [];
  const firstMeta = tracedLedgerRows.map(parseLedgerMeta).find(Boolean) || {};
  const settlementFingerprint = asText(submitResult.settlementFingerprint || firstMeta.settlementFingerprint);
  const managerAllowed = isManagerRole(currentUser?.roleName);
  const evidenceReady = Boolean(settlementId && idempotencyKey && settlementFingerprint && tracedLedgerRows.length > 0);
  const canPersist = Boolean(managerAllowed && evidenceReady && typeof handlePartnerManagerSignoffPersistence === 'function' && !isPersistingManagerSignoff);
  const signedStatus = asText(lastManagerSignoffPersistenceResult?.status || 'idle');

  return (
    <section className="partner-detail-section-shell partner-settlement-manager-signoff-persistence-implementation mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-manager-signoff-persistence-implementation="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-file-signature text-slate-400" aria-hidden="true" />
            ذخیره تایید مدیر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">ذخیره کنترل‌شده امضای مدیر در audit log</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این بخش فقط شواهد تایید مدیر را برای تسویه ثبت‌شده ذخیره می‌کند. مسیر ذخیره‌سازی، دفتر همکار، موجودی، فاکتور، مشتری، قیمت و ML را تغییر نمی‌دهد.
          </p>
        </div>
        <div className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200" data-partner-settlement-manager-signoff-status={signedStatus}>
          <i className="fa-solid fa-shield-check" aria-hidden="true" />
          {signedStatus === 'signed' ? 'تایید ذخیره شد' : signedStatus === 'already-signed' ? 'قبلاً ذخیره شده' : managerAllowed ? 'آماده تایید مدیر' : 'فقط مدیر / ادمین'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">شناسه تسویه</div>
          <div className="mt-3 break-all text-xs font-black leading-6 text-slate-950 dark:text-slate-50">{settlementId || '—'}</div>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های trace شده</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{tracedLedgerRows.length.toLocaleString('fa-IR')}</div>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:col-span-2">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">اثر انگشت تسویه</div>
          <div className="mt-3 break-all text-xs font-black leading-6 text-slate-950 dark:text-slate-50">{settlementFingerprint || 'نیازمند trace معتبر دفتر'}</div>
        </article>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">کنترل‌های ذخیره تایید</h4>
          <ul className="mt-3 space-y-2 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
            <li><i className="fa-solid fa-user-shield ml-2 text-emerald-600" />نقش مجاز: {managerAllowed ? 'بله' : 'خیر'}</li>
            <li><i className="fa-solid fa-fingerprint ml-2 text-emerald-600" />شناسه و fingerprint آماده: {evidenceReady ? 'بله' : 'خیر'}</li>
            <li><i className="fa-solid fa-database ml-2 text-emerald-600" />محدوده write: فقط audit_logs</li>
            <li><i className="fa-solid fa-ban ml-2 text-rose-500" />بدون تغییر دفتر، موجودی، فاکتور، مشتری، قیمت و ML</li>
          </ul>
          <button
            type="button"
            onClick={handlePartnerManagerSignoffPersistence}
            disabled={!canPersist}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-65 focus:outline-none focus:ring-0 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200 dark:hover:bg-emerald-950/40 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-400"
            data-partner-settlement-manager-signoff-persistence-button="true"
          >
            <i className={isPersistingManagerSignoff ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-signature'} aria-hidden="true" />
            {isPersistingManagerSignoff ? 'در حال ذخیره تایید...' : 'ذخیره تایید مدیر'}
          </button>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">نتیجه ذخیره</h4>
          {lastManagerSignoffPersistenceResult?.ok ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-4 text-xs font-semibold leading-6 text-emerald-800 dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-200">
              <p>وضعیت: {lastManagerSignoffPersistenceResult.status === 'already-signed' ? 'قبلاً ذخیره شده' : 'ذخیره شد'}</p>
              <p>شناسه audit: {asText(lastManagerSignoffPersistenceResult.signoffId) || '—'}</p>
              <p>زمان: {formatIsoToShamsiDateTime(asText(lastManagerSignoffPersistenceResult.signedAt)) || '—'}</p>
            </div>
          ) : lastManagerSignoffPersistenceError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-4 text-xs font-semibold leading-6 text-rose-800 dark:border-rose-900/50 dark:bg-slate-950 dark:text-rose-200">
              <p>خطا: {asText(lastManagerSignoffPersistenceError.reason) || 'rejected'}</p>
              <p>{asText(lastManagerSignoffPersistenceError.message) || 'ذخیره تایید انجام نشد.'}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">بعد از تایید مدیر، نتیجه ذخیره audit در این قسمت نمایش داده می‌شود.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PartnerSettlementManagerSignoffPersistenceImplementationSection;
