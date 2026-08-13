import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const toneClass: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

const requirementToneClass: Record<string, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  'needs-review': 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
  blocked: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
};

const requirementIcon: Record<string, string> = {
  ready: 'fa-solid fa-circle-check',
  'needs-review': 'fa-solid fa-user-shield',
  blocked: 'fa-solid fa-circle-xmark',
};

type Props = {
  ctx: Record<string, any>;
};

const PartnerSettlementGuardedSubmitDesignSection: React.FC<Props> = ({ ctx }) => {
  const guardedSubmitDesign = ctx.partnerBusinessReadModel?.guardedSubmitDesign;
  if (!guardedSubmitDesign) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatMoney = (value: number | null | undefined) => (
    value == null ? 'نیازمند تکمیل اطلاعات' : formatCurrencyText(Number(value || 0), currencyUnit)
  );

  return (
    <section className="partner-detail-section-shell partner-settlement-guarded-submit-design mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-guarded-submit-design="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-shield-halved text-slate-400" />
            طرح ثبت محافظت‌شده مدیر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">قفل‌های قبل از ثبت واقعی، بدون فعال‌سازی ثبت</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این بخش فقط نقشه ثبت امن را از روی پیش‌نویس اجرا، ردپای حسابرسی و تایید دستی می‌سازد. ثبت واقعی، تغییر دفتر حساب، تغییر موجودی و تغییر حسابداری از این بخش انجام نمی‌شود.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[guardedSubmitDesign.tone] || toneClass.neutral}`}>
          <i className="fa-solid fa-lock" />
          {guardedSubmitDesign.statusLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ تحت طراحی امن</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatMoney(guardedSubmitDesign.designedAmount)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از همان مبلغ پیش‌نویس اجرا خوانده می‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های تحت کنترل</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{guardedSubmitDesign.designedLineCount.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">ردیف جدید ساخته یا ذخیره نمی‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">وضعیت ثبت</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">غیرفعال / خواندنی</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">هیچ اقدام ثبت از این بخش اجرا نمی‌شود.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">شرط‌های قبل از فعال‌سازی ثبت</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">هر شرط باید پیش از ساخت ثبت واقعی به‌صورت جداگانه کنترل شود.</p>
            </div>
            <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">طرح خواندنی</span>
          </div>
          <div className="mt-4 space-y-2">
            {guardedSubmitDesign.preSubmitRequirements.map((step: any) => (
              <article key={step.label} className={`rounded-2xl border p-3 ${requirementToneClass[step.status] || requirementToneClass['needs-review']}`}>
                <div className="flex items-start gap-3">
                  <i className={`${requirementIcon[step.status] || requirementIcon['needs-review']} mt-1`} />
                  <div className="min-w-0">
                    <div className="text-sm font-black">{step.label}</div>
                    <p className="mt-1 text-xs font-semibold leading-6 opacity-90">{step.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            disabled
            className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 opacity-75 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            data-partner-settlement-guarded-submit-disabled="true"
          >
            <i className="fa-solid fa-ban" />
            ثبت محافظت‌شده هنوز فعال نیست
          </button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">برنامه برگشت عملیات</h4>
            <div className="mt-3 space-y-2">
              {guardedSubmitDesign.rollbackPlan.map((item: string) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-rotate-left ml-1 text-slate-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">رفتار خطا</h4>
            <div className="mt-3 space-y-2">
              {guardedSubmitDesign.errorHandlingPlan.map((item: string) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-triangle-exclamation ml-1 text-slate-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">قفل‌های عدم تغییر داده</h4>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {guardedSubmitDesign.mutationLocks.map((item: string) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <i className="fa-solid fa-lock ml-1 text-slate-400" />
              {item}
            </div>
          ))}
        </div>
        {guardedSubmitDesign.blockingReasons.length ? (
          <div className="mt-3 space-y-2">
            {guardedSubmitDesign.blockingReasons.slice(0, 4).map((reason: string) => (
              <p key={reason} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <i className="fa-solid fa-circle-info ml-1" />
                {reason}
              </p>
            ))}
          </div>
        ) : null}
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {guardedSubmitDesign.summaryNote}
        </p>
      </div>
    </section>
  );
};

export default PartnerSettlementGuardedSubmitDesignSection;
