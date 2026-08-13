import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type Props = {
  ctx: Record<string, any>;
};

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
  'needs-review': 'fa-solid fa-eye',
  'missing-data': 'fa-solid fa-triangle-exclamation',
};

const PartnerSettlementAuditTrailPreviewSection: React.FC<Props> = ({ ctx }) => {
  const { partnerBusinessReadModel } = ctx;
  const auditTrailPreview = partnerBusinessReadModel?.auditTrailPreview;
  if (!auditTrailPreview) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatMoney = (value: number | null | undefined) => (
    value == null ? 'نیازمند تکمیل اطلاعات' : formatCurrencyText(Number(value || 0), currencyUnit)
  );

  return (
    <section className="partner-detail-section-shell partner-settlement-audit-trail-preview mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-audit-trail-preview="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-route text-slate-400" />
            پیش‌نمایش ردپا و یادداشت دفتر
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">ردیابی خواندنی قبل از اقدام دستی</h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">
            این بخش فقط نشان می‌دهد در صورت اقدام دستی مدیر، چه ردپا، منبع و یادداشتی باید قابل بررسی باشد. هیچ یادداشت، دفتر حساب، موجودی یا حسابداری از این بخش ثبت نمی‌شود.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[auditTrailPreview.tone] || toneClass.neutral}`}>
          <i className="fa-solid fa-lock" />
          {auditTrailPreview.statusLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ قابل ردیابی</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatMoney(auditTrailPreview.previewAmount)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">از همان مبلغ قابل مرور مدیریتی ساخته شده است.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های ردپا</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{auditTrailPreview.previewLineCount.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">ردیف جدیدی ساخته یا ذخیره نمی‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">وضعیت ثبت ردپا</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">غیرفعال</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">ردپای واقعی فقط هنگام ثبت دستی موجود و خارج از این پیش‌نمایش شکل می‌گیرد.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">چک‌لیست ردپا</h4>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این موارد ذخیره نمی‌شوند و فقط کیفیت ردپای قابل انتظار را توضیح می‌دهند.</p>
            <div className="mt-4 space-y-2">
              {auditTrailPreview.checklist.map((step: any) => (
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
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
              <i className="fa-solid fa-note-sticky text-slate-400" />
              یادداشت پیشنهادی دفتر
            </div>
            <p className="mt-3">{auditTrailPreview.expectedLedgerNote}</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{auditTrailPreview.retentionNote}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">ردیف‌های قابل ردیابی</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">هر ردیف از پیش‌نویس تایید ساخته شده و هیچ داده‌ای را ذخیره نمی‌کند.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {auditTrailPreview.trailLines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                ردپای قابل پیش‌نمایش برای نمایش وجود ندارد.
              </div>
            ) : auditTrailPreview.trailLines.map((line: any) => (
              <article key={line.id || line.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">{line.label}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>{line.sourceLabel || 'منبع فروش نیازمند بررسی'}</span>
                      <span>نوع دفتر: تسویه گوشی</span>
                    </div>
                  </div>
                  <div className="text-left sm:min-w-[160px]">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مبلغ قابل ردگیری</div>
                    <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatMoney(line.amount)}</div>
                  </div>
                </div>
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">{line.traceNote}</p>
                {line.missingFields.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {line.missingFields.map((field: string) => (
                      <span key={field} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">{field}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">ردپا آماده مرور دستی</div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>

      {auditTrailPreview.blockingReasons.length ? (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation" />
            موارد نیازمند تکمیل در ردپا
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {auditTrailPreview.blockingReasons.map((reason: string) => (
              <div key={reason} className="rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-6 text-amber-800 dark:bg-slate-950/30 dark:text-amber-200">{reason}</div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PartnerSettlementAuditTrailPreviewSection;
