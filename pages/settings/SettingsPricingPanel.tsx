import React from 'react';
import Button from '../../components/Button';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import { RangeField, SelectField, TextField } from '@/components/ui';
import {
  dateToPricingFilterValue,
  parsePricingDecisionDateFilter,
  pricingFilterValueToDate,
} from './settingsHelpers';
import type {
  PricingDecisionActionFilter,
  PricingDecisionDeltaFilter,
  PricingStrategyMode,
  SettingsPricingPanelProps,
} from './settingsPanelTypes';

const sectionSurface =
  'rounded-[24px] border border-slate-200/85 bg-white/95 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950/82';

const fieldLabelClass =
  'mb-1.5 flex items-center gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300';

const formatUpdatedAt = (value: string | null) => {
  if (!value) return 'هنوز همگام نشده';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'زمان نامعتبر';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: string;
  tone?: string;
}> = ({ label, value, hint, icon, tone = 'text-primary bg-primary/10' }) => (
  <article className="settings-pricing-metric min-w-0 rounded-[18px] border border-slate-200/75 bg-slate-50/72 p-3.5 dark:border-slate-800 dark:bg-slate-900/55">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1.5 truncate text-[17px] font-black text-slate-950 dark:text-white">{value}</div>
      </div>
      <span className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-[12px] ${tone}`}>
        <i className={`fa-solid ${icon} text-[12px]`} />
      </span>
    </div>
    <p className="mt-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
  </article>
);

const SettingsPricingPanel: React.FC<SettingsPricingPanelProps> = ({
  pricingLearningStats,
  pricingDataStatus,
  refreshPricingLearningData,
  resetPricingSettings,
  resetPricingLearning,
  pricingStrategyAdvisor,
  pricingSettings,
  pricingStrategyLabels,
  applyAdvisorStrategy,
  updatePricingSettings,
  pricingDecisionSearch,
  setPricingDecisionSearch,
  pricingDecisionActionFilter,
  setPricingDecisionActionFilter,
  pricingDecisionDeltaFilter,
  setPricingDecisionDeltaFilter,
  pricingDecisionDateFrom,
  setPricingDecisionDateFrom,
  pricingDecisionDateTo,
  setPricingDecisionDateTo,
  pricingDecisionLog,
  exportPricingDecisionLogExcel,
  exportPricingDecisionLogPdf,
}) => {
  const acceptedPercent = pricingLearningStats.decisionCount
    ? Math.round((pricingLearningStats.accepted / pricingLearningStats.decisionCount) * 100)
    : 0;
  const fromTime = parsePricingDecisionDateFilter(pricingDecisionDateFrom);
  const toTime = parsePricingDecisionDateFilter(pricingDecisionDateTo, true);
  const hasDateRangeError = Boolean(pricingDecisionDateFrom && pricingDecisionDateTo && fromTime > toTime);
  const hasActiveFilters = Boolean(
    pricingDecisionSearch
    || pricingDecisionActionFilter !== 'all'
    || pricingDecisionDeltaFilter !== 'all'
    || pricingDecisionDateFrom
    || pricingDecisionDateTo,
  );

  const dataTone = pricingDataStatus.state === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
    : pricingDataStatus.state === 'loading'
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'
      : pricingDataStatus.state === 'degraded'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';

  const clearFilters = () => {
    setPricingDecisionSearch('');
    setPricingDecisionActionFilter('all');
    setPricingDecisionDeltaFilter('all');
    setPricingDecisionDateFrom('');
    setPricingDecisionDateTo('');
  };

  return (
    <div
      className="settings-panel-root settings-pricing-panel settings-pricing-redesign-v2 space-y-4"
      data-ui-settings-panel="pricing"
      data-ui-settings-pricing-redesign="v2"
    >
      <section className={`${sectionSurface} overflow-hidden`} data-ui-pricing-real-source="true">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start" data-ui-settings-grid="cards">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-primary/15 bg-primary/10 text-primary">
              <i className="fa-solid fa-tags text-[15px]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-black tracking-[-0.02em] text-slate-950 dark:text-white">
                  هوش قیمت‌گذاری گوشی
                </h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${dataTone}`}>
                  <i className={`fa-solid ${pricingDataStatus.state === 'loading' ? 'fa-spinner fa-spin' : pricingDataStatus.state === 'ready' ? 'fa-database' : pricingDataStatus.state === 'degraded' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`} />
                  {pricingDataStatus.sourceLabel}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                سیاست قیمت‌گذاری، سوابق واقعی فروش گوشی و تصمیم‌های ثبت‌شده کاربر در یک نمای شفاف و صرفاً مشاوره‌ای نمایش داده می‌شوند.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span><i className="fa-solid fa-clock-rotate-left ml-1 text-primary" />آخرین همگام‌سازی: {formatUpdatedAt(pricingDataStatus.updatedAt)}</span>
                <span><i className="fa-solid fa-server ml-1 text-primary" />سرور: {pricingDataStatus.serverCount.toLocaleString('fa-IR')} رکورد</span>
                <span><i className="fa-solid fa-laptop ml-1 text-primary" />حافظه محلی: {pricingDataStatus.localCount.toLocaleString('fa-IR')} تصمیم</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end" data-ui-settings-grid="actions" data-ui-settings-actions="stack">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={refreshPricingLearningData}
              disabled={pricingDataStatus.state === 'loading'}
              leftIcon={<i className="fa-solid fa-rotate" />}
              className="settings-pricing-action"
            >
              بروزرسانی داده
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={resetPricingSettings}
              leftIcon={<i className="fa-solid fa-arrow-rotate-left" />}
              className="settings-pricing-action"
            >
              تنظیمات پیش‌فرض
            </Button>
            <Button
              type="button"
              size="xs"
              variant="danger"
              onClick={resetPricingLearning}
              disabled={pricingDataStatus.localCount === 0}
              leftIcon={<i className="fa-solid fa-trash-can" />}
              className="settings-pricing-action col-span-2"
            >
              پاک‌کردن حافظه محلی
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-200/75 bg-slate-50/55 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/35 sm:px-5">
          <div className={`flex items-start gap-2 rounded-[14px] border px-3 py-2 text-[10px] leading-5 ${dataTone}`}>
            <i className="fa-solid fa-circle-info mt-1 shrink-0" />
            <span>{pricingDataStatus.message} هیچ inference تولیدی یا تغییر خودکار قیمت از این صفحه اجرا نمی‌شود.</span>
          </div>
        </div>
      </section>

      <section className={`${sectionSurface} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-primary">PRICING OVERVIEW</div>
            <h3 className="mt-1 text-[16px] font-black text-slate-950 dark:text-white">وضعیت داده و یادگیری رفتاری</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">آمار زیر فقط از داده‌های قابل مشاهده در همین صفحه محاسبه می‌شود.</p>
          </div>
          <div className="min-w-0 rounded-[16px] border border-primary/15 bg-primary/5 px-3 py-2.5">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-600 dark:text-slate-300">
              <span>بلوغ داده</span>
              <span className="text-primary">{pricingLearningStats.learningPercent.toLocaleString('fa-IR')}٪</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white dark:bg-slate-800">
              <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pricingLearningStats.learningPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4" data-ui-settings-grid="cards">
          <MetricCard label="وضعیت داده" value={pricingLearningStats.status} hint="بر اساس تعداد رکوردهای معتبر" icon="fa-wave-pulse" />
          <MetricCard label="تصمیم و سابقه" value={pricingLearningStats.total.toLocaleString('fa-IR')} hint={`${pricingLearningStats.historicalCount.toLocaleString('fa-IR')} سابقه فروش و ${pricingLearningStats.decisionCount.toLocaleString('fa-IR')} تصمیم واقعی`} icon="fa-database" tone="text-violet-600 bg-violet-500/10" />
          <MetricCard label="مدل‌های پوشش‌داده‌شده" value={pricingLearningStats.modelCount.toLocaleString('fa-IR')} hint="مدل گوشی یکتا در داده‌ها" icon="fa-mobile-screen-button" tone="text-sky-600 bg-sky-500/10" />
          <MetricCard label="پذیرش پیشنهاد ثبت‌شده" value={pricingLearningStats.decisionCount ? `${acceptedPercent.toLocaleString('fa-IR')}٪` : '—'} hint="فقط تصمیم‌های دارای پیشنهاد واقعی" icon="fa-check" tone="text-emerald-600 bg-emerald-500/10" />
        </div>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]" data-ui-settings-grid="cards">
        <section className={`${sectionSurface} p-4 sm:p-5`} data-settings-mode="advanced">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border ${pricingStrategyAdvisor.tone}`}>
                <i className={`fa-solid ${pricingStrategyAdvisor.icon} text-[14px]`} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-black text-slate-950 dark:text-white">مشاور استراتژی قیمت‌گذاری</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">این پیشنهاد از رفتار ثبت‌شده و فروش واقعی محاسبه می‌شود و فقط با تأیید شما اعمال خواهد شد.</p>
              </div>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${pricingStrategyAdvisor.tone}`}>
              اطمینان {pricingStrategyAdvisor.confidence} · {pricingStrategyAdvisor.maturity}
            </span>
          </div>

          <div className="mt-4 rounded-[18px] border border-primary/15 bg-primary/5 p-3.5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[13px] font-black text-slate-950 dark:text-white">{pricingStrategyAdvisor.title}</div>
                <p className="mt-1 text-[11px] leading-6 text-slate-600 dark:text-slate-300">{pricingStrategyAdvisor.reason}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-[12px] border border-white/80 bg-white/85 px-3 py-2 text-[11px] font-black text-primary dark:border-slate-800 dark:bg-slate-950/75">
                  <i className={`fa-solid ${pricingStrategyLabels[pricingStrategyAdvisor.recommended].icon}`} />
                  {pricingStrategyLabels[pricingStrategyAdvisor.recommended].label}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="primary"
                  onClick={applyAdvisorStrategy}
                  disabled={pricingStrategyAdvisor.recommended === pricingSettings.strategy}
                  leftIcon={<i className="fa-solid fa-check" />}
                  className="settings-pricing-action"
                >
                  اعمال
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" data-ui-settings-grid="cards">
            {pricingStrategyAdvisor.cards.map((card) => (
              <div key={card.label} className="rounded-[15px] border border-slate-200/75 bg-slate-50/72 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/55">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400"><i className={`fa-solid ${card.icon} text-primary`} />{card.label}</div>
                <div className="mt-1 truncate text-[12px] font-black text-slate-950 dark:text-white">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3" data-ui-settings-grid="cards">
            {pricingStrategyAdvisor.actions.map((action, index) => (
              <div key={action} className="flex items-start gap-2 rounded-[15px] border border-slate-200/75 bg-white px-3 py-2.5 text-[10px] leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-300">
                <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-[9px] bg-primary/10 text-[9px] font-black text-primary">{(index + 1).toLocaleString('fa-IR')}</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${sectionSurface} p-4 sm:p-5`} data-settings-mode="advanced">
          <div className="flex items-start gap-3">
            <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <i className="fa-solid fa-sliders text-[14px]" />
            </span>
            <div>
              <h3 className="text-[16px] font-black text-slate-950 dark:text-white">سیاست مرکزی قیمت‌گذاری</h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">این مقادیر روی همین دستگاه ذخیره می‌شوند و چارچوب پیشنهادها را تعیین می‌کنند.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className={fieldLabelClass}><i className="fa-solid fa-route text-primary" />استراتژی پیش‌فرض</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-[14px] border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/65" data-ui-settings-grid="actions">
                {(Object.keys(pricingStrategyLabels) as PricingStrategyMode[]).map((strategy) => (
                  <Button
                    key={strategy}
                    type="button"
                    size="xs"
                    variant={pricingSettings.strategy === strategy ? 'primary' : 'ghost'}
                    onClick={() => updatePricingSettings({ strategy })}
                    autoIcon={false}
                    className="settings-pricing-strategy-btn min-w-0 px-2 text-[10px]"
                    aria-pressed={pricingSettings.strategy === strategy}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5"><i className={`fa-solid ${pricingStrategyLabels[strategy].icon}`} /><span className="truncate">{pricingStrategyLabels[strategy].label}</span></span>
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{pricingStrategyLabels[pricingSettings.strategy].hint}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2" data-ui-settings-grid="form">
              <TextField
                type="number"
                min={6}
                max={30}
                value={pricingSettings.targetMarkupPercent}
                onChange={(event) => updatePricingSettings({ targetMarkupPercent: Number(event.target.value) })}
                label={<span className="inline-flex items-center gap-2"><i className="fa-solid fa-bullseye text-primary" />سود هدف (درصد)</span>}
                className="settings-pricing-control h-10 text-[12px] font-black"
              />
              <TextField
                type="number"
                min={7}
                max={90}
                value={pricingSettings.staleDaysThreshold}
                onChange={(event) => updatePricingSettings({ staleDaysThreshold: Number(event.target.value) })}
                label={<span className="inline-flex items-center gap-2"><i className="fa-solid fa-hourglass-half text-primary" />آستانه راکدی (روز)</span>}
                className="settings-pricing-control h-10 text-[12px] font-black"
              />
            </div>

            <div>
              <div className={fieldLabelClass}>
                <i className="fa-solid fa-gauge-high text-primary" />
                ریسک‌پذیری
                <span className="mr-auto rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{pricingSettings.riskTolerance.toLocaleString('fa-IR')} از ۵</span>
              </div>
              <RangeField
                controlOnly
                min={1}
                max={5}
                value={pricingSettings.riskTolerance}
                onChange={(event) => updatePricingSettings({ riskTolerance: Number(event.target.value) })}
                className="settings-pricing-range w-full accent-primary"
                aria-label="سطح ریسک‌پذیری قیمت‌گذاری"
              />
            </div>

            <div>
              <div className={fieldLabelClass}><i className="fa-solid fa-coins text-primary" />رُند کردن قیمت پیشنهادی</div>
              <SelectField
                value={String(pricingSettings.roundStep)}
                onValueChange={(value) => updatePricingSettings({ roundStep: Number(value) })}
                options={[
                  { value: '100000', label: '۱۰۰ هزار تومان' },
                  { value: '250000', label: '۲۵۰ هزار تومان' },
                  { value: '500000', label: '۵۰۰ هزار تومان' },
                  { value: '1000000', label: '۱ میلیون تومان' },
                ]}
                ariaLabel="مقدار رند کردن قیمت پیشنهادی"
                size="sm"
                iconClassName="fa-solid fa-coins"
                wrapperClassName="settings-pricing-control"
              />
            </div>
          </div>
        </section>
      </div>

      <section className={`${sectionSurface} overflow-hidden settings-pricing-log-shell`} data-settings-mode="advanced">
        <header className="flex flex-col gap-3 border-b border-slate-200/75 p-4 dark:border-slate-800 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <i className="fa-solid fa-receipt text-[14px]" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-black text-slate-950 dark:text-white">سوابق قیمت‌گذاری و فروش گوشی</h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">فروش قطعی سرور از تصمیم واقعی کاربر جدا برچسب‌گذاری شده و هیچ رکورد نمایشی به فهرست اضافه نمی‌شود.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-ui-settings-grid="actions" data-ui-settings-actions="stack">
            <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-filter text-primary" />{pricingDecisionLog.length.toLocaleString('fa-IR')} نتیجه
            </span>
            <Button type="button" size="xs" variant="secondary" onClick={exportPricingDecisionLogExcel} disabled={pricingDecisionLog.length === 0} leftIcon={<i className="fa-solid fa-file-excel" />} className="settings-pricing-action">Excel</Button>
            <Button type="button" size="xs" variant="secondary" onClick={exportPricingDecisionLogPdf} disabled={pricingDecisionLog.length === 0} leftIcon={<i className="fa-solid fa-file-pdf" />} className="settings-pricing-action">PDF</Button>
          </div>
        </header>

        <div className="border-b border-slate-200/75 bg-slate-50/48 p-3 dark:border-slate-800 dark:bg-slate-900/30 sm:p-4">
          <div className="settings-pricing-filter-grid grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.35fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_minmax(165px,.85fr)_minmax(165px,.85fr)_auto] xl:items-end" data-ui-settings-grid="form">
            <TextField
              value={pricingDecisionSearch}
              onChange={(event) => setPricingDecisionSearch(event.target.value)}
              placeholder="مدل، وضعیت یا نوع تصمیم..."
              label={<span className="inline-flex items-center gap-2"><i className="fa-solid fa-magnifying-glass text-primary" />جستجو</span>}
              icon={<i className="fa-solid fa-magnifying-glass" />}
              className="settings-pricing-control h-10 text-[12px] font-bold"
            />

            <div>
              <div className={fieldLabelClass}>نوع تصمیم</div>
              <SelectField
                value={pricingDecisionActionFilter}
                onValueChange={(value) => setPricingDecisionActionFilter(value as PricingDecisionActionFilter)}
                options={[
                  { value: 'all', label: 'همه تصمیم‌ها' },
                  { value: 'accepted', label: 'قبول پیشنهاد' },
                  { value: 'overridden', label: 'اصلاح کاربر' },
                  { value: 'manual', label: 'قیمت ثبت‌شده' },
                ]}
                ariaLabel="فیلتر نوع تصمیم قیمت‌گذاری"
                size="sm"
                iconClassName="fa-solid fa-list-check"
                wrapperClassName="settings-pricing-control"
              />
            </div>

            <div>
              <div className={fieldLabelClass}>اختلاف قیمت</div>
              <SelectField
                value={pricingDecisionDeltaFilter}
                onValueChange={(value) => setPricingDecisionDeltaFilter(value as PricingDecisionDeltaFilter)}
                options={[
                  { value: 'all', label: 'همه اختلاف‌ها' },
                  { value: 'higher', label: 'بالاتر از مبنا' },
                  { value: 'lower', label: 'پایین‌تر از مبنا' },
                  { value: 'same', label: 'نزدیک به مبنا' },
                ]}
                ariaLabel="فیلتر اختلاف قیمت نهایی با قیمت مبنا"
                size="sm"
                iconClassName="fa-solid fa-code-compare"
                wrapperClassName="settings-pricing-control"
              />
            </div>

            <div data-ui-pricing-date-range="from">
              <div className={fieldLabelClass}>از تاریخ</div>
              <ShamsiDatePicker
                selectedDate={pricingFilterValueToDate(pricingDecisionDateFrom)}
                onDateChange={(date) => setPricingDecisionDateFrom(dateToPricingFilterValue(date))}
                preview="انتخاب تاریخ شروع"
                className="settings-pricing-date-field"
                size="compact"
              />
            </div>

            <div data-ui-pricing-date-range="to">
              <div className={fieldLabelClass}>تا تاریخ</div>
              <ShamsiDatePicker
                selectedDate={pricingFilterValueToDate(pricingDecisionDateTo)}
                onDateChange={(date) => setPricingDecisionDateTo(dateToPricingFilterValue(date))}
                preview="انتخاب تاریخ پایان"
                className="settings-pricing-date-field"
                size="compact"
              />
            </div>

            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              leftIcon={<i className="fa-solid fa-eraser" />}
              className="settings-pricing-action min-h-[40px]"
            >
              پاک‌سازی
            </Button>
          </div>
          {hasDateRangeError ? (
            <div className="mt-2 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300">
              <i className="fa-solid fa-calendar-xmark ml-1.5" />تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.
            </div>
          ) : null}
        </div>

        {pricingDecisionLog.length === 0 ? (
          <div className="p-4 sm:p-5">
            <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50/65 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <span className="mx-auto inline-grid h-10 w-10 place-items-center rounded-[14px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><i className="fa-solid fa-inbox" /></span>
              <div className="mt-3 text-[13px] font-black text-slate-800 dark:text-white">رکوردی مطابق فیلترها پیدا نشد</div>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">فیلترها را پاک کنید یا وضعیت منبع داده را در بالای صفحه بررسی کنید.</p>
            </div>
          </div>
        ) : (
          <div className="settings-pricing-log-list divide-y divide-slate-200/75 dark:divide-slate-800">
            {pricingDecisionLog.map((item) => (
              <article key={item.id} className="settings-pricing-log-item p-3.5 sm:p-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(0,1.7fr)] xl:items-center" data-ui-settings-grid="cards">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border ${item.meta.tone}`}><i className={`fa-solid ${item.meta.icon} text-[12px]`} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[12px] font-black text-slate-950 dark:text-white">{item.model}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${item.meta.tone}`}>{item.meta.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        <span><i className="fa-solid fa-calendar-day ml-1" />{item.date}</span>
                        <span><i className="fa-solid fa-mobile-screen ml-1" />{item.condition}</span>
                        <span><i className="fa-solid fa-database ml-1" />{item.sourceLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-ui-settings-grid="cards">
                    {[
                      { label: 'قیمت خرید', value: item.purchase, icon: 'fa-cart-shopping' },
                      { label: 'قیمت مبنا', value: item.suggested, icon: 'fa-compass' },
                      { label: 'قیمت نهایی', value: item.finalSale, icon: 'fa-tag' },
                      { label: 'حاشیه سود', value: item.markup, icon: 'fa-percent' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-[13px] border border-slate-200/75 bg-slate-50/72 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/55">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 dark:text-slate-400"><i className={`fa-solid ${metric.icon} text-primary`} />{metric.label}</div>
                        <div className="mt-1 truncate text-[10px] font-black text-slate-950 dark:text-white">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-[9px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-code-compare ml-1 text-primary" />{item.deltaLabel}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPricingPanel;
