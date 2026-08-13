import { DataTableShell, IconGlyph, SelectField } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerPhoneCapitalSection: React.FC<Props> = ({ ctx }) => {
  const {
    FinancialProgressBar,
    balance,
    expandedPhoneSettlementTimelineId,
    exportPartnerCapitalRows,
    phoneSettlementExporting,
    phoneSettlementLoading,
    phoneSettlementPage,
    phoneSettlementPageSize,
    phoneSettlementTotal,
    phoneSettlementTotalPages,
    filteredSoldPhoneDailyPriceDeltaTotal,
    filteredSoldPhoneDailyPriceRows,
    filteredSoldPhoneDailyPriceTotal,
    filteredSoldPhoneProductSettlementBalanceTotal,
    filteredSoldPhoneProductSettlementPaidTotal,
    formatCurrencyText,
    formatIsoToShamsi,
    formatPrice,
    getBalanceLabel,
    getBalanceState,
    getPartnerCapitalMeta,
    getSaleClosureMeta,
    id,
    identifier,
    initialPurchasePrice,
    item,
    name,
    nextValue,
    note,
    phone,
    phoneSettlementBalance,
    phoneSettlementPaidAmount,
    profile,
    readStoredCurrencyUnit,
    renderPhoneSaleSourceLink,
    renderPhoneSettlementTimeline,
    togglePhoneSettlementTimeline,
    setPhoneSettlementPage,
    setPhoneSettlementPageSize,
    setSoldPhoneCapitalSearch,
    setSoldPhoneCapitalSort,
    setSoldPhoneSettlementFilter,
    settlementPurchasePrice,
    soldPhoneCapitalSearchRef,
    soldPhoneCapitalSort,
    soldPhoneDailyPriceRows,
    soldPhoneSettlementFilter,
    soldPhoneSettlementFilterCounts,
    soldPhonesCurrentPurchaseAmount,
    soldPhonesProductSettlementBalance,
    soldPhonesProductSettlementPaidAmount,
    sourceLabel,
    summary,
    target,
    text,
    tone,
    value,
  } = ctx;

  return (
    <>
<div id="partner-phone-capital-section" data-partner-phone-capital-section="true" className="partner-phone-capital-section mx-6 mt-5">
            <div className="partner-phone-capital-header">
              <div className="partner-phone-capital-copy">
                <div className="partner-phone-capital-eyebrow">
                  <i className="fa-solid fa-hand-holding-dollar text-slate-500" /> نمای سرمایه گوشی‌ها
                </div>
                <h3 className="partner-phone-capital-title">نمای سرمایه و وضعیت فروش گوشی‌ها</h3>
                <p className="partner-phone-capital-description">
                  این بخش سرمایه مرتبط با گوشی‌های فروخته‌شده را از پرونده فروش جدا می‌کند؛ بنابراین هم مشخص است اصل سرمایه همکار برگشته یا نه، هم وضعیت باز یا بسته بودن فروش مشتری دیده می‌شود.
                </p>
              </div>

              <div className="partner-phone-capital-summary-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="partner-phone-capital-summary-label">سرمایه در انتظار بازگشت</div>
                  <span className="partner-phone-capital-summary-icon"><i className="fa-solid fa-scale-balanced" /></span>
                </div>
                <div className="partner-phone-capital-summary-value">
                  {formatCurrencyText(Math.max(0, soldPhonesProductSettlementBalance), readStoredCurrencyUnit())}
                </div>
                <div className="partner-phone-capital-summary-note">
                  مبنا: قیمت خرید روز فروش · وضعیت سرمایه: {getBalanceLabel(getBalanceState(soldPhonesProductSettlementBalance), 'partner')}
                </div>
              </div>
            </div>

            <div className="partner-phone-capital-metrics">
              {[
                {
                  label: 'مبنای سرمایه همکار',
                  value: formatCurrencyText(soldPhonesCurrentPurchaseAmount, readStoredCurrencyUnit()),
                  hint: 'قیمت خرید روز ثبت‌شده در فروش',
                  icon: 'fa-solid fa-sack-dollar',
                  featured: true,
                },
                {
                  label: 'سرمایه بازگشتی ثبت‌شده',
                  value: formatCurrencyText(soldPhonesProductSettlementPaidAmount, readStoredCurrencyUnit()),
                  hint: 'پرداخت‌های معتبر مرتبط با همین فروش‌ها',
                  icon: 'fa-solid fa-circle-check',
                  featured: true,
                },
                {
                  label: 'گوشی‌های فروخته‌شده',
                  value: Number((profile as any).phonesSoldCount || 0).toLocaleString('fa-IR'),
                  hint: 'فروش‌های نقدی، چکی و اقساطی',
                  icon: 'fa-solid fa-cart-shopping',
                },
                {
                  label: 'سرمایه در انتظار بازگشت',
                  value: formatCurrencyText(soldPhonesProductSettlementBalance, readStoredCurrencyUnit()),
                  hint: 'مانده سرمایه همکار برای گوشی‌های فروخته‌شده',
                  icon: 'fa-solid fa-hourglass-half',
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-[22px] border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:hover:shadow-none ${item.featured ? 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/65' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/65'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="partner-phone-capital-metric-label">{item.label}</div>
                      <div className="mt-2 truncate text-[15px] font-black tracking-tight text-slate-950 dark:text-slate-50">{item.value}</div>
                      <div className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
                    </div>
                    <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className={item.icon} /></IconGlyph>
                  </div>
                </div>
              ))}
            </div>

            <div className="partner-operational-table-v105">
              <div className="partner-operational-table-v105__header">
                <div className="partner-operational-table-v105__title-block">
                  <div className="partner-operational-table-v105__eyebrow">
                    <i className="fa-solid fa-list-check" />
                    جدول عملیاتی
                  </div>
                  <h4>جزئیات سرمایه و وضعیت فروش</h4>
                  <p>
                    این جدول وضعیت هر گوشی فروخته‌شده، بازگشت سرمایه همکار و وضعیت پرونده مشتری را در یک نمای عملیاتی و قابل پیگیری نمایش می‌دهد.
                  </p>
                </div>

                <div className="partner-operational-table-v105__filters" role="tablist" aria-label="فیلتر تسویه گوشی‌های فروخته‌شده">
                  {[
                    { key: 'all', label: 'همه', count: soldPhoneSettlementFilterCounts.all, icon: 'fa-solid fa-border-all' },
                    { key: 'open', label: 'سرمایه باز', count: soldPhoneSettlementFilterCounts.open, icon: 'fa-solid fa-hourglass-half' },
                    { key: 'settled', label: 'سرمایه برگشته', count: soldPhoneSettlementFilterCounts.settled, icon: 'fa-solid fa-circle-check' },
                  ].map((option) => {
                    const isActive = soldPhoneSettlementFilter === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSoldPhoneSettlementFilter(option.key as 'all' | 'open' | 'settled')}
                        className={`partner-operational-table-v105__filter ${isActive ? 'is-active' : ''}`}
                        aria-pressed={isActive}
                      >
                        <i className={option.icon} />
                        <span>{option.label}</span>
                        <b>{option.count.toLocaleString('fa-IR')}</b>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="partner-operational-table-v105__summary">
                {[
                  { label: 'نتیجه فیلتر', value: `${Number(phoneSettlementTotal || 0).toLocaleString('fa-IR')} گوشی`, icon: 'fa-solid fa-mobile-screen-button', tone: 'blue' },
                  { label: 'سرمایه در انتظار', value: formatCurrencyText(filteredSoldPhoneProductSettlementBalanceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-clock', tone: filteredSoldPhoneProductSettlementBalanceTotal > 0 ? 'rose' : 'green' },
                  { label: 'سرمایه برگشتی', value: formatCurrencyText(filteredSoldPhoneProductSettlementPaidTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-circle-check', tone: 'green' },
                  { label: 'مبنای سرمایه', value: formatCurrencyText(filteredSoldPhoneDailyPriceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-coins', tone: 'slate' },
                  { label: 'اختلاف با بهای اولیه', value: `${filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? '+' : '-'}${formatCurrencyText(Math.abs(filteredSoldPhoneDailyPriceDeltaTotal), readStoredCurrencyUnit())}`, icon: 'fa-solid fa-chart-line', tone: filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? 'amber' : 'green' },
                ].map((metric) => (
                  <div key={metric.label} className={`partner-operational-table-v105__summary-card is-${metric.tone}`}>
                    <span><i className={metric.icon} /></span>
                    <small>{metric.label}</small>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="partner-operational-table-v105__toolbar">
                <div className="partner-operational-table-v105__search" role="search">
                  <div
                    ref={soldPhoneCapitalSearchRef}
                    className="partner-operational-table-v105__search-input"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="جستجو در مدل گوشی، مشتری یا منبع"
                    data-placeholder="جستجو در مدل گوشی، مشتری یا منبع..."
                    spellCheck={false}
                    onInput={(event) => {
                      const nextValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ');
                      setSoldPhoneCapitalSearch(nextValue);
                    }}
                    onBlur={(event) => {
                      const normalizedValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim();
                      if (!normalizedValue) {
                        event.currentTarget.textContent = '';
                      }
                      setSoldPhoneCapitalSearch(normalizedValue);
                    }}
                  />
                  <i className="fa-solid fa-magnifying-glass" />
                </div>

                <label className="partner-operational-table-v105__select">
                  <i className="fa-solid fa-arrow-down-wide-short" />
                  <SelectField controlOnly unstyled showChevron={false}
                    value={soldPhoneCapitalSort}
                    onChange={(event) => setSoldPhoneCapitalSort(event.target.value as 'newest' | 'highestBalance' | 'highestCapital')}
                  >
                    <option value="newest">مرتب‌سازی: جدیدترین</option>
                    <option value="highestBalance">بیشترین مانده سرمایه</option>
                    <option value="highestCapital">بیشترین مبنای سرمایه</option>
                  </SelectField>
                </label>

                <button type="button" onClick={exportPartnerCapitalRows} disabled={phoneSettlementExporting} className="partner-operational-table-v105__tool-btn disabled:opacity-60">
                  <i className={`fa-solid ${phoneSettlementExporting ? 'fa-spinner fa-spin' : 'fa-download'}`} />
                  {phoneSettlementExporting ? 'در حال آماده‌سازی…' : 'خروجی CSV'}
                </button>
              </div>

              {phoneSettlementLoading && (
                <div className="px-4 py-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400" role="status">
                  <i className="fa-solid fa-spinner fa-spin ml-2" /> در حال دریافت صفحه سرمایه گوشی‌ها…
                </div>
              )}

              {soldPhoneSettlementFilterCounts.all === 0 ? (
                <div className="px-4 py-10 text-center">
                  <IconGlyph tone="neutral" className="mx-auto h-12 w-12" aria-hidden="true"><i className="fa-solid fa-mobile-screen" /></IconGlyph>
                  <div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">هنوز گوشی فروخته‌شده‌ای برای این همکار ثبت نشده است.</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">بعد از فروش گوشی، وضعیت سرمایه همکار و پرونده فروش در این بخش نمایش داده می‌شود.</div>
                </div>
              ) : filteredSoldPhoneDailyPriceRows.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <IconGlyph tone="neutral" className="mx-auto h-12 w-12" aria-hidden="true"><i className="fa-solid fa-filter-circle-xmark" /></IconGlyph>
                  <div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">در این فیلتر، گوشی‌ای برای نمایش وجود ندارد.</div>
                  <button type="button" onClick={() => setSoldPhoneSettlementFilter('all')} className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                    نمایش همه گوشی‌ها
                  </button>
                </div>
              ) : (
                <>
                  <div className="partner-phone-capital-mobile-list space-y-3 p-3 lg:hidden">
                    {filteredSoldPhoneDailyPriceRows.map((item: any) => {
                      const delta = Number(item.dailyPriceDelta || 0);
                      const sourceLabel = String(item.settlementPriceSourceLabel || item.saleReferenceLabel || 'ثبت مستقیم گوشی');
                      const settlementStatus = getPartnerCapitalMeta(item);
                      const saleClosureStatus = getSaleClosureMeta(item);
                      const balance = Number(item.phoneSettlementBalance || 0);
                      const paymentCount = Number(item.phoneSettlementPaymentCount || 0);
                      const isTimelineOpen = expandedPhoneSettlementTimelineId === Number(item.id);
                      return (
                        <div key={`sold-phone-card-${item.id}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-950 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span dir="ltr" className="font-mono">{item.identifier || 'IMEI ثبت نشده'}</span>
                                <span>•</span>
                                <span>{item.soldAt ? formatIsoToShamsi(item.soldAt) : 'تاریخ نامشخص'}</span>
                                <span>•</span>
                                <span>مبنای حساب: قیمت زمان فروش</span>
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                آخرین تغییر قیمت: {item.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده'}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${settlementStatus.badgeClass}`}>{settlementStatus.label}</span>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${saleClosureStatus.badgeClass}`}>{saleClosureStatus.label}</span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">مبنای سرمایه</div>
                              <div className="mt-1 text-xs font-black text-slate-950 dark:text-slate-50">{formatPrice(item.settlementPurchasePrice)}</div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">قیمت زمان فروش و ثبت تسویه</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">مانده سرمایه همکار</div>
                              <div className={`mt-1 text-xs font-black ${balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatCurrencyText(balance, readStoredCurrencyUnit())}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">بازگشت سرمایه</div>
                              <div className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{formatCurrencyText(Number(item.phoneSettlementPaidAmount || 0), readStoredCurrencyUnit())}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">اختلاف روز/اولیه</div>
                              <div className={`mt-1 text-xs font-black ${delta >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{delta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(delta), readStoredCurrencyUnit())}</div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-black text-slate-500">پرونده فروش مشتری</div>
                                <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{saleClosureStatus.label}</div>
                              </div>
                              <i className={`${saleClosureStatus.icon} text-slate-500`} />
                            </div>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className={`h-full rounded-full ${settlementStatus.progressClass}`} style={{ width: `${settlementStatus.progressPercent}%` }} />
                          </div>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {renderPhoneSaleSourceLink(item, sourceLabel, true)}
                              {item.phoneSettlementLastPaymentDate && <span>آخرین پرداخت: {formatIsoToShamsi(item.phoneSettlementLastPaymentDate)}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => togglePhoneSettlementTimeline(item)}
                                className="finance-table-action finance-table-action--history"
                              >
                                <i className="fa-solid fa-timeline text-slate-500" />
                                {isTimelineOpen ? 'بستن تاریخچه' : paymentCount > 0 ? `تاریخچه (${paymentCount.toLocaleString('fa-IR')})` : 'جزئیات تسویه'}
                              </button>
                            </div>
                          </div>
                          {isTimelineOpen && renderPhoneSettlementTimeline(item, true)}
                        </div>
                      );
                    })}
                  </div>

                  <DataTableShell className="partner-phone-capital-table-view partner-phone-capital-table-scroll hidden lg:block" data-ui-partner-phone-capital-table="true">
                    <table className="partner-capital-compact-table min-w-[1120px] w-full text-right text-xs" dir="rtl">
                      <thead className="sticky top-0 z-10 bg-white/95 text-[11px] font-black text-slate-500 backdrop-blur dark:bg-slate-950/95 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">گوشی و وضعیت</th>
                          <th className="px-4 py-3">قیمت خرید روز / اولیه</th>
                          <th className="px-4 py-3">سرمایه همکار</th>
                          <th className="px-4 py-3">پرونده فروش مشتری</th>
                          <th className="px-4 py-3">تاریخ و منبع</th>
                          <th className="px-4 py-3 text-left">اقدام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSoldPhoneDailyPriceRows.map((item: any) => {
                          const delta = Number(item.dailyPriceDelta || 0);
                          const sourceLabel = String(item.settlementPriceSourceLabel || item.saleReferenceLabel || 'ثبت مستقیم گوشی');
                          const settlementStatus = getPartnerCapitalMeta(item);
                          const saleClosureStatus = getSaleClosureMeta(item);
                          const balance = Number(item.phoneSettlementBalance || 0);
                          const paymentCount = Number(item.phoneSettlementPaymentCount || 0);
                          const isTimelineOpen = expandedPhoneSettlementTimelineId === Number(item.id);
                          return (
                            <React.Fragment key={`sold-phone-daily-fragment-${item.id}`}>
                            <tr className="partner-operational-table-v105__data-row bg-white align-middle transition hover:bg-slate-50 dark:bg-slate-950/45 dark:hover:bg-slate-900/60">
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <IconGlyph tone="neutral" className="mt-0.5 h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-mobile-screen-button" /></IconGlyph>
                                  <div className="min-w-0">
                                    <div className="font-black text-slate-900 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      <span className="font-mono" dir="ltr">{item.identifier || 'IMEI ثبت نشده'}</span>
                                      <span>•</span>
                                      <span>{item.status || 'فروخته‌شده'}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-black text-slate-950 dark:text-slate-50">{formatPrice(item.settlementPurchasePrice)}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">اولیه: {formatPrice(item.initialPurchasePrice)}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">آخرین تغییر: {item.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده'}</div>
                                <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${delta >= 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
                                  {delta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(delta), readStoredCurrencyUnit())}
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--capital px-4 py-3">
                                <div className="partner-capital-stack space-y-2">
                                  <span className={`partner-capital-status-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${settlementStatus.badgeClass}`}>
                                    <i className={settlementStatus.icon} />
                                    {settlementStatus.label}
                                  </span>
                                  <div className="partner-capital-progress-inline" data-progress-value={settlementStatus.progressPercent}>
                                    <FinancialProgressBar
                                      value={settlementStatus.progressPercent}
                                      showPercent={false}
                                      size="xs"
                                      tone={settlementStatus.capitalSettled ? 'emerald' : settlementStatus.progressPercent > 0 ? 'amber' : 'slate'}
                                      ariaLabel={`درصد بازگشت سرمایه: ${settlementStatus.progressPercent} درصد`}
                                    />
                                  </div>
                                  <div className="font-black text-emerald-700 dark:text-emerald-300">{formatCurrencyText(Number(item.phoneSettlementPaidAmount || 0), readStoredCurrencyUnit())} برگشته</div>
                                  <div className={`text-[11px] font-black ${balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>{formatCurrencyText(balance, readStoredCurrencyUnit())} مانده سرمایه</div>
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--customer px-4 py-3">
                                <div className="partner-capital-stack space-y-2">
                                  <span className={`partner-capital-status-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${saleClosureStatus.badgeClass}`}>
                                    <i className={saleClosureStatus.icon} />
                                    {saleClosureStatus.label}
                                  </span>
                                  {saleClosureStatus.isInstallment && !saleClosureStatus.isClosed ? (
                                    <div className="text-[11px] font-black text-amber-700 dark:text-amber-300">مانده اقساط مشتری: {formatCurrencyText(saleClosureStatus.remainingAmount, readStoredCurrencyUnit())}</div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--date-source px-4 py-3">
                                <div className="partner-capital-date-value font-bold text-slate-700 dark:text-slate-200">{item.soldAt ? formatIsoToShamsi(item.soldAt) : '—'}</div>
                                <div className="partner-capital-source-link mt-1">
                                  {renderPhoneSaleSourceLink(item, sourceLabel, true)}
                                </div>
                                {item.phoneSettlementLastPaymentDate && (
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">آخرین پرداخت: {formatIsoToShamsi(item.phoneSettlementLastPaymentDate)}</div>
                                )}
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--action px-4 py-3 text-left">
                                <div className="partner-capital-actions partner-operational-table-v105__action-bar flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => togglePhoneSettlementTimeline(item)}
                                    className="finance-table-action finance-table-action--history"
                                  >
                                    <i className="fa-solid fa-timeline text-slate-500" />
                                    {isTimelineOpen ? 'بستن' : paymentCount > 0 ? `تاریخچه (${paymentCount.toLocaleString('fa-IR')})` : 'جزئیات تسویه'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isTimelineOpen && (
                              <tr className="partner-operational-table-v105__timeline-row bg-slate-50 dark:bg-slate-950/30">
                                <td colSpan={6} className="px-4 pb-4 pt-0">
                                  {renderPhoneSettlementTimeline(item)}
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </DataTableShell>
                  <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      صفحه {Number(phoneSettlementPage || 1).toLocaleString('fa-IR')} از {Number(phoneSettlementTotalPages || 1).toLocaleString('fa-IR')} · {Number(phoneSettlementTotal || 0).toLocaleString('fa-IR')} نتیجه
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        تعداد در صفحه
                        <SelectField controlOnly value={String(phoneSettlementPageSize)} onChange={(event) => setPhoneSettlementPageSize(event.target.value as '25' | '50' | '100')} className="min-w-[82px]">
                          <option value="25">۲۵</option>
                          <option value="50">۵۰</option>
                          <option value="100">۱۰۰</option>
                        </SelectField>
                      </label>
                      <button type="button" disabled={phoneSettlementLoading || Number(phoneSettlementPage || 1) <= 1} onClick={() => setPhoneSettlementPage((page: number) => Math.max(1, page - 1))} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                        <i className="fa-solid fa-chevron-right" /> قبلی
                      </button>
                      <button type="button" disabled={phoneSettlementLoading || Number(phoneSettlementPage || 1) >= Number(phoneSettlementTotalPages || 1)} onClick={() => setPhoneSettlementPage((page: number) => Math.min(Number(phoneSettlementTotalPages || 1), page + 1))} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                        بعدی <i className="fa-solid fa-chevron-left" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
    </>
  );
};

export default PartnerPhoneCapitalSection;
