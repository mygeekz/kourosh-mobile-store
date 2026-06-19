import React from 'react';
import type {
  PricingDecisionActionFilter,
  PricingDecisionDeltaFilter,
  PricingStrategyMode,
  SettingsPricingPanelProps,
} from './settingsPanelTypes';
import Button from '../../components/Button';


const SettingsPricingPanel: React.FC<SettingsPricingPanelProps> = ({
  pricingLearningStats,
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
  normalizePricingDateInput,
  formatPricingDatePreview,
}) => (
<div className="settings-panel-root settings-pricing-panel space-y-6" data-ui-settings-panel="pricing">
  <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/85">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><i className="fa-solid fa-tags text-lg" /></span>
        <div>
          <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">هوش قیمت‌گذاری گوشی</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">سیاست قیمت‌گذاری از این بخش مدیریت می‌شود و سیستم از الگوی ثبت قیمت‌ها برای پیشنهاد بهتر در فرم ثبت گوشی استفاده می‌کند.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="xs" variant="secondary" onClick={resetPricingSettings} leftIcon={<i className="fa-solid fa-rotate-left" />}>ریست تنظیمات</Button>
        <Button type="button" size="xs" variant="danger" onClick={resetPricingLearning} disabled={pricingLearningStats.total === 0} leftIcon={<i className="fa-solid fa-brain" />}>ریست یادگیری سیستم</Button>
      </div>
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-4">
      {[
        { label: 'وضعیت یادگیری', value: pricingLearningStats.status, icon: 'fa-wave-pulse' },
        { label: 'تصمیم‌های ثبت‌شده', value: pricingLearningStats.total.toLocaleString('fa-IR'), icon: 'fa-database' },
        { label: 'مدل‌های یادگرفته‌شده', value: pricingLearningStats.modelCount.toLocaleString('fa-IR'), icon: 'fa-mobile-screen-button' },
        { label: 'قبول پیشنهاد', value: pricingLearningStats.total ? `${Math.round((pricingLearningStats.accepted / pricingLearningStats.total) * 100).toLocaleString('fa-IR')}٪` : '—', icon: 'fa-check-circle' },
      ].map((item) => (
        <div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</span><i className={`fa-solid ${item.icon} text-primary`} /></div>
          <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">{item.value}</div>
        </div>
      ))}
    </div>
    <div className="mt-5 rounded-[20px] border border-primary/15 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-900 dark:text-white">پیشرفت یادگیری سیستم</div><div className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">بعد از چند تصمیم قیمت‌گذاری، پیشنهادها از حالت عمومی به حالت شخصی‌سازی‌شده نزدیک می‌شوند.</div></div><span className="text-sm font-black text-primary">{pricingLearningStats.learningPercent.toLocaleString('fa-IR')}٪</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pricingLearningStats.learningPercent}%` }} /></div>
    </div>
  </section>

  <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/85" data-settings-mode="advanced">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${pricingStrategyAdvisor.tone}`}><i className={`fa-solid ${pricingStrategyAdvisor.icon} text-lg`} /></span>
        <div>
          <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">مشاور هوشمند استراتژی قیمت‌گذاری</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">این بخش رفتار قیمت‌گذاری ثبت‌شده را تحلیل می‌کند و وضعیت مناسب فروش سریع، متعادل یا سودمحور را نشان می‌دهد.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${pricingStrategyAdvisor.tone}`}><i className="fa-solid fa-brain" /> بلوغ: {pricingStrategyAdvisor.maturity}</span>
        <Button type="button" size="xs" variant="primary" onClick={applyAdvisorStrategy} disabled={pricingStrategyAdvisor.recommended === pricingSettings.strategy} leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>اعمال استراتژی پیشنهادی</Button>
      </div>
    </div>
    <div className="mt-5 rounded-[24px] border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-black text-slate-900 dark:text-white">{pricingStrategyAdvisor.title}</div>
          <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{pricingStrategyAdvisor.reason}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-black text-primary shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <i className={`fa-solid ${pricingStrategyLabels[pricingStrategyAdvisor.recommended].icon}`} />
          {pricingStrategyLabels[pricingStrategyAdvisor.recommended].label}
        </div>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {pricingStrategyAdvisor.cards.map((card) => (
        <div key={card.label} className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{card.label}</span><i className={`fa-solid ${card.icon} text-primary`} /></div>
          <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">{card.value}</div>
        </div>
      ))}
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      {pricingStrategyAdvisor.actions.map((action, index) => (
        <div key={action} className="flex items-start gap-3 rounded-[20px] border border-slate-200/80 bg-white/80 p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">{(index + 1).toLocaleString('fa-IR')}</span>
          <span>{action}</span>
        </div>
      ))}
    </div>
  </section>
  <section className="settings-pricing-log-shell overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/85" data-settings-mode="advanced">
    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><i className="fa-solid fa-clipboard-list text-lg" /></span>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">لاگ تصمیمات هوش قیمت‌گذاری</h3>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">اینجا مشخص می‌شود سیستم دقیقاً از کدام تصمیم‌ها یاد گرفته؛ پیشنهاد قبول شده، قیمت دستی یا اصلاح قیمت توسط کاربر.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"><i className="fa-solid fa-brain" /> {pricingLearningStats.total.toLocaleString('fa-IR')} تصمیم یادگیری</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"><i className="fa-solid fa-filter" /> {pricingDecisionLog.length.toLocaleString('fa-IR')} نتیجه</span>
        <Button type="button" size="xs" variant="secondary" onClick={exportPricingDecisionLogExcel} disabled={pricingDecisionLog.length === 0} leftIcon={<i className="fa-solid fa-file-excel" />}>Excel</Button>
        <Button type="button" size="xs" variant="secondary" onClick={exportPricingDecisionLogPdf} disabled={pricingDecisionLog.length === 0} leftIcon={<i className="fa-solid fa-file-pdf" />}>PDF</Button>
      </div>
    </div>
    <div className="settings-log-filter-bar border-b border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/25">
      <div className="settings-log-filter-grid grid gap-3 lg:grid-cols-[minmax(260px,1.7fr)_minmax(190px,1fr)_minmax(190px,1fr)_minmax(170px,.85fr)_minmax(170px,.85fr)_auto]" >
        <label className="relative block">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={pricingDecisionSearch}
            onChange={(e) => setPricingDecisionSearch(e.target.value)}
            placeholder="جستجو در مدل، وضعیت یا نوع تصمیم..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-bold outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <label className="relative block">
          <i className="fa-solid fa-list-check pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" />
          <select value={pricingDecisionActionFilter} onChange={(e) => setPricingDecisionActionFilter(e.target.value as PricingDecisionActionFilter)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-black outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="all">همه تصمیم‌ها</option>
            <option value="accepted">قبول پیشنهاد</option>
            <option value="overridden">اصلاح توسط کاربر</option>
            <option value="manual">قیمت دستی</option>
          </select>
        </label>
        <label className="relative block">
          <i className="fa-solid fa-chart-simple pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" />
          <select value={pricingDecisionDeltaFilter} onChange={(e) => setPricingDecisionDeltaFilter(e.target.value as PricingDecisionDeltaFilter)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-black outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="all">همه اختلاف‌ها</option>
            <option value="higher">بالاتر از AI</option>
            <option value="lower">پایین‌تر از AI</option>
            <option value="same">نزدیک به AI</option>
          </select>
        </label>
        <label className="relative block">
          <i className="fa-solid fa-calendar-days pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" />
          <input type="text" inputMode="numeric" value={pricingDecisionDateFrom} onChange={(e) => setPricingDecisionDateFrom(normalizePricingDateInput(e.target.value))} placeholder="۱۴۰۴/۰۲/۱۰" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-3 text-center text-sm font-black tracking-tight outline-none transition placeholder:text-slate-400    dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <span className="mt-1 block text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{formatPricingDatePreview(pricingDecisionDateFrom, 'از تاریخ')}</span>
        </label>
        <label className="relative block">
          <i className="fa-solid fa-calendar-check pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" />
          <input type="text" inputMode="numeric" value={pricingDecisionDateTo} onChange={(e) => setPricingDecisionDateTo(normalizePricingDateInput(e.target.value))} placeholder="۱۴۰۴/۰۲/۳۰" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-3 text-center text-sm font-black tracking-tight outline-none transition placeholder:text-slate-400    dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <span className="mt-1 block text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{formatPricingDatePreview(pricingDecisionDateTo, 'تا تاریخ')}</span>
        </label>
        <Button type="button" size="xs" variant="secondary" onClick={() => { setPricingDecisionSearch(''); setPricingDecisionActionFilter('all'); setPricingDecisionDeltaFilter('all'); setPricingDecisionDateFrom(''); setPricingDecisionDateTo(''); }} leftIcon={<i className="fa-solid fa-xmark" />}>پاک‌سازی</Button>
      </div>
    </div>
    {pricingDecisionLog.length === 0 ? (
      <div className="p-5">
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center dark:border-slate-700 dark:bg-slate-950/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><i className="fa-solid fa-seedling" /></div>
          <div className="mt-3 text-sm font-black text-slate-800 dark:text-white">هنوز تصمیمی برای یادگیری ثبت نشده</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">بعد از ثبت گوشی و اعمال/تغییر قیمت پیشنهادی، این بخش پر می‌شود و مدیر می‌بیند سیستم از چه چیزی یاد گرفته است.</p>
        </div>
      </div>
    ) : (
      <div className="settings-pricing-log-list grid gap-3 p-5">
        {pricingDecisionLog.map((item) => (
          <div key={item.id} className="settings-pricing-log-item rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${item.meta.tone}`}><i className={`fa-solid ${item.meta.icon}`} /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white">{item.model}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${item.meta.tone}`}>{item.meta.label}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span><i className="fa-solid fa-calendar-day ml-1" />{item.date}</span>
                    <span><i className="fa-solid fa-mobile-screen ml-1" />{item.condition}</span>
                    <span><i className="fa-solid fa-chart-line ml-1" />{item.deltaLabel}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:min-w-[520px]">
                {[
                  { label: 'خرید', value: item.purchase, icon: 'fa-cart-shopping' },
                  { label: 'پیشنهاد AI', value: item.suggested, icon: 'fa-wand-magic-sparkles' },
                  { label: 'قیمت نهایی', value: item.finalSale, icon: 'fa-tag' },
                  { label: 'سود رفتاری', value: item.markup, icon: 'fa-percent' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className={`fa-solid ${metric.icon} text-primary`} />{metric.label}</div>
                    <div className="mt-1 truncate font-black text-slate-900 dark:text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>

  <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/85" data-settings-mode="advanced">
    <div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><i className="fa-solid fa-sliders" /></span><div><h3 className="text-lg font-black text-slate-900 dark:text-white">سیاست مرکزی قیمت‌گذاری</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">این تنظیمات چارچوب تصمیم هستند؛ لایه یادگیری همچنان مستقل باقی می‌ماند.</p></div></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <label className="space-y-2"><span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-route text-primary" /> استراتژی پیش‌فرض</span><select value={pricingSettings.strategy} onChange={(e) => updatePricingSettings({ strategy: e.target.value as PricingStrategyMode })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none  dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="quick">فروش سریع</option><option value="balanced">متعادل</option><option value="profit">حداکثر سود</option></select><div className="text-xs leading-6 text-slate-500 dark:text-slate-400"><i className={`fa-solid ${pricingStrategyLabels[pricingSettings.strategy].icon} ml-1 text-primary`} />{pricingStrategyLabels[pricingSettings.strategy].hint}</div></label>
      <label className="space-y-2"><span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-bullseye-arrow text-primary" /> سود هدف</span><input type="number" min={6} max={30} value={pricingSettings.targetMarkupPercent} onChange={(e) => updatePricingSettings({ targetMarkupPercent: Number(e.target.value) })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none  dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <label className="space-y-2"><span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-gauge-high text-primary" /> ریسک‌پذیری</span><input type="range" min={1} max={5} value={pricingSettings.riskTolerance} onChange={(e) => updatePricingSettings({ riskTolerance: Number(e.target.value) })} className="w-full accent-primary" /><div className="text-xs font-black text-slate-500 dark:text-slate-400">سطح {pricingSettings.riskTolerance.toLocaleString('fa-IR')} از ۵</div></label>
      <label className="space-y-2"><span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-hourglass-clock text-primary" /> آستانه راکدی</span><input type="number" min={7} max={90} value={pricingSettings.staleDaysThreshold} onChange={(e) => updatePricingSettings({ staleDaysThreshold: Number(e.target.value) })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none  dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <label className="space-y-2 lg:col-span-2"><span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-coins text-primary" /> رُند کردن قیمت پیشنهادی</span><select value={pricingSettings.roundStep} onChange={(e) => updatePricingSettings({ roundStep: Number(e.target.value) })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none  dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value={100000}>۱۰۰ هزار تومان</option><option value={250000}>۲۵۰ هزار تومان</option><option value={500000}>۵۰۰ هزار تومان</option><option value={1000000}>۱ میلیون تومان</option></select></label>
    </div>
  </section>
</div>
);

export default SettingsPricingPanel;
