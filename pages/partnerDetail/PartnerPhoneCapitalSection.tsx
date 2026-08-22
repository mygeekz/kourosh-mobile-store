import { AppSearchField, DataTableShell, IconGlyph, SelectField } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerPhoneCapitalSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
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
    soldPhoneCapitalSearch,
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
<section id="partner-phone-capital-section" data-ui-section="partner-phone-capital" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5" aria-labelledby="partner-phone-capital-title">
            <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0 self-center text-right">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-hand-holding-dollar text-slate-500" /> نمای سرمایه گوشی‌ها
                </div>
                <h2 id="partner-phone-capital-title" className="mt-2 text-right text-xl font-black leading-8 text-slate-950 dark:text-slate-50">نمای سرمایه و وضعیت فروش گوشی‌ها</h2>
                <p className="mt-1 max-w-3xl text-right text-sm leading-6 text-slate-600 dark:text-slate-400">
                  این بخش سرمایه مرتبط با گوشی‌های فروخته‌شده را از پرونده فروش جدا می‌کند؛ بنابراین هم مشخص است اصل سرمایه همکار برگشته یا نه، هم وضعیت باز یا بسته بودن فروش مشتری دیده می‌شود.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-right dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black text-slate-600 dark:text-slate-300">سرمایه در انتظار بازگشت</div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><i className="fa-solid fa-scale-balanced" /></span>
                </div>
                <div className="mt-1 break-words text-base font-black leading-6 text-emerald-700 dark:text-emerald-300">
                  {formatCurrencyText(Math.max(0, soldPhonesProductSettlementBalance), readStoredCurrencyUnit())}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  مبنا: قیمت خرید روز فروش · وضعیت سرمایه: {getBalanceLabel(getBalanceState(soldPhonesProductSettlementBalance), 'partner')}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
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
                <div key={item.label} className={`rounded-xl border p-3 ${item.featured ? 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/65' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/65'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black leading-5 text-slate-600 dark:text-slate-300">{item.label}</div>
                      <div className="mt-1 break-words text-sm font-black leading-5 text-slate-950 dark:text-slate-50">{item.value}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
                    </div>
                    <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className={item.icon} /></IconGlyph>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 text-right">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-list-check" />
                    جدول عملیاتی
                  </div>
                  <h3 className="mt-2 text-right text-lg font-black leading-7 text-slate-950 dark:text-slate-50">جزئیات سرمایه و وضعیت فروش</h3>
                  <p className="mt-1 max-w-3xl text-right text-sm leading-6 text-slate-600 dark:text-slate-400">
                    این جدول وضعیت هر گوشی فروخته‌شده، بازگشت سرمایه همکار و وضعیت پرونده مشتری را در یک نمای عملیاتی و قابل پیگیری نمایش می‌دهد.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="فیلتر تسویه گوشی‌های فروخته‌شده">
                  {[
                    { key: 'all', label: 'همه', count: soldPhoneSettlementFilterCounts.all, icon: 'fa-solid fa-border-all' },
                    { key: 'open', label: 'سرمایه باز', count: soldPhoneSettlementFilterCounts.open, icon: 'fa-solid fa-hourglass-half' },
                    { key: 'settled', label: 'سرمایه برگشته', count: soldPhoneSettlementFilterCounts.settled, icon: 'fa-solid fa-circle-check' },
                  ].map((option) => {
                    const isActive = soldPhoneSettlementFilter === option.key;
                    return (
                      <Button
                        key={option.key}
                        type="button"
                        onClick={() => setSoldPhoneSettlementFilter(option.key as 'all' | 'open' | 'settled')}
                        variant={isActive ? 'primary' : 'secondary'}
                        size="sm"
                        aria-pressed={isActive}
                        leftIcon={<i className={option.icon} aria-hidden="true" />}
                      >
                        <span>{option.label}</span>
                        <span className={isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}>({option.count.toLocaleString('fa-IR')})</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 pt-2 md:grid-cols-3 xl:grid-cols-5">
                {[
                  { label: 'نتیجه فیلتر', value: `${Number(phoneSettlementTotal || 0).toLocaleString('fa-IR')} گوشی`, icon: 'fa-solid fa-mobile-screen-button', tone: 'blue' },
                  { label: 'سرمایه در انتظار', value: formatCurrencyText(filteredSoldPhoneProductSettlementBalanceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-clock', tone: filteredSoldPhoneProductSettlementBalanceTotal > 0 ? 'rose' : 'green' },
                  { label: 'سرمایه برگشتی', value: formatCurrencyText(filteredSoldPhoneProductSettlementPaidTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-circle-check', tone: 'green' },
                  { label: 'مبنای سرمایه', value: formatCurrencyText(filteredSoldPhoneDailyPriceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-coins', tone: 'slate' },
                  { label: 'اختلاف با بهای اولیه', value: `${filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? '+' : '-'}${formatCurrencyText(Math.abs(filteredSoldPhoneDailyPriceDeltaTotal), readStoredCurrencyUnit())}`, icon: 'fa-solid fa-chart-line', tone: filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? 'amber' : 'green' },
                ].map((metric) => (
                  <div key={metric.label} className="grid grid-cols-[2.25rem_minmax(0,1fr)] grid-rows-2 items-center gap-x-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <span className="row-span-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-slate-950"><i className={metric.icon} /></span>
                    <small className="text-xs font-black text-slate-500 dark:text-slate-400">{metric.label}</small>
                    <strong className={`break-words text-sm font-black leading-5 ${metric.tone === 'rose' ? 'text-rose-600' : metric.tone === 'green' ? 'text-emerald-600' : metric.tone === 'amber' ? 'text-amber-600' : 'text-slate-800 dark:text-slate-100'}`}>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 px-3 pb-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_18rem_auto]">
                <AppSearchField
                  value={soldPhoneCapitalSearch}
                  onChange={setSoldPhoneCapitalSearch}
                  placeholder="جستجو در مدل گوشی، مشتری یا منبع…"
                  ariaLabel="جستجو در جزئیات سرمایه گوشی‌ها"
                  size="md"
                  clearable
                />

                <SelectField
                  value={soldPhoneCapitalSort}
                  onValueChange={(nextSort) => setSoldPhoneCapitalSort(nextSort as 'newest' | 'highestBalance' | 'highestCapital')}
                  ariaLabel="مرتب‌سازی جزئیات سرمایه"
                  size="sm"
                  options={[
                    { value: 'newest', label: 'مرتب‌سازی: جدیدترین' },
                    { value: 'highestBalance', label: 'بیشترین مانده سرمایه' },
                    { value: 'highestCapital', label: 'بیشترین مبنای سرمایه' },
                  ]}
                />

                <Button type="button" onClick={exportPartnerCapitalRows} disabled={phoneSettlementExporting} loading={phoneSettlementExporting} loadingText="در حال آماده‌سازی…" variant="primary" size="md" leftIcon={<i className="fa-solid fa-download" />}>خروجی CSV</Button>
              </div>

              {phoneSettlementLoading && (
                <div className="px-4 py-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400" role="status">
                  <i className="fa-solid fa-spinner fa-spin me-2" /> در حال دریافت صفحه سرمایه گوشی‌ها…
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
                  <Button type="button" onClick={() => setSoldPhoneSettlementFilter('all')} className="mt-3" variant="secondary" size="md">
                    نمایش همه گوشی‌ها
                  </Button>
                </div>
              ) : (
                <>

                  <DataTableShell className="rounded-xl" data-ui-capital-table="true" aria-label="جزئیات سرمایه و وضعیت فروش گوشی‌های همکار">
                    <table className="w-full min-w-[58rem] table-fixed text-right text-xs" dir="rtl">
                      <caption className="sr-only">جزئیات سرمایه، بازگشت سرمایه و وضعیت فروش گوشی‌های همکار</caption>
                      <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <tr>
                          <th scope="col" className="w-44 px-2.5 py-2.5">گوشی و وضعیت</th>
                          <th scope="col" className="w-36 px-2.5 py-2.5">قیمت خرید روز / اولیه</th>
                          <th scope="col" className="w-40 px-2.5 py-2.5">سرمایه همکار</th>
                          <th scope="col" className="w-40 px-2.5 py-2.5">پرونده فروش مشتری</th>
                          <th scope="col" className="w-36 px-2.5 py-2.5">تاریخ و منبع</th>
                          <th scope="col" className="w-36 px-2.5 py-2.5 text-end">اقدام</th>
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
                          const capitalToneClass = settlementStatus.capitalSettled
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : settlementStatus.progressPercent > 0
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-600 dark:text-slate-300';
                          const saleToneClass = saleClosureStatus.isClosed
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : saleClosureStatus.isInstallment
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-600 dark:text-slate-300';
                          return (
                            <React.Fragment key={`sold-phone-daily-fragment-${item.id}`}>
                            <tr className="bg-white align-middle transition hover:bg-slate-50 dark:bg-slate-950/45 dark:hover:bg-slate-900/60">
                              <td className="px-2.5 py-2.5 align-top">
                                <div className="flex min-w-0 items-start gap-2">
                                  <IconGlyph tone="neutral" size="sm" className="mt-0.5" aria-hidden="true"><i className="fa-solid fa-mobile-screen-button" /></IconGlyph>
                                  <div className="min-w-0">
                                    <div className="break-words font-black leading-5 text-slate-900 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                                    <bdi className="mt-1 block break-all font-mono text-slate-500 dark:text-slate-400" dir="ltr">{item.identifier || 'IMEI ثبت نشده'}</bdi>
                                    <div className="mt-1 font-semibold text-slate-500 dark:text-slate-400">{item.status || 'فروخته‌شده'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2.5 py-2.5 align-top">
                                <div className="font-black text-slate-950 dark:text-slate-50">{formatPrice(item.settlementPurchasePrice)}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">اولیه: {formatPrice(item.initialPurchasePrice)}</div>
                                <div className="mt-1 break-words text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">آخرین تغییر: {item.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده'}</div>
                                <div className={`mt-1 text-xs font-black ${delta >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                  {delta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(delta), readStoredCurrencyUnit())}
                                </div>
                              </td>
                              <td className="px-2.5 py-2.5 align-top">
                                <div className="space-y-1.5">
                                  <div className={`flex items-start gap-2 font-black leading-5 ${capitalToneClass}`}>
                                    <i className={`${settlementStatus.icon} mt-1 shrink-0`} aria-hidden="true" />
                                    <span className="break-words">{settlementStatus.label}</span>
                                  </div>
                                  <div className="max-w-40">
                                    <FinancialProgressBar
                                      value={settlementStatus.progressPercent}
                                      showPercent={false}
                                      size="xs"
                                      tone={settlementStatus.capitalSettled ? 'emerald' : settlementStatus.progressPercent > 0 ? 'amber' : 'slate'}
                                      ariaLabel={`درصد بازگشت سرمایه: ${settlementStatus.progressPercent} درصد`}
                                    />
                                  </div>
                                  <div className="break-words font-black leading-5 text-emerald-700 dark:text-emerald-300">برگشتی: {formatCurrencyText(Number(item.phoneSettlementPaidAmount || 0), readStoredCurrencyUnit())}</div>
                                  <div className={`break-words text-xs font-black leading-5 ${balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>مانده: {formatCurrencyText(balance, readStoredCurrencyUnit())}</div>
                                </div>
                              </td>
                              <td className="px-2.5 py-2.5 align-top">
                                <div className="space-y-1.5">
                                  <div className={`flex items-start gap-2 font-black leading-5 ${saleToneClass}`}>
                                    <i className={`${saleClosureStatus.icon} mt-1 shrink-0`} aria-hidden="true" />
                                    <span className="break-words">{saleClosureStatus.label}</span>
                                  </div>
                                  {saleClosureStatus.isInstallment && !saleClosureStatus.isClosed ? (
                                    <div className="break-words text-xs font-black leading-5 text-amber-700 dark:text-amber-300">مانده اقساط مشتری: {formatCurrencyText(saleClosureStatus.remainingAmount, readStoredCurrencyUnit())}</div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-2.5 py-2.5 align-top">
                                <div className="font-bold text-slate-700 dark:text-slate-200">{item.soldAt ? formatIsoToShamsi(item.soldAt) : '—'}</div>
                                <div className="mt-1">
                                  {renderPhoneSaleSourceLink(item, sourceLabel, true)}
                                </div>
                                {item.phoneSettlementLastPaymentDate && (
                                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">آخرین پرداخت: {formatIsoToShamsi(item.phoneSettlementLastPaymentDate)}</div>
                                )}
                              </td>
                              <td className="px-2 py-2.5 align-top text-end">
                                <div className="flex items-center justify-end">
                                  <Button type="button" onClick={() => togglePhoneSettlementTimeline(item)} variant="secondary" size="xs" className="whitespace-nowrap" leftIcon={<i className="fa-solid fa-timeline" />}>
                                    {isTimelineOpen ? 'بستن' : paymentCount > 0 ? `تاریخچه (${paymentCount.toLocaleString('fa-IR')})` : 'جزئیات تسویه'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {isTimelineOpen && (
                              <tr className="bg-slate-50 dark:bg-slate-950/30">
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
                  <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      صفحه {Number(phoneSettlementPage || 1).toLocaleString('fa-IR')} از {Number(phoneSettlementTotalPages || 1).toLocaleString('fa-IR')} · {Number(phoneSettlementTotal || 0).toLocaleString('fa-IR')} نتیجه
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        تعداد در صفحه
                        <span className="w-20 shrink-0">
                          <SelectField controlOnly size="sm" value={String(phoneSettlementPageSize)} onChange={(event) => setPhoneSettlementPageSize(event.target.value as '25' | '50' | '100')}>
                            <option value="25">۲۵</option>
                            <option value="50">۵۰</option>
                            <option value="100">۱۰۰</option>
                          </SelectField>
                        </span>
                      </label>
                      <Button type="button" disabled={phoneSettlementLoading || Number(phoneSettlementPage || 1) <= 1} onClick={() => setPhoneSettlementPage((page: number) => Math.max(1, page - 1))} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-chevron-right" />}>قبلی</Button>
                      <Button type="button" disabled={phoneSettlementLoading || Number(phoneSettlementPage || 1) >= Number(phoneSettlementTotalPages || 1)} onClick={() => setPhoneSettlementPage((page: number) => Math.min(Number(phoneSettlementTotalPages || 1), page + 1))} variant="secondary" size="xs" rightIcon={<i className="fa-solid fa-chevron-left" />}>بعدی</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
    </>
  );
};

export default PartnerPhoneCapitalSection;
