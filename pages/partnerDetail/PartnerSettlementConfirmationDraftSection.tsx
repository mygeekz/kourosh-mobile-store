import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const toneClass: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

const stepToneClass: Record<string, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  'needs-review': 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
  'missing-data': 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
};

const stepIcon: Record<string, string> = {
  ready: 'fa-solid fa-circle-check',
  'needs-review': 'fa-solid fa-user-shield',
  'missing-data': 'fa-solid fa-circle-info',
};

type Props = {
  ctx: Record<string, any>;
};

const PartnerSettlementConfirmationDraftSection: React.FC<Props> = ({ ctx }) => {
  const { currentUser, partnerBusinessReadModel, setIsSettlementManualConfirmationModalOpen } = ctx;
  const confirmationDraft = partnerBusinessReadModel?.confirmationDraft;
  const manualConfirmation = partnerBusinessReadModel?.manualConfirmation;
  if (!confirmationDraft) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatMoney = (value: number | null | undefined) => (
    value == null ? 'نیازمند تکمیل اطلاعات' : formatCurrencyText(Number(value || 0), currencyUnit)
  );
  const roleName = String(currentUser?.roleName || '').trim().toLowerCase();
  const managerCanOpenManualConfirmation = Boolean((roleName === 'admin' || roleName === 'manager' || roleName === 'مدیر' || roleName === 'ادمین') && manualConfirmation?.canOpenModal);
  const openManualConfirmationModal = () => {
    if (!managerCanOpenManualConfirmation || typeof setIsSettlementManualConfirmationModalOpen !== 'function') return;
    setIsSettlementManualConfirmationModalOpen(true);
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-confirmation-draft mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-confirmation-draft="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-file-signature text-slate-400" />
            پیش‌نویس تایید تسویه
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">مرور نهایی قبل از اقدام دستی مدیر</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این پیش‌نویس فقط یک خلاصه خواندنی از ردیف‌های قابل تایید است. دکمه ثبت ندارد و هیچ دفتر، موجودی، قیمت‌گذاری یا حسابداری را تغییر نمی‌دهد.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[confirmationDraft.tone] || toneClass.neutral}`}>
          <i className="fa-solid fa-lock" />
          {confirmationDraft.statusLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ پیش‌نویس</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatMoney(confirmationDraft.draftAmount)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از جمع مانده‌های واقعی ردیف‌های کاندید.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">تعداد ردیف تایید</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{confirmationDraft.draftLineCount.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">فقط ردیف‌های دارای مانده محصول‌محور.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">وضعیت ثبت خودکار</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">غیرفعال</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">تایید و ثبت فقط از مسیر دستی موجود انجام می‌شود.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">قفل‌های تایید مدیر</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این موارد قابل ذخیره نیستند و فقط قبل از اقدام دستی باید بررسی شوند.</p>
            </div>
            <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">بدون ثبت</span>
          </div>
          <div className="mt-4 space-y-2">
            {confirmationDraft.confirmationChecks.map((step: any) => (
              <article key={step.label} className={`rounded-2xl border p-3 ${stepToneClass[step.status] || stepToneClass['needs-review']}`}>
                <div className="flex items-start gap-3">
                  <i className={`${stepIcon[step.status] || stepIcon['needs-review']} mt-1`} />
                  <div className="min-w-0">
                    <div className="text-sm font-black">{step.label}</div>
                    <p className="mt-1 text-xs font-semibold leading-6 opacity-90">{step.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-shield-halved ml-1 text-slate-400" />
            {confirmationDraft.summaryNote}
          </div>
          <button
            type="button"
            onClick={openManualConfirmationModal}
            disabled={!managerCanOpenManualConfirmation}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            data-partner-settlement-manual-confirmation-open="true"
          >
            <i className="fa-solid fa-user-shield" />
            باز کردن تایید دستی مدیر
          </button>
          {!managerCanOpenManualConfirmation ? (
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
              تایید دستی فقط برای مدیر/ادمین و در صورت وجود ردیف قابل مرور فعال است.
            </p>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">ردیف‌های پیش‌نویس</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">مقدار هر ردیف از مانده ثبت‌شده خوانده می‌شود و عددی حدس زده نمی‌شود.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {confirmationDraft.draftLines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                پیش‌نویس قابل تایید برای نمایش وجود ندارد.
              </div>
            ) : confirmationDraft.draftLines.map((line: any) => (
              <article key={line.id || line.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">{line.label}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {line.identifier ? <span>شناسه: {line.identifier}</span> : <span>شناسه کالا ناقص</span>}
                      <span>{line.sourceLabel || 'منبع فروش نیازمند بررسی'}</span>
                    </div>
                  </div>
                  <div className="text-left sm:min-w-[160px]">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مبلغ پیشنهادی تایید</div>
                    <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatMoney(line.amount)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">مبنای قیمت: {formatMoney(line.costBasis)}</span>
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">پرداخت ثبت‌شده: {formatMoney(line.paidAmount)}</span>
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">{line.managerReviewRequired ? 'نیازمند بررسی مدیر' : 'آماده مرور نهایی'}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {confirmationDraft.blockingReasons.length ? (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation" />
            موارد مانع تایید نهایی
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {confirmationDraft.blockingReasons.map((reason: string) => (
              <div key={reason} className="rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-6 text-amber-800 dark:bg-slate-950/30 dark:text-amber-200">{reason}</div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PartnerSettlementConfirmationDraftSection;
