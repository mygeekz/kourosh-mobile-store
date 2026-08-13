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
      <div id="partner-history-section" className="partner-purchase-history-section people-ledger-grid detail-card p-6">
        <div className="partner-purchase-history-header mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <IconGlyph tone="accent" className="h-12 w-12" aria-hidden="true"><i className="fa-solid fa-boxes-stacked" /></IconGlyph>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">خریدهای ثبت‌شده از این همکار</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">گوشی‌ها و کالاهای خریداری‌شده به‌صورت یک ردیف برای هر شناسه اصلی نمایش داده می‌شوند؛ تغییر قیمت‌ها داخل جزئیات همان ردیف قابل مشاهده است.</p>
            </div>
          </div>
          <div className="partner-purchase-history-filters flex flex-wrap items-center gap-2 justify-end rounded-[20px] border border-slate-200 bg-slate-50/80 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
            {[
              { key: 'all', label: 'همه', count: purchaseHistoryCounts.all, icon: 'fa-layer-group' },
              { key: 'phone', label: 'گوشی‌ها', count: purchaseHistoryCounts.phone, icon: 'fa-mobile-screen' },
              { key: 'product', label: 'کالاها', count: purchaseHistoryCounts.product, icon: 'fa-box' },
            ].map((tab) => {
              const active = purchaseHistoryFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setPurchaseHistoryFilter(tab.key as any); setExpandedPurchaseHistoryId(null); }}
                  className={`inline-flex min-w-[116px] items-center justify-between gap-3 rounded-[18px] border px-3 py-2.5 text-[11px] font-black transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.45)] dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className={`fa-solid ${tab.icon}`} />
                    <span>{tab.label}</span>
                  </span>
                  <span className={`inline-flex min-w-[30px] items-center justify-center rounded-xl border px-2 py-1 text-[10px] font-black ${active ? 'border-white/20 bg-white/15 text-white dark:border-slate-900/10 dark:bg-slate-950/10 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{tab.count.toLocaleString('fa-IR')}</span>
                </button>
              );
            })}
          </div>
        </div>
        {purchaseHistoryVisible.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">برای این همکار خریدی با این فیلتر ثبت نشده است.</p>
        ) : (
          <>
            <div className="partner-purchase-history-mobile-list" aria-label="فهرست خریدهای همکار در نمایش فشرده">
              {purchaseHistoryVisible.map((item: any) => {
                const mobileAssetKey = String(item.assetKey || `${item.type}-${item.id}`);
                const mobileSystemId = String(item.systemId || getPurchaseSystemId(item));
                const mobileQty = Number(item.quantityPurchased ?? item.quantity ?? 0);
                const mobileUnitPrice = Number(item.unitPrice ?? item.purchasePrice ?? 0);
                const mobileTotal = Number(item.totalPrice ?? (mobileQty && mobileUnitPrice ? mobileQty * mobileUnitPrice : 0));
                const mobileUnitLabel = String(item.unit || 'عدد');
                const mobileTypeLabel = item.type === 'phone' ? 'گوشی' : item.type === 'product' ? 'کالا' : 'رسید';
                const mobileExpanded = expandedPurchaseHistoryId === mobileAssetKey;
                const mobileHistory = Array.isArray(item.history) ? item.history : [];
                return (
                  <article key={`mobile-${mobileAssetKey}`} className="partner-purchase-history-card rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`people-chip ${item.type === 'phone' ? 'people-chip-success' : 'people-chip-neutral'}`}>{mobileTypeLabel}</span>
                          <span className="text-[10px] font-bold text-slate-400">{formatIsoToShamsiDateTime(item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</span>
                        </div>
                        <h3 className="mt-2 break-words text-sm font-black text-slate-950 dark:text-slate-50">{item.name}</h3>
                        <div className="mt-1 break-all font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400" dir="ltr">{mobileSystemId}</div>
                        {item.identifier ? <div className="mt-1 break-all text-[11px] font-semibold text-slate-500 dark:text-slate-400" dir="ltr">IMEI: {item.identifier}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedPurchaseHistoryId((prev) => prev === mobileAssetKey ? null : mobileAssetKey)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        aria-label={mobileExpanded ? 'بستن جزئیات خرید' : 'مشاهده جزئیات خرید'}
                        aria-expanded={mobileExpanded}
                      >
                        <i className={`fa-solid ${mobileExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                      </button>
                    </div>

                    <div className="partner-purchase-history-card__metrics mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70"><div className="text-[10px] font-black text-slate-400">تعداد</div><div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{mobileQty ? mobileQty.toLocaleString('fa-IR') : '-'} {mobileUnitLabel}</div></div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70"><div className="text-[10px] font-black text-slate-400">قیمت واحد</div><div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{mobileUnitPrice ? formatCurrencyText(mobileUnitPrice, readStoredCurrencyUnit()) : '-'}</div></div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70"><div className="text-[10px] font-black text-slate-400">مبلغ کل</div><div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{mobileTotal ? formatCurrencyText(mobileTotal, readStoredCurrencyUnit()) : '-'}</div></div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70"><div className="text-[10px] font-black text-slate-400">آخرین تغییر</div><div className="mt-1 text-[11px] font-black text-slate-900 dark:text-slate-50">{formatIsoToShamsiDateTime(item.lastHistoryAt || item.currentPurchasePriceUpdatedAt || item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</div></div>
                    </div>

                    {item.purchaseTypeLabel ? <div className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">نوع خرید: <span className="font-black text-slate-700 dark:text-slate-200">{item.purchaseTypeLabel}</span></div> : null}

                    {mobileExpanded ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] font-black text-slate-600 dark:text-slate-300">تاریخچه تغییرات همین شناسه</div>
                          <span className="text-[10px] font-black text-slate-400">{mobileHistory.length.toLocaleString('fa-IR')} رویداد</span>
                        </div>
                        {mobileHistory.length ? (
                          <div className="mt-3 grid gap-2">
                            {mobileHistory.slice().reverse().map((historyItem: any, historyIndex: number) => (
                              <div key={`${mobileAssetKey}-mobile-history-${historyIndex}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/75">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{historyItem.title || (item.type === 'product' ? 'تغییر قیمت کالا' : 'رویداد گوشی')}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{formatIsoToShamsiDateTime(historyItem.changedAt, 'jYYYY/jMM/jDD HH:mm')}</span>
                                </div>
                                {historyItem.description ? <div className="mt-1 break-words text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{String(historyItem.description)}</div> : null}
                                {item.type === 'product' ? (
                                  <div className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(historyItem.newPrice || 0), readStoredCurrencyUnit())}</span></div>
                                ) : (
                                  <div className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(historyItem.newPurchasePrice || item.purchasePrice || 0), readStoredCurrencyUnit())}</span></div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : <div className="mt-2 text-[11px] font-semibold text-slate-400">رویداد تغییری برای این شناسه ثبت نشده است.</div>}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="partner-purchase-history-table-view people-table-shell overflow-x-auto">
            <table className="min-w-[1240px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="partner-ledger-table__head bg-slate-50/95 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> تاریخ</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-barcode text-slate-500" /> شناسه سیستم</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-layer-group text-indigo-500" /> نوع</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-violet-500" /> نام/مدل کالا</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-bullseye text-amber-500" /> تعداد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-slate-500" /> واحد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-tag text-emerald-500" /> قیمت واحد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-sky-500" /> مبلغ کل</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-fuchsia-500" /> آخرین تغییر</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
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
                        <td className="px-4 py-2 whitespace-nowrap align-middle">{formatIsoToShamsiDateTime(item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle">
                          <div className="font-mono text-xs text-slate-500" dir="ltr">{systemId}</div>
                        </td>
                        <td className="px-4 py-2 align-middle"><span className={`people-chip ${item.type === 'phone' ? 'people-chip-success' : 'people-chip-neutral'}`}>{typeLabel}</span></td>
                        <td className="px-4 py-2 align-middle">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] text-slate-500 dark:text-slate-400">
                              {item.identifier ? <span>IMEI: {item.identifier}</span> : null}
                              {item.purchaseTypeLabel ? <span>نوع خرید: {item.purchaseTypeLabel}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-bullseye text-amber-500" />{qty ? qty.toLocaleString('fa-IR') : '-'}</div></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><span className="people-chip people-chip-neutral">{unitLabel}</span></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><div className="font-black text-slate-900 dark:text-slate-50">{unitPrice ? formatCurrencyText(unitPrice, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">واحد هر قلم</div></td>
                        <td className="px-4 py-2 whitespace-nowrap font-semibold"><div className="font-black text-slate-900 dark:text-slate-50">{total ? formatCurrencyText(total, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">مبلغ کل ردیف</div></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle text-slate-600 dark:text-slate-300">{formatIsoToShamsiDateTime(item.lastHistoryAt || item.currentPurchasePriceUpdatedAt || item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-3 py-2 whitespace-nowrap align-middle">
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
                        <tr className="partner-ledger-expanded-row bg-slate-50/70 dark:bg-slate-900/60">
                          <td colSpan={10} className="px-4 pb-4">
                            <div className="partner-ledger-expanded-panel partner-ledger-expanded-panel--solid rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاریخچه تغییرات همین شناسه</div>
                                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{item.name}</div>
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">شناسه سیستم: <span dir="ltr" className="font-mono">{systemId}</span></div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"><i className={`fa-solid ${historyToneIcon} text-slate-500`} />{history.length.toLocaleString('fa-IR')} رویداد</div>
                              </div>
                              {history.length > 0 ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {history.slice().reverse().map((h: any, idx: number) => (
                                    <div key={`${assetKey}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{h.title || (item.type === 'product' ? 'تغییر قیمت کالا' : 'رویداد گوشی')}</div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                                      </div>
                                      {item.type === 'product' ? (
                                        <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          <div>قیمت قبلی: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          <div>قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          {h.note ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          {(h.description || '').toString() ? <div>{String(h.description)}</div> : null}
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
          <footer className="customers-directory-v73__pagination people-directory-pagination mt-5" aria-label="صفحه‌بندی خریدهای همکار">
            <div className="customers-directory-v73__pagination-size">
              <span>تعداد در صفحه</span>
              <SelectField
                value={purchasePageSize}
                onValueChange={setPurchasePageSize}
                ariaLabel="تعداد خرید همکار در هر صفحه"
                size="sm"
                options={[
                  { value: '25', label: '۲۵' },
                  { value: '50', label: '۵۰' },
                  { value: '100', label: '۱۰۰' },
                ]}
              />
            </div>
            <nav className="flex items-center gap-2" aria-label="صفحه‌بندی تاریخچه خرید همکار">
              <Button type="button" variant="secondary" size="icon" autoIcon={false} disabled={purchaseLoading || Number(purchasePage || 1) <= 1} onClick={() => setPurchasePage((current: number) => Math.max(1, current - 1))} aria-label="صفحه قبل" leftIcon={<i className="fa-solid fa-chevron-right" />} />
              <span className="min-w-[110px] text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                صفحه {Number(purchaseDirectory?.page || purchasePage || 1).toLocaleString('fa-IR')} از {Number(purchaseDirectory?.totalPages || 1).toLocaleString('fa-IR')}
              </span>
              <Button type="button" variant="secondary" size="icon" autoIcon={false} disabled={purchaseLoading || Number(purchasePage || 1) >= Number(purchaseDirectory?.totalPages || 1)} onClick={() => setPurchasePage((current: number) => Math.min(Number(purchaseDirectory?.totalPages || 1), current + 1))} aria-label="صفحه بعد" leftIcon={<i className="fa-solid fa-chevron-left" />} />
            </nav>
            <span>نمایش {Number(purchaseDirectory?.total || 0) ? (((Number(purchaseDirectory?.page || 1) - 1) * Number(purchaseDirectory?.pageSize || purchasePageSize)) + 1).toLocaleString('fa-IR') : '۰'} تا {Math.min(Number(purchaseDirectory?.total || 0), Number(purchaseDirectory?.page || 1) * Number(purchaseDirectory?.pageSize || purchasePageSize)).toLocaleString('fa-IR')} از {Number(purchaseDirectory?.total || 0).toLocaleString('fa-IR')}</span>
          </footer>
        ) : null}
        {purchaseLoading ? <div className="mt-3 text-center text-xs font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin ml-2" />در حال به‌روزرسانی تاریخچه خرید…</div> : null}
      </div>
    </>
  );
};

export default PartnerPurchaseHistorySection;
