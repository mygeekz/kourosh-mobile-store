import { IconGlyph, Table, TableViewport, ManagementDirectoryPagination, TableActionGroup } from '@/components/ui';
import { PeopleDetailSectionHeading } from '@/components/people/PeopleDetailFoundation';
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
      <section id="partner-purchase-history-section" data-ui-section="partner-purchase-history" data-ui-people-detail-purchases="partner-standard-v282" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5" aria-labelledby="partner-purchase-history-title">
        <PeopleDetailSectionHeading
          id="partner-purchase-history-title"
          iconClass="fa-solid fa-boxes-stacked"
          title="خریدهای ثبت‌شده از این همکار"
          subtitle="گوشی‌ها و کالاهای خریداری‌شده با دسترسی به تاریخچه تغییرات هر شناسه."
          className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-800"
          actions={<div className="flex flex-wrap items-center justify-end gap-1.5">
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
                  size="xs"
                  aria-pressed={active}
                  leftIcon={<i className={`fa-solid ${tab.icon}`} aria-hidden="true" />}
                >
                  <span>{tab.label}</span>
                  <span className={active ? 'text-white/80 dark:text-slate-900/70' : 'text-slate-500 dark:text-slate-400'}>({tab.count.toLocaleString('fa-IR')})</span>
                </Button>
              );
            })}
          </div>}
        />
        {purchaseHistoryVisible.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">برای این همکار خریدی با این فیلتر ثبت نشده است.</p>
        ) : (
          <>

            <TableViewport
              ariaLabel="خریدهای ثبت‌شده از این همکار"
              className="w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 dark:border-slate-800"
              data-ui-purchase-history-parity="installments-v321"
              data-ui-purchase-history-kind="partner"
            >
            <Table minWidthClassName="min-w-[50rem]" layout="auto" density="compact" className="w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <caption className="sr-only">خریدهای ثبت‌شده از این همکار و تاریخچه تغییرات هر شناسه</caption>
              <thead className="bg-slate-50/95 dark:bg-slate-900/80">
                <tr>
                  <th scope="col" className="min-w-[8rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> خرید و شناسه</span></th>
                  <th scope="col" className="min-w-[11rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-violet-500" /> کالا و نوع</span></th>
                  <th scope="col" className="min-w-[5rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-slate-500" /> تعداد</span></th>
                  <th scope="col" className="min-w-[8rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-tag text-emerald-500" /> قیمت واحد</span></th>
                  <th scope="col" className="min-w-[8rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-sky-500" /> مبلغ کل</span></th>
                  <th scope="col" className="min-w-[7rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-fuchsia-500" /> آخرین تغییر</span></th>
                  <th scope="col" className="min-w-[5rem] px-2.5 py-2 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
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
                        <td className="px-2.5 py-2 align-middle">
                          <div className="font-bold leading-5 text-slate-700 dark:text-slate-200">{formatIsoToShamsiDateTime(item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                          <bdi className="mt-1 block whitespace-nowrap font-mono text-slate-500 dark:text-slate-400" dir="ltr">{systemId}</bdi>
                        </td>
                        <td className="px-2.5 py-2 align-middle">
                          <div className="min-w-0">
                            <div className={`flex items-center gap-2 font-black ${item.type === 'phone' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}><i className={`fa-solid ${historyToneIcon}`} aria-hidden="true" />{typeLabel}</div>
                            <div className="mt-1 break-words font-semibold leading-5 text-slate-900 dark:text-slate-100">{item.name}</div>
                            {item.identifier ? <bdi className="mt-1 block whitespace-nowrap font-mono text-slate-500 dark:text-slate-400" dir="ltr">IMEI: {item.identifier}</bdi> : null}
                            {item.purchaseTypeLabel ? <div className="mt-1 break-words text-slate-500 dark:text-slate-400">نوع خرید: {item.purchaseTypeLabel}</div> : null}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 align-middle"><div className="font-black text-slate-900 dark:text-slate-50">{qty ? qty.toLocaleString('fa-IR') : '-'}</div><div className="mt-1 font-semibold text-slate-500 dark:text-slate-400">{unitLabel}</div></td>
                        <td className="px-2.5 py-2 align-middle"><div className="whitespace-nowrap font-black tabular-nums leading-5 text-slate-900 dark:text-slate-50">{unitPrice ? formatCurrencyText(unitPrice, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 font-semibold text-slate-400 dark:text-slate-500">هر {unitLabel}</div></td>
                        <td className="px-2.5 py-2 align-middle"><div className="whitespace-nowrap font-black tabular-nums leading-5 text-slate-900 dark:text-slate-50">{total ? formatCurrencyText(total, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 font-semibold text-slate-400 dark:text-slate-500">کل ردیف</div></td>
                        <td className="px-2.5 py-2 align-middle leading-5 text-slate-600 dark:text-slate-300">{formatIsoToShamsiDateTime(item.lastHistoryAt || item.currentPurchasePriceUpdatedAt || item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-2.5 py-2 align-middle">
                          <TableActionGroup
                            ariaLabel={`عملیات خرید ${item.name}`}
                            collapseBelow="md"
                            density="compact"
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
                        <tr className="bg-slate-50/70 dark:bg-slate-900/60" data-ui-partner-purchase-history-expanded="true">
                          <td colSpan={7} className="px-3 pb-3 pt-2">
                            <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-right shadow-sm dark:border-slate-700 dark:bg-slate-950/60 sm:p-4" dir="rtl" aria-label={`تاریخچه تغییرات ${item.name}`}>
                              <header className="flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800" data-ui-partner-purchase-history-expanded-header="true">
                                <div className="min-w-0 text-right">
                                  <div className="inline-flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                                    <IconGlyph tone="neutral" size="sm" aria-hidden="true"><i className={`fa-solid ${historyToneIcon}`} /></IconGlyph>
                                    <span>تاریخچه تغییرات همین شناسه</span>
                                  </div>
                                  <div className="mt-1.5 break-words text-base font-black text-slate-950 dark:text-slate-50">{item.name}</div>
                                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <span className="shrink-0">شناسه سیستم:</span>
                                    <bdi dir="ltr" className="max-w-full whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">{systemId}</bdi>
                                  </div>
                                </div>
                                <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                  <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                                  <span>{history.length.toLocaleString('fa-IR')} رویداد</span>
                                </div>
                              </header>
                              {history.length > 0 ? (
                                <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" dir="rtl" data-ui-partner-purchase-history-event-grid="true">
                                  {history.slice().reverse().map((h: any, idx: number) => {
                                    const eventTitle = h.title || (item.type === 'product' ? 'تغییر قیمت کالا' : 'رویداد گوشی');
                                    const eventDate = formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm');
                                    return (
                                      <article key={`${assetKey}-${idx}`} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-right dark:border-slate-800 dark:bg-slate-900/60" data-ui-partner-purchase-history-event="true">
                                        <div className="flex min-w-0 items-start justify-between gap-3" dir="rtl">
                                          <div className="min-w-0">
                                            <div className="inline-flex max-w-full items-center gap-2">
                                              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{(idx + 1).toLocaleString('fa-IR')}</span>
                                              <h4 className="min-w-0 break-words text-xs font-black leading-5 text-slate-700 dark:text-slate-200">{eventTitle}</h4>
                                            </div>
                                          </div>
                                          <bdi dir="ltr" className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-400 dark:text-slate-500">{eventDate}</bdi>
                                        </div>
                                        {item.type === 'product' ? (
                                          <div className="mt-3 grid min-w-0 gap-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                                              <span className="shrink-0 text-slate-500 dark:text-slate-400">قیمت قبلی</span>
                                              <span className="min-w-0 whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span>
                                            </div>
                                            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                                              <span className="shrink-0 text-slate-500 dark:text-slate-400">قیمت جدید</span>
                                              <span className="min-w-0 whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span>
                                            </div>
                                            {h.note ? <p className="break-words text-right text-xs leading-6 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{h.note}</p> : null}
                                          </div>
                                        ) : (
                                          <div className="mt-3 flex min-w-0 flex-1 flex-col gap-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                            {(h.description || '').toString() ? <p className="min-w-0 break-words text-right [overflow-wrap:anywhere]">{String(h.description)}</p> : null}
                                            <div className="mt-auto grid min-w-0 gap-2">
                                              <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                                                <span className="shrink-0 text-slate-500 dark:text-slate-400">قیمت خرید</span>
                                                <span className="min-w-0 whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPurchasePrice || item.purchasePrice || 0), readStoredCurrencyUnit())}</span>
                                              </div>
                                              {h.newSalePrice ? (
                                                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                                                  <span className="shrink-0 text-slate-500 dark:text-slate-400">قیمت فروش</span>
                                                  <span className="min-w-0 whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newSalePrice || 0), readStoredCurrencyUnit())}</span>
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        )}
                                      </article>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-right text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">برای این شناسه هنوز رویداد تغییر ثبت نشده است.</div>
                              )}
                            </section>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </TableViewport>
          </>
        )}

        {Number(purchaseDirectory?.total || 0) > 0 ? (
          <ManagementDirectoryPagination
            page={Math.max(1, Number(purchaseDirectory?.page || purchasePage || 1))}
            totalPages={Math.max(1, Number(purchaseDirectory?.totalPages || 1))}
            pageSize={Math.max(1, Number(purchaseDirectory?.pageSize || purchasePageSize || 25))}
            pageSizeOptions={[25, 50, 100] as const}
            total={Math.max(0, Number(purchaseDirectory?.total || 0))}
            pageStart={Number(purchaseDirectory?.total || 0) ? (((Number(purchaseDirectory?.page || 1) - 1) * Number(purchaseDirectory?.pageSize || purchasePageSize || 25)) + 1) : 0}
            pageEnd={Math.min(Number(purchaseDirectory?.total || 0), Number(purchaseDirectory?.page || 1) * Number(purchaseDirectory?.pageSize || purchasePageSize || 25))}
            ariaLabel="صفحه‌بندی تاریخچه خرید همکار"
            pageSizeAriaLabel="تعداد خرید همکار در هر صفحه"
            onPageChange={(page) => setPurchasePage(page)}
            onPageSizeChange={(pageSize) => setPurchasePageSize(String(pageSize) as '25' | '50' | '100')}
          />
        ) : null}
        {purchaseLoading ? <div className="mt-3 text-center text-xs font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin me-2" />در حال به‌روزرسانی تاریخچه خرید…</div> : null}
      </section>
    </>
  );
};

export default PartnerPurchaseHistorySection;
