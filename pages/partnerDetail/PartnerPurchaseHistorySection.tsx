import { IconGlyph, SelectField, TableActionGroup } from '@/components/ui';
import React from 'react';

export type PartnerPurchaseHistoryContext = Record<string, any> & {
  setExpandedPurchaseHistoryId: React.Dispatch<React.SetStateAction<string | null>>;
};

type Props = {
  ctx: PartnerPurchaseHistoryContext;
};

const PartnerPurchaseHistorySection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    assetKey,
    expanded,
    expandedPurchaseHistoryId,
    formatCurrencyText,
    formatIsoToShamsiDateTime,
    getPurchaseSystemId,
    id,
    identifier,
    item,
    ledger,
    name,
    note,
    phone,
    purchaseHistoryCounts,
    purchaseHistoryFilter,
    purchaseHistoryVisible,
    purchaseDirectory,
    purchasePage,
    purchasePageSize,
    purchaseLoading,
    setPurchasePage,
    setPurchasePageSize,
    qty,
    readStoredCurrencyUnit,
    setExpandedPurchaseHistoryId,
    setPurchaseHistoryFilter,
    systemId,
    text,
    total,
  } = ctx;

  return (
    <>
{/* Other Purchases */}
      <section id="partner-purchase-history-section" data-ui-section="partner-purchase-history" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5" aria-labelledby="partner-purchase-history-title">
        <div className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <IconGlyph tone="accent" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-boxes-stacked" /></IconGlyph>
            <div className="min-w-0 text-right">
              <h2 id="partner-purchase-history-title" className="text-xl font-black leading-8 text-slate-900 dark:text-slate-50">خریدهای ثبت‌شده از این همکار</h2>
              <p className="mt-1 max-w-3xl break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-400">گوشی‌ها و کالاهای خریداری‌شده به‌صورت یک ردیف برای هر شناسه اصلی نمایش داده می‌شوند؛ تغییر قیمت‌ها داخل جزئیات همان ردیف قابل مشاهده است.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/55">
            {[
              { key: 'all', label: 'همه', count: purchaseHistoryCounts.all, icon: 'fa-layer-group' },
              { key: 'phone', label: 'گوشی‌ها', count: purchaseHistoryCounts.phone, icon: 'fa-mobile-screen' },
              { key: 'product', label: 'کالاها', count: purchaseHistoryCounts.product, icon: 'fa-box' },
            ].map((tab) => {
              const active = purchaseHistoryFilter === tab.key;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => { setPurchaseHistoryFilter(tab.key as any); setExpandedPurchaseHistoryId(null); }}
                  variant={active ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={active}
                  leftIcon={<i className={`fa-solid ${tab.icon}`} aria-hidden="true" />}
                >
                  <span>{tab.label}</span>
                  <span className={active ? 'text-white/80 dark:text-slate-900/70' : 'text-slate-500 dark:text-slate-400'}>({tab.count.toLocaleString('fa-IR')})</span>
                </Button>
              );
            })}
          </div>
        </div>
        {purchaseHistoryVisible.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">برای این همکار خریدی با این فیلتر ثبت نشده است.</p>
        ) : (
          <>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[56rem] table-fixed divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <caption className="sr-only">خریدهای ثبت‌شده از این همکار و تاریخچه تغییرات هر شناسه</caption>
              <thead className="bg-slate-50/95 dark:bg-slate-900/80">
                <tr>
                  <th scope="col" className="w-36 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> خرید و شناسه</span></th>
                  <th scope="col" className="w-52 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-violet-500" /> کالا و نوع</span></th>
                  <th scope="col" className="w-24 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-slate-500" /> تعداد</span></th>
                  <th scope="col" className="w-36 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-tag text-emerald-500" /> قیمت واحد</span></th>
                  <th scope="col" className="w-36 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-sky-500" /> مبلغ کل</span></th>
                  <th scope="col" className="w-32 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-fuchsia-500" /> آخرین تغییر</span></th>
                  <th scope="col" className="w-24 px-2.5 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {purchaseHistoryVisible.map((item: any) => {
                  const assetKey = String(item.assetKey || `${item.type}-${item.id}`);
                  const systemId = String(item.systemId || getPurchaseSystemId(item));
                  const qty = Number(item.quantityPurchased ?? item.quantity ?? 0);
                  const unitPrice = Number(item.unitPrice ?? item.purchasePrice ?? 0);
                  const total = Number(item.totalPrice ?? (qty && unitPrice ? qty * unitPrice : 0));
                  const unitLabel = String(item.unit || 'عدد');
                  const typeLabel = item.type === 'phone' ? 'گوشی' : item.type === 'product' ? 'کالا' : 'رسید';
                  const expanded = expandedPurchaseHistoryId === assetKey;
                  const history = Array.isArray(item.history) ? item.history : [];
                  const historyToneIcon = item.type === 'phone' ? 'fa-mobile-screen-button' : item.type === 'product' ? 'fa-box' : 'fa-receipt';
                  return (
                    <React.Fragment key={assetKey}>
                      <tr className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${expanded ? 'bg-slate-50/60 dark:bg-slate-800/30' : ''}`}>
                        <td className="px-2.5 py-2.5 align-top">
                          <div className="font-bold leading-5 text-slate-700 dark:text-slate-200">{formatIsoToShamsiDateTime(item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                          <bdi className="mt-1 block break-all font-mono text-slate-500 dark:text-slate-400" dir="ltr">{systemId}</bdi>
                        </td>
                        <td className="px-2.5 py-2.5 align-top">
                          <div className="min-w-0">
                            <div className={`flex items-center gap-2 font-black ${item.type === 'phone' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}><i className={`fa-solid ${historyToneIcon}`} aria-hidden="true" />{typeLabel}</div>
                            <div className="mt-1 break-words font-semibold leading-5 text-slate-900 dark:text-slate-100">{item.name}</div>
                            {item.identifier ? <bdi className="mt-1 block break-all font-mono text-slate-500 dark:text-slate-400" dir="ltr">IMEI: {item.identifier}</bdi> : null}
                            {item.purchaseTypeLabel ? <div className="mt-1 break-words text-slate-500 dark:text-slate-400">نوع خرید: {item.purchaseTypeLabel}</div> : null}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 align-top"><div className="font-black text-slate-900 dark:text-slate-50">{qty ? qty.toLocaleString('fa-IR') : '-'}</div><div className="mt-1 font-semibold text-slate-500 dark:text-slate-400">{unitLabel}</div></td>
                        <td className="px-2.5 py-2.5 align-top"><div className="break-words font-black leading-5 text-slate-900 dark:text-slate-50">{unitPrice ? formatCurrencyText(unitPrice, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 font-semibold text-slate-400 dark:text-slate-500">هر {unitLabel}</div></td>
                        <td className="px-2.5 py-2.5 align-top"><div className="break-words font-black leading-5 text-slate-900 dark:text-slate-50">{total ? formatCurrencyText(total, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 font-semibold text-slate-400 dark:text-slate-500">کل ردیف</div></td>
                        <td className="px-2.5 py-2.5 align-top leading-5 text-slate-600 dark:text-slate-300">{formatIsoToShamsiDateTime(item.lastHistoryAt || item.currentPurchasePriceUpdatedAt || item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-2.5 py-2.5 align-top">
                          <TableActionGroup
                            ariaLabel={`عملیات خرید ${item.name}`}
                            collapseBelow="lg"
                            actions={[
                              {
                                key: `purchase-details-${assetKey}`,
                                kind: "button",
                                label: expanded ? "بستن جزئیات" : "مشاهده جزئیات",
                                tooltip: expanded ? "بستن جزئیات خرید" : "مشاهده جزئیات خرید",
                                variant: "secondary",
                                icon: <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />,
                                onClick: () => setExpandedPurchaseHistoryId((prev) => prev === assetKey ? null : assetKey),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                          <td colSpan={7} className="px-3 pb-3">
                            <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/60">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-black text-slate-500 dark:text-slate-400">تاریخچه تغییرات همین شناسه</div>
                                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{item.name}</div>
                                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">شناسه سیستم: <bdi dir="ltr" className="font-mono">{systemId}</bdi></div>
                                </div>
                                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300"><i className={`fa-solid ${historyToneIcon} text-slate-500`} />{history.length.toLocaleString('fa-IR')} رویداد</div>
                              </div>
                              {history.length > 0 ? (
                                <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
                                  {history.slice().reverse().map((h: any, idx: number) => (
                                    <div key={`${assetKey}-${idx}`} className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0 break-words text-xs font-black text-slate-500 dark:text-slate-400">{h.title || (item.type === 'product' ? 'تغییر قیمت کالا' : 'رویداد گوشی')}</div>
                                        <div className="break-words text-xs text-slate-400 [overflow-wrap:anywhere] dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                                      </div>
                                      {item.type === 'product' ? (
                                        <div className="mt-2 min-w-0 break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          <div>قیمت قبلی: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          <div>قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          {h.note ? <div className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                                        </div>
                                      ) : (
                                        <div className="mt-2 min-w-0 break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          {(h.description || '').toString() ? <div className="break-words [overflow-wrap:anywhere]">{String(h.description)}</div> : null}
                                          <div className="mt-1">قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPurchasePrice || item.purchasePrice || 0), readStoredCurrencyUnit())}</span></div>
                                          {h.newSalePrice ? <div>قیمت فروش: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newSalePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">برای این شناسه هنوز رویداد تغییر ثبت نشده است.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {Number(purchaseDirectory?.total || 0) > 0 ? (
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400" aria-label="صفحه‌بندی خریدهای همکار">
            <div className="flex items-center gap-2">
              <span>تعداد در صفحه</span>
              <SelectField
                value={purchasePageSize}
                onValueChange={setPurchasePageSize}
                ariaLabel="تعداد خرید همکار در هر صفحه"
                size="md"
                options={[
                  { value: '25', label: '۲۵' },
                  { value: '50', label: '۵۰' },
                  { value: '100', label: '۱۰۰' },
                ]}
              />
            </div>
            <nav className="flex items-center gap-2" aria-label="صفحه‌بندی تاریخچه خرید همکار">
              <Button type="button" variant="secondary" size="md" autoIcon={false} disabled={purchaseLoading || Number(purchasePage || 1) <= 1} onClick={() => setPurchasePage((current: number) => Math.max(1, current - 1))} aria-label="صفحه قبل" leftIcon={<i className="fa-solid fa-chevron-right" />} />
              <span className="min-w-28 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                صفحه {Number(purchaseDirectory?.page || purchasePage || 1).toLocaleString('fa-IR')} از {Number(purchaseDirectory?.totalPages || 1).toLocaleString('fa-IR')}
              </span>
              <Button type="button" variant="secondary" size="md" autoIcon={false} disabled={purchaseLoading || Number(purchasePage || 1) >= Number(purchaseDirectory?.totalPages || 1)} onClick={() => setPurchasePage((current: number) => Math.min(Number(purchaseDirectory?.totalPages || 1), current + 1))} aria-label="صفحه بعد" leftIcon={<i className="fa-solid fa-chevron-left" />} />
            </nav>
            <span>نمایش {Number(purchaseDirectory?.total || 0) ? (((Number(purchaseDirectory?.page || 1) - 1) * Number(purchaseDirectory?.pageSize || purchasePageSize)) + 1).toLocaleString('fa-IR') : '۰'} تا {Math.min(Number(purchaseDirectory?.total || 0), Number(purchaseDirectory?.page || 1) * Number(purchaseDirectory?.pageSize || purchasePageSize)).toLocaleString('fa-IR')} از {Number(purchaseDirectory?.total || 0).toLocaleString('fa-IR')}</span>
          </footer>
        ) : null}
        {purchaseLoading ? <div className="mt-3 text-center text-xs font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin me-2" />در حال به‌روزرسانی تاریخچه خرید…</div> : null}
      </section>
    </>
  );
};

export default PartnerPurchaseHistorySection;
