import { FinancialTimeline, FinancialTimelineEvent, IconGlyph, SelectField, TableActionGroup } from '@/components/ui';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { CustomerLedgerViewEntry } from '../viewBoundaryTypes';
import { navigateWithReturnContext } from '../../utils/navigationReturnContext';

type Props = {
  ctx: Record<string, any> & {
    filteredLedgerEntries: CustomerLedgerViewEntry[];
    setExpandedLedgerEntryId: React.Dispatch<React.SetStateAction<number | null>>;
  };
};

const CustomerLedgerRenderSection: React.FC<Props> = ({ ctx }) => {
  const location = useLocation();
  const {
    Button,
    averageLedgerValue,
    balance,
    balanceDirectionLabel,
    balanceToneClass,
    balanceValueText,
    credit,
    debit,
    expandedLedgerEntryId,
    fetchCustomerDetails,
    filteredLedgerEntries,
    firstInstallmentSaleId,
    formatCurrencyText,
    formatKnownShamsiDate,
    getLedgerEntryContext,
    getLedgerSourceLink,
    handleLedgerDelete,
    id,
    imei,
    installmentSalesLoading,
    invoiceId,
    isDeletingEntry,
    lacheckOpenInstallmentDue,
    lacheckOpenInstallmentDueStatus,
    latestLedgerEntry,
    ledger,
    ledgerReconciliation,
    ledgerInsights,
    ledgerRange,
    ledgerRecordedAt,
    ledgerPage,
    ledgerPageSize,
    ledgerTotal,
    ledgerTotalPages,
    ledgerDirectorySummary,
    ledgerDirectoryLoading,
    ledgerDirectoryRefreshing,
    ledgerSearch,
    ledgerStatusSummary,
    ledgerViewFilter,
    navigate,
    openLedgerModal,
    openTelegramReport,
    parseLedgerMeta,
    profile,
    printProfile,
    readStoredCurrencyUnit,
    saleId,
    setEditingEntry,
    setExpandedLedgerEntryId,
    setLedgerRange,
    setLedgerSearch,
    setLedgerPage,
    setLedgerPageSize,
    setLedgerViewFilter,
    fetchCustomerLedgerDirectory,
    t,
    typeLabel,
    value,
  } = ctx;

  const safeLedgerTotal = Math.max(0, Number(ledgerTotal || 0));
  const safeLedgerTotalPages = Math.max(1, Number(ledgerTotalPages || 1));
  const ledgerPageStart = safeLedgerTotal > 0 ? ((Math.max(1, Number(ledgerPage || 1)) - 1) * Number(ledgerPageSize || 25)) + 1 : 0;
  const ledgerPageEnd = safeLedgerTotal > 0 ? Math.min(safeLedgerTotal, ledgerPageStart + Number(ledgerPageSize || 25) - 1) : 0;
  const visibleLedgerPages = React.useMemo(() => {
    const current = Math.max(1, Number(ledgerPage || 1));
    const total = safeLedgerTotalPages;
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [ledgerPage, safeLedgerTotalPages]);

  const reconciliationAvailable = Boolean(ledgerReconciliation);
  const reconciliationHealthy = ledgerReconciliation?.state === 'reconciled';
  const reconciliationSummary = ledgerReconciliation?.summary;
  const reconciliationRepairCount = ledgerReconciliation?.repair
    ? Object.entries(ledgerReconciliation.repair)
        .filter(([key]) => key !== 'touchedCustomers')
        .reduce((sum, [, count]) => sum + Number(count || 0), 0)
    : 0;
  const linkStateMeta = (state: 'linked' | 'missing' | 'mismatch') => {
    if (state === 'linked') {
      return {
        label: 'متصل',
        icon: 'fa-solid fa-circle-check',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950 dark:text-emerald-200',
      };
    }
    if (state === 'mismatch') {
      return {
        label: 'اختلاف مبلغ',
        icon: 'fa-solid fa-triangle-exclamation',
        tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950 dark:text-amber-200',
      };
    }
    return {
      label: 'بدون رکورد دفتر',
      icon: 'fa-solid fa-link-slash',
      tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-200',
    };
  };

  return (
    <section
      className="min-w-0"
      data-ui-customer-ledger-root="standalone"
      aria-label="دفتر حساب مشتری"
    >
{/* دفتر حساب */}
      <div id="customer-ledger-section" data-ui-people-anchor="ledger" />
      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100"
      >
        <div className="p-3 sm:p-4">
          <div className="grid gap-3">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3">
              <IconGlyph tone="neutral" className="h-8 w-8" aria-hidden="true"><i className="fa-solid fa-book-open text-sm" /></IconGlyph>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-50 sm:text-lg">دفتر حساب مشتری</h2>
                <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  وضعیت مالی، گردش‌ها و عملیات این مشتری را اینجا مدیریت کنید.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <details className="group relative">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
                  <i className="fa-solid fa-arrow-up-from-bracket text-slate-500" />
                  خروجی
                  <i className="fa-solid fa-chevron-down text-xs text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="absolute end-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={printProfile}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>چاپ / PDF دفتر حساب</span>
                    <i className="fa-solid fa-print text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={openTelegramReport}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>گزارش برای ارسال</span>
                    <i className="fa-solid fa-paper-plane text-slate-400" />
                  </button>
                </div>
              </details>

              <Button
                onClick={openLedgerModal}
                variant="success"
                size="sm"
                leftIcon={<i className="fas fa-plus" />}
              >
                ثبت تراکنش جدید
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border p-3 shadow-sm ${balanceToneClass}`}>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold">مانده حساب</div>
                  <div className="mt-1.5 text-base font-black text-slate-900 dark:text-white">{balanceValueText}</div>
                  <div className="mt-0.5 text-xs font-extrabold">{balanceDirectionLabel}</div>
                </div>
                <IconGlyph tone="neutral" className="h-8 w-8 text-sm" aria-hidden="true"><i className="fa-solid fa-wallet" /></IconGlyph>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">تعداد تراکنش‌ها</div>
                  <div className="mt-1.5 text-base font-black text-slate-900 dark:text-white">{Number(ledgerDirectorySummary?.total ?? safeLedgerTotal).toLocaleString('fa-IR')}</div>
                </div>
                <IconGlyph tone="info" className="h-8 w-8 text-sm" aria-hidden="true"><i className="fa-solid fa-list-ul" /></IconGlyph>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">آخرین تراکنش</div>
                  <div className="mt-1.5 text-base font-black text-slate-900 dark:text-white">
                    {latestLedgerEntry ? formatKnownShamsiDate(latestLedgerEntry.transactionDate, 'ثبت نشده') : 'ثبت نشده'}
                  </div>
                </div>
                <IconGlyph tone="success" className="h-8 w-8 text-sm" aria-hidden="true"><i className="fa-solid fa-calendar-check" /></IconGlyph>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">آخرین پرداخت</div>
                  <div className="mt-1.5 text-base font-black text-slate-900 dark:text-white">
                    {ledgerInsights?.lastPaymentDate ? formatKnownShamsiDate(ledgerInsights.lastPaymentDate, 'ثبت نشده') : 'ثبت نشده'}
                  </div>
                </div>
                <IconGlyph tone="accent" className="h-8 w-8 text-sm" aria-hidden="true"><i className="fa-solid fa-credit-card" /></IconGlyph>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <IconGlyph
                  tone={!reconciliationAvailable ? 'danger' : reconciliationHealthy ? 'success' : 'warning'}
                  className="h-8 w-8 shrink-0 text-sm"
                  aria-hidden="true"
                >
                  <i className={reconciliationHealthy ? 'fa-solid fa-link' : 'fa-solid fa-link-slash'} />
                </IconGlyph>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">تطبیق دفتر حساب اقساط</h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${
                        !reconciliationAvailable
                          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-200'
                          : reconciliationHealthy
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <i className={!reconciliationAvailable ? 'fa-solid fa-circle-xmark' : reconciliationHealthy ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} />
                      {!reconciliationAvailable ? 'بررسی انجام نشد' : reconciliationHealthy ? 'تطبیق کامل' : 'نیازمند بررسی'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    {reconciliationAvailable
                      ? 'هر بدهی فروش اقساطی و هر پرداخت ثبت‌شده با شناسه دقیق سند و رکورد متناظر دفتر مشتری کنترل می‌شود.'
                      : 'وضعیت تطبیق دریافت نشد؛ با بررسی دوباره می‌توانید اتصال اسناد و دفتر مشتری را مجدداً کنترل کنید.'}
                  </p>
                  {reconciliationRepairCount > 0 ? (
                    <p className="mt-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                      در آخرین بررسی، {reconciliationRepairCount.toLocaleString('fa-IR')} مورد قدیمی به‌صورت خودکار همگام شد.
                    </p>
                  ) : null}
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fetchCustomerDetails}
                leftIcon={<i className="fa-solid fa-arrows-rotate" />}
              >
                بررسی دوباره
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
              {[
                { label: 'فروش اقساطی', value: reconciliationSummary?.installmentSales ?? 0 },
                { label: 'بدهی متصل', value: reconciliationSummary?.linkedCharges ?? 0 },
                { label: 'ریز پرداخت', value: reconciliationSummary?.paymentTransactions ?? 0 },
                { label: 'پرداخت متصل', value: reconciliationSummary?.linkedReceipts ?? 0 },
                { label: 'مورد نیازمند بررسی', value: reconciliationSummary?.issues ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{Number(item.value).toLocaleString('fa-IR')}</div>
                </div>
              ))}
            </div>

            {(ledgerReconciliation?.sales?.length || ledgerReconciliation?.payments?.length) ? (
              <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <i className="fa-solid fa-diagram-project text-slate-500" />
                    مشاهده اتصال اسناد و رکوردهای دفتر
                  </span>
                  <i className="fa-solid fa-chevron-down text-xs text-slate-400" />
                </summary>

                <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="min-w-0">
                      <div className="mb-2 text-xs font-black text-slate-600 dark:text-slate-300">بدهی فروش‌های اقساطی</div>
                      <div className="space-y-2">
                        {(ledgerReconciliation?.sales || []).map((sale: any) => {
                          const meta = linkStateMeta(sale.state);
                          return (
                            <div key={`sale-${sale.saleId}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <Link
                                    to={`/installment-sales/${sale.saleId}`}
                                    className="text-right text-xs font-black text-slate-900 hover:underline dark:text-slate-50"
                                  >
                                    فروش اقساطی #{Number(sale.saleId).toLocaleString('fa-IR')}
                                  </Link>
                                  <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={sale.itemsSummary || ''}>
                                    {sale.itemsSummary || 'بدون شرح کالا'}
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${meta.tone}`}>
                                  <i className={meta.icon} />
                                  {meta.label}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                                <span>بدهی سند: <strong>{formatCurrencyText(sale.expectedDebt, readStoredCurrencyUnit())}</strong></span>
                                <span>رکورد دفتر: <strong>{sale.ledgerEntryId ? `#${Number(sale.ledgerEntryId).toLocaleString('fa-IR')}` : 'ندارد'}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                        {!ledgerReconciliation?.sales?.length ? (
                          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">فروش اقساطی ثبت نشده است.</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 text-xs font-black text-slate-600 dark:text-slate-300">پرداخت‌های اقساط</div>
                      <div className="space-y-2">
                        {(ledgerReconciliation?.payments || []).map((payment: any) => {
                          const meta = linkStateMeta(payment.state);
                          return (
                            <div key={`payment-${payment.transactionId}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <Link
                                    to={`/installment-sales/${payment.saleId}#payments`}
                                    className="text-right text-xs font-black text-slate-900 hover:underline dark:text-slate-50"
                                  >
                                    قسط {Number(payment.installmentNumber || 0).toLocaleString('fa-IR')} · پرداخت #{Number(payment.transactionId).toLocaleString('fa-IR')}
                                  </Link>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {formatKnownShamsiDate(payment.paymentDate, 'بدون تاریخ')}
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${meta.tone}`}>
                                  <i className={meta.icon} />
                                  {meta.label}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                                <span>مبلغ پرداخت: <strong>{formatCurrencyText(payment.amountPaid, readStoredCurrencyUnit())}</strong></span>
                                <span>رکورد دفتر: <strong>{payment.ledgerEntryId ? `#${Number(payment.ledgerEntryId).toLocaleString('fa-IR')}` : 'ندارد'}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                        {!ledgerReconciliation?.payments?.length ? (
                          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">پرداخت اقساطی ثبت نشده است.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ) : null}
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950 xl:flex-row xl:items-center xl:justify-between">
            <div className="order-1 xl:order-4 w-full xl:max-w-[25rem]">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="جستجو در شرح، مبلغ یا تاریخ"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-9 text-sm text-slate-700 outline-none transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="order-2 xl:order-3 flex w-full items-center xl:w-auto">
              <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:w-auto">
                {[
                  { key: 'all', label: 'همه' },
                  { key: 'debit', label: 'فقط بدهکار' },
                  { key: 'credit', label: 'فقط بستانکار' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerViewFilter(item.key as 'all' | 'debit' | 'credit')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${ledgerViewFilter === item.key ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-3 xl:order-2 flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">بازه زمانی</span>
                <SelectField controlOnly unstyled showChevron={false}
                  value={ledgerRange}
                  onChange={(e) => setLedgerRange(e.target.value as 'all' | 'today' | 'week' | 'month')}
                  className="min-w-[8rem] bg-transparent text-xs font-bold text-slate-900 outline-none dark:text-slate-100"
                >
                  <option value="all">همه بازه‌ها</option>
                  <option value="today">امروز</option>
                  <option value="week">۷ روز اخیر</option>
                  <option value="month">۳۰ روز اخیر</option>
                </SelectField>
              </label>

              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <i className="fa-solid fa-filter-circle-dollar text-slate-400" />
                {safeLedgerTotal.toLocaleString('fa-IR')} رکورد
              </span>
            </div>

            <button
              type="button"
              onClick={printProfile}
              disabled={ledgerDirectoryLoading}
              className="order-4 xl:order-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              title="چاپ / PDF"
            >
              <i className="fa-solid fa-arrow-up-from-bracket" />
            </button>
          </div>

          {ledgerDirectoryLoading && filteredLedgerEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900" role="status" aria-live="polite">
              <IconGlyph tone="info" className="mx-auto h-10 w-10 text-base" aria-hidden="true"><i className="fa-solid fa-circle-notch fa-spin" /></IconGlyph>
              <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-slate-100">در حال دریافت گردش‌های دفتر حساب</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">فقط رکوردهای همین صفحه از سرور خوانده می‌شوند.</p>
            </div>
          ) : filteredLedgerEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <IconGlyph tone="neutral" className="mx-auto h-10 w-10 text-base" aria-hidden="true"><i className="fa-solid fa-receipt" /></IconGlyph>
              <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-slate-100">برای این فیلترها رکوردی پیدا نشد</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">جستجو یا بازه زمانی را تغییر دهید، یا اولین تراکنش را برای این مشتری ثبت کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-50">خلاصه هوشمند</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">خلاصه تصمیم‌گیری سریع قبل از ثبت یا پیگیری تراکنش بعدی.</p>
                  </div>
                  <IconGlyph tone="neutral" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-lightbulb" /></IconGlyph>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">وضعیت وصول</div>
                        <div className={`mt-1.5 text-base font-extrabold ${ledgerStatusSummary.tone}`}>{ledgerStatusSummary.label}</div>
                      </div>
                      <IconGlyph tone="warning" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-circle-exclamation" /></IconGlyph>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">آخرین تراکنش</div>
                        <div className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-50">{latestLedgerEntry ? formatKnownShamsiDate(latestLedgerEntry.transactionDate, 'ثبت نشده') : 'ثبت نشده'}</div>
                      </div>
                      <IconGlyph tone="success" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-calendar-days" /></IconGlyph>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">آخرین پرداخت</div>
                        <div className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-50">{ledgerInsights?.lastPaymentDate ? formatKnownShamsiDate(ledgerInsights.lastPaymentDate, 'ثبت نشده') : 'ثبت نشده'}</div>
                      </div>
                      <IconGlyph tone="accent" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-credit-card" /></IconGlyph>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">میانگین ارزش تراکنش</div>
                        <div className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-50">{formatCurrencyText(averageLedgerValue, readStoredCurrencyUnit())}</div>
                      </div>
                      <IconGlyph tone="info" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-chart-column" /></IconGlyph>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">سررسید باز اقساطی</div>
                        <div className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-50">
                          {installmentSalesLoading ? 'در حال بررسی...' : lacheckOpenInstallmentDue ? 'دارد' : 'ندارد'}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {installmentSalesLoading
                            ? 'در حال خواندن سررسیدهای باز مشتری...'
                            : lacheckOpenInstallmentDue
                              ? `${lacheckOpenInstallmentDue.dueDate} — ${lacheckOpenInstallmentDueStatus.hint}`
                              : 'در حال حاضر برای این مشتری سررسید بازی ثبت نشده است.'}
                        </div>
                      </div>
                      <IconGlyph tone="success" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-calendar-check" /></IconGlyph>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => firstInstallmentSaleId && navigate(`/installment-sales/${firstInstallmentSaleId}`)}
                  disabled={!firstInstallmentSaleId}
                  className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-black text-slate-800 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                >
                  <span>{firstInstallmentSaleId ? 'مشاهده پرونده اقساط' : 'پرونده اقساطی فعالی وجود ندارد'}</span>
                  <i className="fa-regular fa-folder-open" />
                </button>
              </aside>

              <FinancialTimeline
                title="گردش حساب"
                subtitle="نمایش کامل گردش‌های مالی ثبت‌شده برای این مشتری با همان الگوی تایم‌لاین مالی مشترک"
                eyebrow="تایم‌لاین مالی مشتری"
                iconClass="fa-solid fa-book-open-reader"
                countLabel={`${safeLedgerTotal.toLocaleString('fa-IR')} رکورد`}
                onRefresh={() => fetchCustomerLedgerDirectory(true, true, ledgerPage)}
                refreshing={ledgerDirectoryRefreshing}
                tone={balance > 0 ? 'warning' : balance < 0 ? 'success' : 'neutral'}
                className=""
                bodyClassName="p-0"
                ariaLabel="گردش حساب مشتری"
              >
                <div className="space-y-3 p-4">
                  {filteredLedgerEntries.map((entry, index) => {
                    const meta = parseLedgerMeta(entry.description);
                    const recordedAt = ledgerRecordedAt(entry);
                    const expanded = expandedLedgerEntryId === entry.id;
                    const contextMeta = getLedgerEntryContext(entry);
                    const sourceTarget = getLedgerSourceLink(entry, meta);
                    const debitValue = Number(entry.debit || 0);
                    const creditValue = Number(entry.credit || 0);
                    const balanceValue = Number(entry.balance || 0);
                    const primaryAmount = debitValue > 0 ? debitValue : creditValue;
                    const amountTone = debitValue > 0 ? 'danger' : creditValue > 0 ? 'success' : 'neutral';
                    const amountLabel = debitValue > 0 ? 'بدهکار' : creditValue > 0 ? 'بستانکار' : 'اثر مالی';
                    const balanceDirection = balanceValue > 0 ? 'مانده بدهکار' : balanceValue < 0 ? 'مانده بستانکار' : 'تسویه';
                    const statusTone = balanceValue > 0 ? 'warning' : balanceValue < 0 ? 'success' : 'neutral';
                    const sourceLabel = sourceTarget?.label || meta.typeLabel || contextMeta.label || 'ثبت مستقیم دفتر';

                    return (
                      <FinancialTimelineEvent
                        key={`ledger-${entry.id}-${entry.date || entry.createdAt || entry.description || entry.type || 'row'}`}
                        compact
                        title={meta.summary}
                        description={contextMeta.hint}
                        source={sourceLabel}
                        amount={primaryAmount > 0 ? formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit()) : '—'}
                        amountLabel={amountLabel}
                        amountTone={amountTone}
                        date={formatKnownShamsiDate(entry.transactionDate, '—')}
                        status={balanceDirection}
                        statusTone={statusTone}
                        deepLink={sourceTarget ? {
                          label: sourceTarget.shortLabel || sourceTarget.label,
                          onClick: () => {
                            if (!entry.id) { navigate(sourceTarget.path); return; }
                            navigateWithReturnContext(navigate, sourceTarget.path, {
                            originPath: `${location.pathname}${location.search}`,
                            originPathname: location.pathname,
                            originTitle: profile?.fullName ? `مشتری ${profile.fullName}` : 'دفتر حساب مشتری',
                            originContextLabel: `تراکنش #${Number(entry.id || 0).toLocaleString('fa-IR')} • ${String(meta.summary || sourceLabel)}`,
                            originAnchorId: `customer-ledger-entry-${entry.id}`,
                            originUiState: {
                              kind: 'customer-ledger',
                              customerId: Number(id || 0),
                              page: Math.max(1, Number(ledgerPage || 1)),
                              pageSize: String(ledgerPageSize || '25') as '25' | '50' | '100',
                              search: String(ledgerSearch || ''),
                              direction: String(ledgerViewFilter || 'all'),
                              range: String(ledgerRange || 'all'),
                              expandedEntryId: expandedLedgerEntryId,
                            },
                            targetEntity: {
                              kind: String((entry as any)?.sourceKind || ''),
                              id: Number((entry as any)?.sourceId || 0) || undefined,
                              sourceLabel,
                              amountText: primaryAmount > 0
                                ? formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit())
                                : undefined,
                              preview: {
                                eyebrow: 'رویداد دفتر مشتری',
                                status: balanceDirection,
                                statusTone,
                                items: [
                                  primaryAmount > 0 ? {
                                    label: 'مبلغ رویداد',
                                    value: formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit()),
                                    iconClass: 'fa-solid fa-coins',
                                    tone: amountTone,
                                  } : null,
                                  {
                                    label: 'مانده پس از رویداد',
                                    value: formatCurrencyText(Math.abs(balanceValue), readStoredCurrencyUnit()),
                                    iconClass: 'fa-solid fa-scale-balanced',
                                    tone: statusTone,
                                  },
                                  {
                                    label: 'تاریخ',
                                    value: formatKnownShamsiDate(entry.transactionDate, '—'),
                                    iconClass: 'fa-regular fa-calendar',
                                  },
                                  {
                                    label: 'نوع رویداد',
                                    value: contextMeta.label,
                                    iconClass: contextMeta.icon,
                                  },
                                ].filter(Boolean) as any,
                                note: contextMeta.hint,
                              },
                            },
                            });
                          },
                          iconClass: sourceTarget.icon,
                          title: sourceTarget.label,
                        } : null}
                        navigationAnchorId={`customer-ledger-entry-${entry.id}`}
                        marker={<i className={`fa-solid ${debitValue > 0 ? 'fa-arrow-up' : creditValue > 0 ? 'fa-arrow-down' : 'fa-scale-balanced'}`} />}
                        markerTone={amountTone}
                        isLast={index === filteredLedgerEntries.length - 1}
                        actions={(
                          <TableActionGroup
                            ariaLabel={`عملیات رکورد دفتر مشتری ${entry.id}`}
                            collapseBelow="xl"
                            align="start"
                            actions={[
                              {
                                key: `customer-ledger-details-${entry.id}`,
                                kind:"button",
                                label: expanded ?"بستن جزئیات" :"مشاهده جزئیات",
                                tooltip: expanded ?"بستن جزئیات رکورد" :"مشاهده جزئیات رکورد",
                                variant:"secondary",
                                icon: <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-left'}`} />,
                                onClick: () => setExpandedLedgerEntryId((prev) => (prev === entry.id ? null : entry.id)),
                              },
                              {
                                key: `customer-ledger-edit-${entry.id}`,
                                kind:"button",
                                label:"ویرایش رکورد",
                                tooltip:"ویرایش رکورد دفتر مشتری",
                                variant:"warning",
                                icon: <i className="fa-solid fa-pen-to-square" />,
                                onClick: () => setEditingEntry(entry),
                              },
                              {
                                key: `customer-ledger-delete-${entry.id}`,
                                kind:"button",
                                label:"حذف رکورد",
                                tooltip:"حذف رکورد دفتر مشتری",
                                variant:"danger",
                                icon: <i className="fa-solid fa-trash" />,
                                disabled: isDeletingEntry,
                                loading: isDeletingEntry,
                                onClick: () => handleLedgerDelete(entry.id),
                              },
                            ]}
                          />
                        )}
                        badges={(
                          <>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${contextMeta.tone}`}>
                              <i className={`fa-solid ${contextMeta.icon}`} />
                              {contextMeta.label}
                            </span>
                            {(meta as any).invoiceId ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">فاکتور #{(meta as any).invoiceId}</span> : null}
                            {meta.saleId ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">فروش #{meta.saleId}</span> : null}
                            {meta.imei ? <span className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" dir="ltr">IMEI: {meta.imei}</span> : null}
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              مانده بعد از رویداد: {formatCurrencyText(Math.abs(balanceValue), readStoredCurrencyUnit())}
                            </span>
                          </>
                        )}
                      >
                        {expanded ? (
                          <div className="space-y-3">
                            <div className="grid gap-2.5 md:grid-cols-3">
                              <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-xs font-black text-slate-400 dark:text-slate-500">شماره معامله / سند</div>
                                <div className="mt-1 truncate text-xs font-black text-slate-900 dark:text-slate-100">{meta.saleId || (meta as any).invoiceId || (entry as any).referenceId || '—'}</div>
                              </div>
                              <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-xs font-black text-slate-400 dark:text-slate-500">IMEI</div>
                                <div className="mt-1 truncate text-xs font-black text-slate-900 dark:text-slate-100" dir="ltr">{meta.imei || '—'}</div>
                              </div>
                              <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-xs font-black text-slate-400 dark:text-slate-500">زمان ثبت سیستمی</div>
                                <div className="mt-1 whitespace-nowrap text-xs font-black text-slate-900 dark:text-slate-100">{recordedAt}</div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-200 px-3 py-2.5 text-xs font-semibold leading-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-400">
                              <span>{contextMeta.hint}</span>
                              <span className="shrink-0 font-black text-slate-700 dark:text-slate-200">وضعیت مانده: {balanceDirection}</span>
                            </div>
                          </div>
                        ) : null}
                      </FinancialTimelineEvent>
                    );
                  })}

                </div>

                {safeLedgerTotal > 0 ? (
                  <footer className="flex flex-col items-stretch gap-2 border-t border-slate-200 px-3 py-2 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800" aria-label="صفحه‌بندی دفتر حساب مشتری">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 lg:justify-start dark:text-slate-400">
                      <span>در هر صفحه</span>
                      <div className="w-20 shrink-0"><SelectField
                        controlOnly
                        value={String(ledgerPageSize)}
                        onValueChange={(value) => setLedgerPageSize(value as '25' | '50' | '100')}
                        ariaLabel="تعداد گردش حساب در هر صفحه"
                        size="sm"
                        options={[
                          { value: '25', label: '۲۵' },
                          { value: '50', label: '۵۰' },
                          { value: '100', label: '۱۰۰' },
                        ]}
                      /></div>
                    </div>
                    <nav className="flex max-w-full items-center justify-center gap-1 overflow-x-auto" aria-label="صفحه‌بندی گردش حساب">
                      <Button type="button" variant="secondary" size="xs" autoIcon={false} disabled={Number(ledgerPage) <= 1 || ledgerDirectoryLoading} onClick={() => setLedgerPage((current: number) => Math.max(1, current - 1))} aria-label="صفحه قبل" leftIcon={<i className="fa-solid fa-chevron-right" />}>قبلی</Button>
                      {visibleLedgerPages.map((item) => (
                        <Button key={item} type="button" variant={item === Number(ledgerPage) ? 'primary' : 'secondary'} size="icon" autoIcon={false} disabled={ledgerDirectoryLoading} data-active={item === Number(ledgerPage)} onClick={() => setLedgerPage(item)}>
                          {item.toLocaleString('fa-IR')}
                        </Button>
                      ))}
                      <Button type="button" variant="secondary" size="xs" autoIcon={false} disabled={Number(ledgerPage) >= safeLedgerTotalPages || ledgerDirectoryLoading} onClick={() => setLedgerPage((current: number) => Math.min(safeLedgerTotalPages, current + 1))} aria-label="صفحه بعد" leftIcon={<i className="fa-solid fa-chevron-left" />}>بعدی</Button>
                    </nav>
                    <span className="text-center text-xs font-semibold text-slate-500 lg:text-start dark:text-slate-400">نمایش {ledgerPageStart.toLocaleString('fa-IR')} تا {ledgerPageEnd.toLocaleString('fa-IR')} از {safeLedgerTotal.toLocaleString('fa-IR')}</span>
                  </footer>
                ) : null}
              </FinancialTimeline>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerLedgerRenderSection;
