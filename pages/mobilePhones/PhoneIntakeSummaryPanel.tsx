import React from 'react';
import PhoneComparablePriceEstimateCard from './PhoneComparablePriceEstimateCard';
import FinancialProgressBar from '../../components/FinancialProgressBar';

type Props = {
  ctx: Record<string, any>;
};

const PhoneIntakeSummaryPanel: React.FC<Props> = ({ ctx }) => {
  const {
    approveSupplierFeed,
    applyPhonePurchaseEstimate,
    applyPhoneSaleEstimate,
    canRecordMarketSnapshot,
    createSupplierFeed,
    duplicateImeiPhone,
    formatPrice,
    intakeReadinessTone,
    intakeSummary,
    isPhonePriceEstimateLoading,
    newPhone,
    partners,
    phoneComparablePriceEstimateEnabled,
    phonePriceEstimate,
    phonePriceEstimateError,
    phoneSmartWarningsEnabled,
    recordMarketSnapshot,
  } = ctx;

  const supplierName = partners.find((partner: any) => String(partner.id) === String(newPhone.supplierId || ''))?.partnerName;

  return (
    <aside className="order-2 space-y-3 xl:order-2 xl:sticky xl:top-6 xl:h-fit xl:max-w-[21.5rem]">
      <section
        className="ux-panel-card overflow-hidden p-4"
        aria-label="خلاصه و مشاور قیمت"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50">خلاصه و مشاور قیمت</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">وضعیت فرم، پیشنهاد هوشمند و آمادگی ثبت در یک نمای واحد</p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-700 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            <i className="fa-solid fa-chart-simple text-[color:var(--brand)]" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-sack-dollar" /> بهای خرید فرم</div>
            <div className="mt-1.5 text-[13px] font-black text-slate-900 dark:text-slate-50">{formatPrice(intakeSummary.purchaseValue)}</div>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-tags" /> قیمت فروش فرم</div>
            <div className="mt-1.5 text-[13px] font-black text-slate-900 dark:text-slate-50">{formatPrice(intakeSummary.saleValue)}</div>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-chart-line" /> سود تقریبی</div>
            <div className={`mt-1.5 text-[13px] font-black ${intakeSummary.margin >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{formatPrice(intakeSummary.margin)}</div>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-percent" /> حاشیه سود</div>
            <div className="mt-1.5 text-[13px] font-black text-slate-900 dark:text-slate-50">{intakeSummary.marginPercent === null ? 'نامشخص' : `${Number(intakeSummary.marginPercent.toFixed(1)).toLocaleString('fa-IR')}٪`}</div>
          </div>
        </div>

        <PhoneComparablePriceEstimateCard
          variant="embedded"
          showMarketEvidence={false}
          enabled={phoneComparablePriceEstimateEnabled}
          hasModel={String(newPhone.model || '').trim().length >= 2}
          estimate={phonePriceEstimate}
          loading={isPhonePriceEstimateLoading}
          error={phonePriceEstimateError}
          formatPrice={formatPrice}
          onApplyPurchase={applyPhonePurchaseEstimate}
          onApplySale={applyPhoneSaleEstimate}
          canRecordMarketSnapshot={canRecordMarketSnapshot}
          onRecordMarketSnapshot={recordMarketSnapshot}
          onCreateSupplierFeed={createSupplierFeed}
          onApproveSupplierFeed={approveSupplierFeed}
        />

        <div className="mt-4 rounded-[20px] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">آمادگی ثبت</div>
            <div className={`text-xs font-black ${intakeReadinessTone}`}>{duplicateImeiPhone ? 'نیازمند بررسی' : intakeSummary.dataQuality >= 85 ? 'آماده ثبت' : 'در حال تکمیل'}</div>
          </div>
          <FinancialProgressBar value={intakeSummary.dataQuality} tone="brand" size="xs" showPercent={false} className="mt-3" ariaLabel="کیفیت اطلاعات ورودی" />
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">کیفیت اطلاعات ورودی: {intakeSummary.dataQuality.toLocaleString('fa-IR')}٪</div>
        </div>

        {phoneSmartWarningsEnabled ? (
          <div className="mt-4 space-y-2.5">
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">هشدارهای ثبت</div>
            {intakeSummary.warnings.length === 0 ? (
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">همه‌چیز برای ثبت اطلاعات آماده است.</div>
            ) : intakeSummary.warnings.slice(0, 4).map((warning: string, index: number) => (
              <div key={`${warning}-${index}`} className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">{warning}</div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-battery-half" /> باتری</div>
            <div className="mt-2 font-black text-slate-900 dark:text-slate-50">{String(newPhone.batteryHealth || '').trim() ? `${newPhone.batteryHealth}٪` : 'ثبت نشده'}</div>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-truck" /> تأمین‌کننده</div>
            <div className="mt-2 truncate font-black text-slate-900 dark:text-slate-50" title={supplierName || 'ثبت نشده'}>{supplierName || 'ثبت نشده'}</div>
          </div>
        </div>
      </section>
    </aside>
  );
};

export default PhoneIntakeSummaryPanel;
