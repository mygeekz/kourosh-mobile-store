import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type Props = {
  ctx: Record<string, any>;
};

const isManagerRole = (roleName: unknown): boolean => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

const formatAttemptDate = (value: unknown): string => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime())
    ? 'زمان ثبت نشده'
    : date.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
};

const PartnerSettlementWorkspaceSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    atomicSettlementSubmitAttempts,
    currentUser,
    handlePartnerAtomicSettlementSubmit,
    handlePartnerManagerSignoffPersistence,
    isSubmittingAtomicSettlement,
    isPersistingManagerSignoff,
    lastAtomicSettlementSubmitError,
    lastAtomicSettlementSubmitResult,
    lastManagerSignoffPersistenceError,
    lastManagerSignoffPersistenceResult,
    partnerBusinessReadModel,
    profile,
  } = ctx;

  const preview = partnerBusinessReadModel?.atomicSubmitDryRunHarness;
  const readiness = partnerBusinessReadModel?.settlementReadiness;
  if (!preview || !readiness) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const amount = Number(preview.dryRunAmount || 0);
  const lineCount = Number(preview.dryRunLineCount || 0);
  const managerAllowed = isManagerRole(currentUser?.roleName);
  const previewReady = Boolean(
    preview.dryRunId
      && preview.settlementDraftId
      && lineCount > 0
      && amount > 0
      && Array.isArray(preview.confirmedLineIds)
      && preview.confirmedLineIds.length === lineCount,
  );
  const canSubmit = Boolean(
    managerAllowed
      && previewReady
      && typeof handlePartnerAtomicSettlementSubmit === 'function'
      && !isSubmittingAtomicSettlement,
  );
  const attempts = Array.isArray(atomicSettlementSubmitAttempts) ? atomicSettlementSubmitAttempts : [];
  const businessReasons = Array.from(new Set([
    ...(Array.isArray(readiness.reasons) ? readiness.reasons : []),
    ...(Array.isArray(partnerBusinessReadModel?.warnings) ? partnerBusinessReadModel.warnings : []),
  ].map((reason) => String(reason || '').trim()).filter(Boolean))).slice(0, 3);

  const state = lastAtomicSettlementSubmitError
    ? { label: 'نیازمند بررسی مجدد', icon: 'fa-solid fa-triangle-exclamation', classes: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200' }
    : lastAtomicSettlementSubmitResult?.status === 'submitted'
      ? { label: 'تسویه ثبت شد', icon: 'fa-solid fa-circle-check', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' }
      : lastAtomicSettlementSubmitResult?.status === 'already-submitted'
        ? { label: 'قبلاً ثبت شده', icon: 'fa-solid fa-shield-check', classes: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200' }
        : !previewReady
          ? { label: 'نیازمند تکمیل اطلاعات', icon: 'fa-solid fa-circle-info', classes: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200' }
          : !managerAllowed
            ? { label: 'فقط قابل مشاهده', icon: 'fa-solid fa-eye', classes: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200' }
            : { label: 'آماده بررسی مدیر', icon: 'fa-solid fa-user-check', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' };

  const actionLabel = isSubmittingAtomicSettlement
    ? 'در حال ثبت تسویه…'
    : lastAtomicSettlementSubmitError?.recoverable
      ? 'بررسی و تلاش دوباره'
      : 'بررسی و ثبت تسویه';

  const downloadSettlementReceipt = () => {
    if (!lastAtomicSettlementSubmitResult) return;
    const receipt = {
      partner: profile?.fullName || profile?.name || null,
      partnerId: profile?.id || null,
      settlementId: lastAtomicSettlementSubmitResult.settlementId || null,
      status: lastAtomicSettlementSubmitResult.status || null,
      amount,
      lineCount,
      submittedAt: lastAtomicSettlementSubmitResult.submittedAt || null,
      approvedBy: currentUser?.fullName || currentUser?.name || currentUser?.roleName || null,
      ledgerEntryIds: Array.isArray(lastAtomicSettlementSubmitResult.ledgerEntryIds) ? lastAtomicSettlementSubmitResult.ledgerEntryIds : [],
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `partner-settlement-${String(receipt.settlementId || profile?.id || 'receipt')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
      data-partner-settlement-workspace="true"
      aria-labelledby="partner-settlement-title"
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-handshake text-slate-400" />
            تسویه همکار
          </div>
          <h2 id="partner-settlement-title" className="mt-2 text-xl font-black leading-8 text-slate-950 dark:text-slate-50">
            بررسی و ثبت تسویه {profile?.fullName || profile?.name || ''}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            مبلغ، ردیف‌های قابل تسویه و موانع احتمالی را یک‌جا بررسی کن. ثبت نهایی فقط با تایید مدیر انجام می‌شود.
          </p>
        </div>
        <div className={`inline-flex min-h-9 items-center gap-2 self-start rounded-lg border px-3 py-2 text-xs font-black ${state.classes}`}>
          <i className={state.icon} />
          {state.label}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-coins" /> مبلغ تسویه</div>
          <div className="mt-1 break-words text-sm font-black text-slate-950 dark:text-slate-50">{amount > 0 ? formatCurrencyText(amount, currencyUnit) : '—'}</div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-list-check" /> ردیف‌های تسویه</div>
          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{lineCount.toLocaleString('fa-IR')} ردیف</div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-shield-halved" /> وضعیت بررسی</div>
          <div className="mt-1 text-xs font-black leading-5 text-slate-950 dark:text-slate-50">{readiness.label || state.label}</div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-clock-rotate-left" /> آخرین وضعیت</div>
          <div className="mt-1 text-xs font-black leading-5 text-slate-950 dark:text-slate-50">
            {attempts.length ? formatAttemptDate(attempts[0]?.submittedAt || attempts[0]?.failedAt || attempts[0]?.requestedAt) : 'سابقه‌ای ثبت نشده'}
          </div>
        </article>
      </div>

      {lastAtomicSettlementSubmitError ? (
        <div className="mt-2.5 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200 sm:flex-row sm:items-start">
          <i className="fa-solid fa-circle-exclamation mt-1" />
          <div className="min-w-0">
            <div className="text-sm font-black">ثبت تسویه کامل نشد</div>
            <p className="mt-1 text-xs font-semibold leading-6">{lastAtomicSettlementSubmitError.message || 'اطلاعات را بررسی و دوباره تلاش کنید.'}</p>
          </div>
        </div>
      ) : businessReasons.length ? (
        <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation" /> موارد قابل بررسی
          </div>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-6 text-amber-800 dark:text-amber-200">
            {businessReasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <i className="fa-solid fa-circle-check" />
          اطلاعات لازم برای بررسی مدیریتی کامل است.
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
          <i className="fa-solid fa-shield-heart mt-1 text-slate-400" />
          <span>ثبت به‌صورت یکپارچه انجام می‌شود؛ در صورت خطا، هیچ ثبت نیمه‌کاره‌ای در دفتر همکار باقی نمی‌ماند.</span>
        </div>
        <Button
          type="button"
          onClick={handlePartnerAtomicSettlementSubmit}
          disabled={!canSubmit}
          loading={isSubmittingAtomicSettlement}
          loadingText="در حال ثبت تسویه…"
          variant="primary"
          size="md"
          className="w-full lg:w-auto"
          leftIcon={<i className="fa-solid fa-user-check" />}
          data-partner-settlement-primary-action="true"
        >
          {actionLabel}
        </Button>
      </div>

      {(attempts.length > 0 || lastAtomicSettlementSubmitResult) ? (
        <details className="mt-3 rounded-xl border border-slate-200 bg-white open:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/60 dark:open:bg-slate-900/40">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-black text-slate-800 dark:text-slate-100">
            <span className="flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-slate-400" /> سوابق تسویه</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{attempts.length.toLocaleString('fa-IR')}</span>
          </summary>
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="space-y-2">
              {attempts.map((attempt: any, index: number) => (
                <div key={attempt.attemptId || `${attempt.requestedAt}-${index}`} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <span className="font-black text-slate-900 dark:text-slate-50">{attempt.ok ? 'تسویه موفق' : 'تلاش ناموفق'}</span>
                  <span>{formatCurrencyText(Number(attempt.confirmedAmount || 0), currencyUnit)}</span>
                  <span>{formatAttemptDate(attempt.submittedAt || attempt.failedAt || attempt.requestedAt)}</span>
                </div>
              ))}
            </div>
            {lastAtomicSettlementSubmitResult?.settlementId ? (
              <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <div>شناسه آخرین تسویه: <bdi dir="ltr">{lastAtomicSettlementSubmitResult.settlementId}</bdi></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={downloadSettlementReceipt}
                    variant="secondary"
                    size="sm"
                    leftIcon={<i className="fa-solid fa-download" />}
                    data-partner-settlement-receipt-download="true"
                  >
                    دانلود رسید تسویه
                  </Button>
                  {typeof handlePartnerManagerSignoffPersistence === 'function' && !lastManagerSignoffPersistenceResult ? (
                    <Button
                      type="button"
                      onClick={handlePartnerManagerSignoffPersistence}
                      disabled={!managerAllowed || isPersistingManagerSignoff}
                      loading={isPersistingManagerSignoff}
                      loadingText="در حال ثبت تایید…"
                      variant="secondary"
                      size="sm"
                      leftIcon={<i className="fa-solid fa-user-shield" />}
                      data-partner-settlement-manager-signoff-action="true"
                    >
                      {isPersistingManagerSignoff ? 'در حال ثبت تایید…' : 'ثبت تایید مدیر'}
                    </Button>
                  ) : null}
                </div>
                {lastManagerSignoffPersistenceResult ? <p className="mt-2 text-emerald-700 dark:text-emerald-300">تایید مدیر در سوابق ثبت شد.</p> : null}
                {lastManagerSignoffPersistenceError ? <p className="mt-2 text-rose-700 dark:text-rose-300">ثبت تایید مدیر کامل نشد؛ دوباره تلاش کنید.</p> : null}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
};

export default PartnerSettlementWorkspaceSection;
