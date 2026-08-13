import { IconGlyph } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerOverviewKpiSection: React.FC<Props> = ({ ctx }) => {
  const {
    formatCurrencyText,
    partnerUnifiedStatusTotals,
    profile,
    readStoredCurrencyUnit,
  } = ctx;

  const metrics = [
    {
      label: 'گوشی‌های سپرده‌شده',
      value: Number(profile?.totalPhonesSupplied || 0).toLocaleString('fa-IR'),
      detail: 'کل گوشی‌های ثبت‌شده',
      icon: 'fa-solid fa-mobile-screen-button',
    },
    {
      label: 'موجودی فعال',
      value: Number(profile?.unsoldPhonesCount || 0).toLocaleString('fa-IR'),
      detail: 'گوشی‌های آماده فروش',
      icon: 'fa-solid fa-box-open',
    },
    {
      label: 'فروش‌های تکمیل‌شده',
      value: Number(partnerUnifiedStatusTotals?.closedSaleFiles || 0).toLocaleString('fa-IR'),
      detail: 'پرونده‌های بسته‌شده',
      icon: 'fa-solid fa-bag-shopping',
    },
    {
      label: 'مانده کالاهای جانبی',
      value: formatCurrencyText(Number(profile?.accessoriesPayableAmount || 0), readStoredCurrencyUnit()),
      detail: 'مانده ثبت‌شده در حساب',
      icon: 'fa-solid fa-boxes-stacked',
    },
  ];

  return (
    <section
      className="partner-detail-section-shell mx-3 mt-5 rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/75 sm:mx-6 sm:p-5"
      data-partner-overview="true"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-slate-50">
            <i className="fa-solid fa-chart-simple text-slate-400" />
            خلاصه همکاری
          </div>
          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">نمای سریع از کالا، موجودی و فروش‌های این همکار.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-[20px] border border-slate-200 bg-slate-50/65 p-4 dark:border-slate-800 dark:bg-slate-900/45">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-600 dark:text-slate-300">{metric.label}</div>
                <div className="mt-2 break-words text-base font-black text-slate-950 dark:text-slate-50 sm:text-lg">{metric.value}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{metric.detail}</div>
              </div>
              <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className={metric.icon} /></IconGlyph>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PartnerOverviewKpiSection;
