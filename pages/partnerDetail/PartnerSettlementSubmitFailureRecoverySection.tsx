import React from 'react';

const roleIsManager = (roleName: unknown): boolean => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

const safeText = (value: unknown): string => String(value ?? '').trim();

const reasonLabels: Record<string, string> = {
  unauthorized: 'نیازمند ورود معتبر',
  forbidden: 'نقش کاربر مجاز نیست',
  'missing-confirmation': 'تایید مدیر ناقص است',
  'missing-idempotency-key': 'کلید جلوگیری از تکرار ناقص است',
  'dry-run-not-found': 'dry-run معتبر پیدا نشد',
  'dry-run-stale': 'dry-run نیازمند تازه‌سازی است',
  'blocking-validation-errors': 'خطای اعتبارسنجی مانع ثبت است',
  'idempotency-conflict': 'تعارض کلید جلوگیری از تکرار',
  'missing-settlement-data': 'اطلاعات تسویه ناقص است',
  'transaction-rolled-back': 'تراکنش کامل برگشت خورد',
};

type Props = {
  ctx: Record<string, any>;
};

const PartnerSettlementSubmitFailureRecoverySection: React.FC<Props> = ({ ctx }) => {
  const {
    currentUser,
    handlePartnerAtomicSettlementSubmit,
    isSubmittingAtomicSettlement,
    lastAtomicSettlementSubmitError,
    partnerBusinessReadModel,
  } = ctx;

  if (!lastAtomicSettlementSubmitError) return null;

  const dryRunHarness = partnerBusinessReadModel?.atomicSubmitDryRunHarness;
  const managerAllowed = roleIsManager(currentUser?.roleName);
  const dryRunReady = Boolean(
    dryRunHarness?.dryRunId &&
    dryRunHarness?.settlementDraftId &&
    Number(dryRunHarness?.dryRunLineCount || 0) > 0 &&
    Number(dryRunHarness?.dryRunAmount || 0) > 0 &&
    Array.isArray(dryRunHarness?.confirmedLineIds) &&
    dryRunHarness.confirmedLineIds.length === Number(dryRunHarness?.dryRunLineCount || 0),
  );
  const reason = safeText(lastAtomicSettlementSubmitError.reason) || 'transaction-rolled-back';
  const recoverable = lastAtomicSettlementSubmitError.recoverable === true;
  const canRetry = Boolean(
    recoverable &&
    managerAllowed &&
    dryRunReady &&
    typeof handlePartnerAtomicSettlementSubmit === 'function' &&
    !isSubmittingAtomicSettlement,
  );

  return (
    <section className="partner-detail-section-shell partner-settlement-submit-failure-recovery mx-6 mt-5 rounded-[30px] border border-amber-200/80 bg-amber-50/70 px-5 py-6 shadow-[0_16px_45px_rgba(146,64,14,0.08)] dark:border-amber-900/50 dark:bg-amber-950/20 sm:px-6" data-partner-settlement-submit-failure-recovery="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-700 shadow-sm dark:border-amber-900/50 dark:bg-slate-950 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation text-amber-500" />
            بازیابی خطای ثبت تسویه
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">بررسی خطا و تلاش دوباره امن</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            این بخش بعد از خطای مسیر اتمیک نمایش داده می‌شود. تلاش دوباره فقط با همان مسیر تایید مدیر انجام می‌شود و هیچ ارسال خودکاری فعال نیست.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${recoverable ? 'border-amber-200 bg-white text-amber-800 dark:border-amber-900/50 dark:bg-slate-950 dark:text-amber-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200'}`} data-partner-settlement-submit-failure-recoverable={recoverable ? 'true' : 'false'}>
          <i className={recoverable ? 'fa-solid fa-rotate-right' : 'fa-solid fa-ban'} />
          {recoverable ? 'قابل تلاش دوباره با تایید مدیر' : 'نیازمند بازبینی قبل از ارسال'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-[22px] border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">علت رد</div>
          <div className="mt-3 text-sm font-black leading-7 text-slate-950 dark:text-slate-50">{reasonLabels[reason] || reason}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">کد backend: {reason}</p>
        </article>
        <article className="rounded-[22px] border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-950/70">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">dry-run فعلی</div>
          <div className="mt-3 text-sm font-black leading-7 text-slate-950 dark:text-slate-50">{dryRunReady ? 'آماده بررسی مجدد' : 'نیازمند تازه‌سازی'}</div>
          <p className="mt-2 break-all text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{safeText(lastAtomicSettlementSubmitError.dryRunId) || '—'}</p>
        </article>
        <article className="rounded-[22px] border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-950/70 md:col-span-2">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">کلید جلوگیری از تکرار</div>
          <div className="mt-3 break-all text-xs font-black leading-6 text-slate-950 dark:text-slate-50">{safeText(lastAtomicSettlementSubmitError.idempotencyKey) || '—'}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">همین کلید باعث می‌شود تلاش دوباره، ردیف دفتر تکراری نسازد.</p>
        </article>
      </div>

      <div className="mt-5 rounded-[24px] border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">پیام خطا</h4>
            <p className="mt-1 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{safeText(lastAtomicSettlementSubmitError.message) || 'ثبت اتمیک تسویه انجام نشد.'}</p>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">تلاش دوباره، دوباره دیالوگ تایید مدیر را باز می‌کند و بدون تایید صریح ارسال نمی‌شود.</p>
          </div>
          <button
            type="button"
            onClick={handlePartnerAtomicSettlementSubmit}
            disabled={!canRetry}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-2.5 text-xs font-black text-amber-900 shadow-sm transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-65 focus:outline-none focus:ring-0 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-400"
            data-partner-settlement-submit-retry-button="true"
          >
            <i className={isSubmittingAtomicSettlement ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-rotate-right'} />
            {isSubmittingAtomicSettlement ? 'در حال بررسی دوباره...' : 'تلاش دوباره با تایید مدیر'}
          </button>
        </div>
        {!canRetry ? (
          <p className="mt-3 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400" data-partner-settlement-submit-retry-blocker="true">
            برای تلاش دوباره باید نقش مدیر/ادمین، dry-run کامل، خطای قابل بازیابی و تایید صریح مدیر هم‌زمان برقرار باشد.
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default PartnerSettlementSubmitFailureRecoverySection;
