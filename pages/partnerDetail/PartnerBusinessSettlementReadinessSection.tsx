import { IconGlyph } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const missingText = 'نیازمند تکمیل اطلاعات';

const PartnerBusinessSettlementReadinessSection: React.FC<Props> = ({ ctx }) => {
  const {
    formatCurrencyText,
    formatIsoToShamsi,
    partnerBusinessReadModel,
    readStoredCurrencyUnit,
  } = ctx;

  if (!partnerBusinessReadModel) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatValue = (value: any) => {
    if (!value || value.status === 'missing-data' || value.value == null) return missingText;
    return formatCurrencyText(Number(value.value || 0), currencyUnit);
  };
  const formatCount = (value: any) => {
    if (!value || value.status === 'missing-data' || value.value == null) return missingText;
    return Number(value.value || 0).toLocaleString('fa-IR');
  };
  const readiness = partnerBusinessReadModel.settlementReadiness;
  const toneClass: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  };

  return (
    <section className="partner-detail-section-shell partner-business-readiness mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-business-readiness="true">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-scale-balanced text-slate-400" />
            آمادگی تسویه محصول‌محور
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">بررسی خواندنی سهم، کالا و دفتر همکار</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این بخش فقط از داده‌های ثبت‌شده همکار، کالاها و دفتر حساب استفاده می‌کند و هیچ تسویه، دفتر، موجودی یا حسابداری را تغییر نمی‌دهد.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[readiness.tone] || toneClass.neutral}`}>
          <i className="fa-solid fa-circle-check" />
          {readiness.label}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {partnerBusinessReadModel.kpis.slice(0, 6).map((item: any) => {
          const isCount = item.label.includes('تعداد');
          const isMissing = item.status === 'missing-data' || item.value == null;
          return (
            <article key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">{item.label}</div>
                  <div className={`mt-3 text-lg font-black ${isMissing ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-slate-50'}`}>
                    {isCount ? formatCount(item) : formatValue(item)}
                  </div>
                </div>
                <IconGlyph tone="neutral" className="h-11 w-11 shrink-0" aria-hidden="true"><i className={isMissing ? 'fa-solid fa-circle-info' : 'fa-solid fa-chart-simple'} /></IconGlyph>
              </div>
              {isMissing ? <p className="mt-3 text-xs font-semibold leading-6 text-amber-700 dark:text-amber-300">{item.reason || missingText}</p> : null}
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">خلاصه کالا و سهم</h4>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">بر اساس کالاها و گوشی‌های مرتبط با همکار.</p>
            </div>
            <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {partnerBusinessReadModel.relatedProducts.totalItems.toLocaleString('fa-IR')} کالا
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">گوشی: {partnerBusinessReadModel.relatedProducts.phoneItems.toLocaleString('fa-IR')}</div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">کالا: {partnerBusinessReadModel.relatedProducts.productItems.toLocaleString('fa-IR')}</div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">فروخته‌شده: {partnerBusinessReadModel.relatedProducts.soldPhoneItems.toLocaleString('fa-IR')}</div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">مانده باز: {partnerBusinessReadModel.relatedProducts.openSettlementItems.toLocaleString('fa-IR')}</div>
          </div>
          {readiness.reviewableAmount != null ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              مبلغ قابل بررسی: {formatCurrencyText(Number(readiness.reviewableAmount || 0), currencyUnit)}
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {readiness.reasons.map((reason: string) => (
              <div key={reason} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <i className="fa-solid fa-circle-info mt-1 text-slate-400" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">آخرین حرکت‌های دفتر همکار</h4>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">لینک فقط زمانی نمایش داده می‌شود که منبع واقعاً قابل تشخیص باشد.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {partnerBusinessReadModel.ledgerPreview.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                دفتر حساب همکار هنوز رکوردی برای نمایش ندارد.
              </div>
            ) : partnerBusinessReadModel.ledgerPreview.map((entry: any) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                      <span>{entry.date ? formatIsoToShamsi(entry.date) : 'تاریخ نامشخص'}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-950">{entry.typeLabel}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{entry.description}</p>
                    {entry.sourceLabel ? (
                      <div className="mt-2">
                        {entry.sourceUrl ? (
                          <a href={entry.sourceUrl} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" title="مشاهده منبع ثبت‌شده">
                            <i className="fa-solid fa-link" />
                            {entry.sourceLabel}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                            <i className="fa-solid fa-link-slash" />
                            {entry.sourceLabel}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className={`text-sm font-black ${entry.direction === 'debit' ? 'text-rose-600 dark:text-rose-300' : entry.direction === 'credit' ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {formatCurrencyText(Number(entry.amount || 0), currencyUnit)}
                    </div>
                    {entry.balance != null ? <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">مانده: {formatCurrencyText(Number(entry.balance || 0), currencyUnit)}</div> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {partnerBusinessReadModel.warnings.length ? (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation" />
            هشدارهای تکمیل اطلاعات
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {partnerBusinessReadModel.warnings.map((warning: string) => (
              <div key={warning} className="rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-6 text-amber-800 dark:bg-slate-950/30 dark:text-amber-200">{warning}</div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PartnerBusinessSettlementReadinessSection;
