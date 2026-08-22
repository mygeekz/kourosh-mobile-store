import { AppSearchField, DataTableShell, FinancialTimeline, FinancialTimelineEvent, IconGlyph, SelectField, TableActionGroup } from '@/components/ui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import type { PartnerLedgerEntry } from '../../types';
import { buildFinancialSourceTarget, type FinancialSourceTarget } from '../../utils/financialSourceLinks';
import { navigateWithReturnContext } from '../../utils/navigationReturnContext';
import type {
  LedgerSettlementBatchOption,
  LedgerSystemOption,
  PartnerLedgerGroup,
} from '../viewBoundaryTypes';

export type PartnerLedgerWorkspaceContext = Record<string, any> & {
    filteredLedgerEntries: PartnerLedgerEntry[];
    ledger: PartnerLedgerEntry[];
    ledgerSystemOptions: LedgerSystemOption[];
    ledgerSettlementBatchOptions: LedgerSettlementBatchOption[];
    groupedLedgerEntries: PartnerLedgerGroup[];
    setIsLedgerColumnPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setLedgerVisibleColumns: React.Dispatch<React.SetStateAction<{ systemId: boolean; createdAt: boolean; transactionDate: boolean }>>;
  setExpandedLedgerEntryId: React.Dispatch<React.SetStateAction<number | null>>;
};

type Props = {
  ctx: PartnerLedgerWorkspaceContext;
};

const toTimelineLink = (target: FinancialSourceTarget | null, onClick: () => void) => target ? ({
  label: target.shortLabel,
  onClick,
  iconClass: target.icon,
  title: target.label,
}) : null;

const getSettlementBatchLabel = (batch: LedgerSettlementBatchOption, index: number) =>
  `تسویه گروهی ${Number(index + 1).toLocaleString('fa-IR')} — ${Number(batch.count || 0).toLocaleString('fa-IR')} تراکنش — ${Number(batch.amount || 0).toLocaleString('fa-IR')} تومان`;

const PartnerLedgerWorkspaceSection: React.FC<Props> = ({ ctx }) => {
  const location = useLocation();
  const {
    Button,
    activeBatchLedgerMetrics,
    activeLedgerBatchId,
    amount,
    balance,
    credit,
    current,
    debit,
    entries,
    entry,
    expanded,
    expandedLedgerEntryId,
    filteredLedgerEntries,
    formatCurrencyText,
    formatIsoToShamsi,
    formatIsoToShamsiDateTime,
    formatLedgerTransactionDate,
    formatPartnerLedgerCurrency,
    getLedgerSystemKind,
    groupedLedgerEntries,
    handleExportActiveBatchCsv,
    handleLedgerDelete,
    handlePrintActiveBatch,
    id,
    imei,
    isDeletingEntry,
    isLedgerColumnPickerOpen,
    item,
    ledger,
    ledgerDirectory,
    ledgerPage,
    ledgerPageSize,
    ledgerLoading,
    setLedgerPage,
    setLedgerPageSize,
    ledgerColumnPickerButtonRef,
    ledgerColumnPickerPanelRef,
    ledgerDetailLines,
    ledgerDisplayMode,
    ledgerEmptyState,
    ledgerRange,
    ledgerRecordedAt,
    ledgerSearch,
    ledgerSettlementBatchOptions,
    ledgerSystemFilter,
    ledgerSystemOptions,
    ledgerTableColumnCount,
    ledgerTypeBadge,
    ledgerViewFilter,
    ledgerVisibleColumns,
    name,
    navigate,
    note,
    openLedgerModal,
    parsePartnerLedgerMeta,
    partnerRegisteredDateLabel,
    phone,
    profile,
    purchaseHistoryBySystemId,
    readStoredCurrencyUnit,
    recordedAt,
    referenceType,
    relatedPurchase,
    renderLedgerTransactionCard,
    saleId,
    setActiveLedgerBatchId,
    setEditingEntry,
    setExpandedLedgerEntryId,
    setIsLedgerColumnPickerOpen,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerSearch,
    setLedgerSystemFilter,
    setLedgerViewFilter,
    setLedgerVisibleColumns,
    summary,
    systemId,
    target,
    text,
    totalCredit,
    totalDebit,
    value,
  } = ctx;

  const activeLedgerBatchIndex = ledgerSettlementBatchOptions.findIndex((batch) => batch.id === activeLedgerBatchId);
  const activeLedgerBatchOption = activeLedgerBatchIndex >= 0 ? ledgerSettlementBatchOptions[activeLedgerBatchIndex] : null;
  const activeLedgerBatchLabel = activeLedgerBatchOption
    ? getSettlementBatchLabel(activeLedgerBatchOption, activeLedgerBatchIndex)
    : 'تسویه گروهی انتخاب‌شده';

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5" aria-labelledby="partner-ledger-title">
        <div id="partner-ledger-heading" className="mb-4 flex scroll-mt-24 flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <IconGlyph tone="success" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-book-open" /></IconGlyph>
            <div>
              <h2 id="partner-ledger-title" className="text-xl font-black text-slate-900 dark:text-slate-50">دفتر حساب همکار</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">مرور مانده، پرداخت‌ها و سوابق مالی همکار.</p>
            </div>
          </div>
          <Button type="button" onClick={openLedgerModal} variant="primary" size="md" leftIcon={<i className="fa-solid fa-money-bill-transfer" />}>
            ثبت اطلاعات دریافت / پرداخت
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <IconGlyph tone="success" className="h-9 w-9 shrink-0" aria-hidden="true"><i className="fa-solid fa-wallet" /></IconGlyph>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">مانده نهایی حساب</div>
            </div>
            <div className="mt-1.5 text-base font-black leading-6 text-slate-900 dark:text-slate-50">{formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className="fa-solid fa-list-check" /></IconGlyph>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">تعداد تراکنش‌ها</div>
            </div>
            <div className="mt-1.5 text-base font-black leading-6 text-slate-900 dark:text-slate-50">{Number(ledgerDirectory?.summary?.total || 0).toLocaleString('fa-IR')}</div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="flex items-center gap-2">
              <IconGlyph tone="info" className="h-9 w-9 shrink-0" aria-hidden="true"><i className="fa-solid fa-calendar" /></IconGlyph>
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-200">آخرین به‌روزرسانی پرونده</div>
            </div>
            <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{partnerRegisteredDateLabel}</div>
          </div>
        </div>

        {filteredLedgerEntries.length > 0 && Number(ledgerPage || 1) === 1 ? (
          <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-black text-slate-400 dark:text-slate-500">اولین رکورد قابل مشاهده</div>
              <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{ledger[ledger.length - 1] ? formatIsoToShamsi(ledger[ledger.length - 1].transactionDate) : '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-black text-slate-400 dark:text-slate-500">آخرین عملیات مالی</div>
              <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{ledger[0] ? formatIsoToShamsi(ledger[0].transactionDate) : '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-black text-slate-400 dark:text-slate-500">میانگین ارزش تراکنش‌های صفحه</div>
              <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{formatPartnerLedgerCurrency(ledger.length ? Math.round(ledger.reduce((sum, item) => sum + Math.max(item.credit || 0, item.debit || 0), 0) / ledger.length) : 0, 'balance')}</div>
            </div>
          </div>
        ) : null}


        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconGlyph tone="neutral" className="h-9 w-9" aria-hidden="true"><i className="fa-solid fa-file-invoice-dollar" /></IconGlyph>
                  <div>
                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">مدیریت تراکنش‌های مالی</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">جستجو، فیلترها، خروجی و نمای نمایش</div>
                  </div>
                </div>
                <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <i className="fa-solid fa-filter-circle-dollar" />
                  {filteredLedgerEntries.length.toLocaleString('fa-IR')} رکورد
                </span>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <AppSearchField value={ledgerSearch} onChange={setLedgerSearch} placeholder="جستجو در شرح، مبلغ، تاریخ، شناسه سیستم یا مرجع…" ariaLabel="جستجو در دفتر حساب همکار" size="md" clearable />
                <div className="flex flex-wrap items-center gap-2 justify-end xl:justify-end">
                  <div className="min-w-0 flex-1">
                    <SelectField
                      value={ledgerSystemFilter}
                      onChange={(e) => setLedgerSystemFilter(e.target.value)}
                      ariaLabel="فیلتر دفتر حساب بر اساس شناسه سیستم"
                      size="md"
                      iconClassName="fa-solid fa-barcode"
                      title="فیلتر حسابداری بر اساس شناسه سیستم"
                    >
                      <option value="all">همه شناسه‌های سیستم</option>
                      {ledgerSystemOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} · {item.count.toLocaleString('fa-IR')} رکورد
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="relative">
                    <Button ref={ledgerColumnPickerButtonRef} type="button" onClick={() => setIsLedgerColumnPickerOpen((current) => !current)} aria-expanded={isLedgerColumnPickerOpen} variant={isLedgerColumnPickerOpen ? 'primary' : 'secondary'} size="md" leftIcon={<i className="fa-solid fa-table-columns" />}>ستون‌ها</Button>
                    {isLedgerColumnPickerOpen ? (
                      <div ref={ledgerColumnPickerPanelRef} className="absolute start-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-950">
                        <div className="text-xs font-black text-slate-500 dark:text-slate-400">ستون‌های اختیاری</div>
                        <div className="mt-3 space-y-2">
                          {[
                            { key: 'systemId', label: 'شناسه سیستم', hint: 'نمایش شناسه دارایی در جدول' },
                            { key: 'createdAt', label: 'تاریخ ثبت', hint: 'زمان ثبت رکورد' },
                            { key: 'transactionDate', label: 'تاریخ تراکنش', hint: 'زمان مالی تراکنش' },
                          ].map((item) => {
                            const checked = Boolean((ledgerVisibleColumns as any)[item.key]);
                            return (
                              <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => setLedgerVisibleColumns((current) => ({ ...current, [item.key]: e.target.checked }))}
                                  className="peer sr-only"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                                  <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.hint}</span>
                                </span>
                                <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${checked ? 'border-violet-500 bg-violet-500' : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'}`}>
                                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'end-1' : 'end-6'}`} />
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <Button type="button" onClick={() => setIsLedgerColumnPickerOpen(false)} variant="secondary" size="sm" className="mt-3" leftIcon={<i className="fa-solid fa-check" />}>بستن</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2">
                {[
                  { key: 'all', label: 'همه', icon: 'fa-layer-group' },
                  { key: 'today', label: 'امروز', icon: 'fa-calendar-day' },
                  { key: 'week', label: '۷ روز', icon: 'fa-calendar-week' },
                  { key: 'month', label: 'ماه اخیر', icon: 'fa-calendar-days' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerRange(item.key as any)}
                    variant={ledgerRange === item.key ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={ledgerRange === item.key}
                    leftIcon={<i className={`fa-solid ${item.icon}`} />}
                  >
                    {item.label}
                  </Button>
                ))}
                {[
                  { key: 'all', label: 'همه تراکنش‌ها', icon: 'fa-layer-group' },
                  { key: 'debit', label: 'فقط بدهکار', icon: 'fa-arrow-up' },
                  { key: 'credit', label: 'فقط بستانکار', icon: 'fa-arrow-down' },
                  { key: 'recent', label: 'اخیر', icon: 'fa-clock-rotate-left' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerViewFilter(item.key as any)}
                    variant={ledgerViewFilter === item.key ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={ledgerViewFilter === item.key}
                    leftIcon={<i className={`fa-solid ${item.icon}`} />}
                  >
                    {item.label}
                  </Button>
                ))}
                {ledgerSettlementBatchOptions.length > 0 ? (
                  <div className="w-full min-w-0 sm:w-96">
                    <SelectField
                      value={activeLedgerBatchId}
                      onChange={(e) => setActiveLedgerBatchId(e.target.value)}
                      ariaLabel="فیلتر دفتر حساب بر اساس دسته تسویه"
                      size="md"
                      iconClassName="fa-solid fa-link"
                      title="نمایش پرداخت‌های یک دسته تسویه"
                    >
                      <option value="">همه تسویه‌های گروهی</option>
                      {ledgerSettlementBatchOptions.map((batch, batchIndex) => (
                        <option key={batch.id} value={batch.id}>
                          {getSettlementBatchLabel(batch, batchIndex)}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                ) : null}
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="نوع نمایش دفتر حساب">
                  {[
                    { key: 'table', label: 'جدول', icon: 'fa-table-cells-large' },
                    { key: 'timeline', label: 'تایم‌لاین', icon: 'fa-timeline' },
                  ].map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      onClick={() => setLedgerDisplayMode(item.key as 'table' | 'timeline')}
                      variant={ledgerDisplayMode === item.key ? 'primary' : 'secondary'}
                      size="md"
                      title={item.label}
                      aria-pressed={ledgerDisplayMode === item.key}
                      leftIcon={<i className={`fa-solid ${item.icon}`} aria-hidden="true" />}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              {activeLedgerBatchId ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handlePrintActiveBatch} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-print" />}>چاپ</Button>
                  <Button type="button" onClick={handleExportActiveBatchCsv} variant="success" size="sm" leftIcon={<i className="fa-solid fa-file-excel" />}>Excel</Button>
                  <Button type="button" onClick={() => setActiveLedgerBatchId('')} variant="ghost" size="sm" leftIcon={<i className="fa-solid fa-xmark" />}>حذف فیلتر</Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {activeLedgerBatchId && activeBatchLedgerMetrics ? (
          <div className="sticky top-24 z-10 mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/30">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black text-sky-700 dark:text-sky-300">خلاصه تسویه گروهی انتخاب‌شده</div>
                  <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{activeLedgerBatchLabel}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 dark:border-sky-900 dark:bg-slate-950"><i className="fa-solid fa-layer-group" /> {activeBatchLedgerMetrics.count.toLocaleString('fa-IR')} رکورد</span>
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 dark:border-sky-900 dark:bg-slate-950"><i className="fa-solid fa-clock-rotate-left" /> آخرین ثبت: {activeBatchLedgerMetrics.latestDate}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <article className="rounded-xl border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-slate-950">
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">جمع پرداخت‌ها</span>
                  <strong className="mt-1 block text-sm text-slate-950 dark:text-slate-50">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.totalDebit, 'debit')}</strong>
                </article>
                <article className="rounded-xl border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-slate-950">
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">جمع دریافت‌ها</span>
                  <strong className="mt-1 block text-sm text-slate-950 dark:text-slate-50">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.totalCredit, 'credit')}</strong>
                </article>
                <article className="rounded-xl border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-slate-950">
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">مانده بعد از فیلتر</span>
                  <strong className="mt-1 block text-sm text-slate-950 dark:text-slate-50">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.latestBalance, 'balance')}</strong>
                </article>
              </div>
            </div>
          </div>
        ) : null}

        {filteredLedgerEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50" dir="rtl">
            <IconGlyph tone="neutral" className="mx-auto h-12 w-12" aria-hidden="true"><i className={`fa-solid ${ledgerEmptyState.icon}`} /></IconGlyph>
            <div>
              <h3 className="mt-3 text-base font-black text-slate-900 dark:text-slate-50">{ledgerEmptyState.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{ledgerEmptyState.description}</p>
            </div>
            <Button type="button" onClick={ledgerEmptyState.action} variant="primary" size="md" className="mt-4" leftIcon={<i className={`fa-solid ${Number(ledgerDirectory?.summary?.total || 0) === 0 ? 'fa-plus' : 'fa-rotate-left'}`} />}>{ledgerEmptyState.actionLabel}</Button>
          </div>
        ) : ledgerDisplayMode === 'timeline' ? (
          <FinancialTimeline
            title="گردش‌های دفتر همکار"
            subtitle="هر رویداد با منبع، مبلغ، تاریخ، وضعیت و دسترسی مستقیم به سند یا دارایی مرتبط نمایش داده می‌شود."
            eyebrow="تایم‌لاین مالی همکار"
            iconClass="fa-solid fa-book-open-reader"
            countLabel={`${Number(ledgerDirectory?.total || 0).toLocaleString('fa-IR')} رکورد`}
            tone={Number(profile?.currentBalance || 0) > 0 ? 'warning' : Number(profile?.currentBalance || 0) < 0 ? 'success' : 'neutral'}
            compact
            ariaLabel="تایم‌لاین دفتر حساب همکار"
          >
            <div className="space-y-3">
              {groupedLedgerEntries.flatMap((group) => {
                const relatedPurchase = purchaseHistoryBySystemId.get(group.systemId);
                return group.entries.map((entry, entryIndex) => ({ group, entry, entryIndex, relatedPurchase }));
              }).map(({ group, entry, entryIndex, relatedPurchase }, timelineIndex, timelineItems) => {
                const meta = parsePartnerLedgerMeta(entry.description);
                const debitValue = Number(entry.debit || 0);
                const creditValue = Number(entry.credit || 0);
                const balanceValue = Number(entry.balance || 0);
                const primaryAmount = debitValue > 0 ? debitValue : creditValue;
                const amountTone = debitValue > 0 ? 'success' : creditValue > 0 ? 'warning' : 'neutral';
                const amountLabel = debitValue > 0 ? 'پرداخت به همکار' : creditValue > 0 ? 'افزایش بدهی' : 'اثر مالی';
                const status = balanceValue > 0 ? 'بدهی به همکار' : balanceValue < 0 ? 'طلب از همکار' : 'تسویه';
                const statusTone = balanceValue > 0 ? 'warning' : balanceValue < 0 ? 'success' : 'neutral';
                const kind = getLedgerSystemKind(entry);
                const refId = Number(entry.referenceId || 0);
                const batchId = String(entry.settlementBatchId || '').trim();
                const relatedName = String(relatedPurchase?.name || relatedPurchase?.model || '').trim();
                const kindLabel = kind === 'phone' ? 'گوشی' : kind === 'product' ? 'کالا' : 'دفتر حساب';
                const sourceLabel = relatedName ? `${kindLabel}: ${relatedName}` : kind !== 'unknown' ? `${kindLabel} ${group.systemId}` : batchId ? `دسته تسویه ${batchId}` : 'ثبت مستقیم دفتر';
                const sourceLinks = [] as Array<NonNullable<ReturnType<typeof toTimelineLink>>>;
                const navigationAnchorId = `partner-ledger-entry-${entry.id}`;
                const openTargetWithReturn = (
                  financialTarget: FinancialSourceTarget | null,
                  targetEntity: Record<string, unknown> = {},
                ) => {
                  if (!financialTarget) return;
                  navigateWithReturnContext(navigate, financialTarget.path, {
                    originPath: `${location.pathname}${location.search}`,
                    originPathname: location.pathname,
                    originTitle: profile?.partnerName ? `همکار ${profile.partnerName}` : 'دفتر حساب همکار',
                    originContextLabel: `تراکنش #${Number(entry.id || 0).toLocaleString('fa-IR')} • ${String(meta.summary || sourceLabel)}`,
                    originAnchorId: navigationAnchorId,
                    originUiState: {
                      kind: 'partner-ledger',
                      partnerId: String(profile?.id || id || ''),
                      page: Math.max(1, Number(ledgerPage || 1)),
                      pageSize: String(ledgerPageSize || '25') as '25' | '50' | '100',
                      search: String(ledgerSearch || ''),
                      direction: String(ledgerViewFilter || 'all'),
                      range: String(ledgerRange || 'all'),
                      systemId: String(ledgerSystemFilter || ''),
                      settlementBatchId: String(activeLedgerBatchId || ''),
                      displayMode: String(ledgerDisplayMode || 'timeline'),
                      expandedEntryId: expandedLedgerEntryId,
                    },
                    targetEntity: {
                      ...targetEntity,
                      preview: (targetEntity as any)?.preview || {
                        eyebrow: 'رویداد دفتر همکار',
                        status,
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
                            value: formatLedgerTransactionDate(entry.transactionDate),
                            iconClass: 'fa-regular fa-calendar',
                          },
                          {
                            label: 'منبع',
                            value: sourceLabel,
                            iconClass: 'fa-solid fa-link',
                          },
                        ].filter(Boolean),
                        note: meta.summary,
                      },
                    } as any,
                  });
                };
                const assetTarget = kind === 'phone' && refId > 0
                  ? buildFinancialSourceTarget({ kind: 'phone', id: refId })
                  : kind === 'product' && refId > 0
                    ? buildFinancialSourceTarget({ kind: 'product', id: refId })
                    : null;
                const assetLink = toTimelineLink(assetTarget, () => openTargetWithReturn(assetTarget, {
                  kind,
                  id: refId,
                  entityName: relatedName || undefined,
                  identifier: String(relatedPurchase?.identifier || '').trim() || undefined,
                  sourceLabel,
                }));
                if (assetLink) sourceLinks.push(assetLink);

                const saleSourceType = String(relatedPurchase?.saleSourceType || relatedPurchase?.settlementPriceSource || '').trim();
                const saleSourceId = Number(relatedPurchase?.saleSourceId || 0);
                if (saleSourceId > 0 && ['sales_order', 'legacy_sale', 'installment_sale'].includes(saleSourceType)) {
                  const saleTarget = buildFinancialSourceTarget({
                    kind: saleSourceType as 'sales_order' | 'legacy_sale' | 'installment_sale',
                    id: saleSourceId,
                  });
                  const saleLink = toTimelineLink(saleTarget, () => openTargetWithReturn(saleTarget, {
                    kind: saleSourceType,
                    id: saleSourceId,
                    entityName: relatedName || undefined,
                    sourceLabel: String(relatedPurchase?.saleReferenceLabel || sourceLabel || '').trim(),
                    amountText: primaryAmount > 0 ? formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit()) : undefined,
                  }));
                  if (saleLink && !sourceLinks.some((link) => link.title === saleLink.title)) sourceLinks.push(saleLink);
                }

                if (batchId) {
                  const settlementTarget = buildFinancialSourceTarget({ kind: 'partner_settlement_batch', partnerId: profile?.id || id, batchId });
                  const settlementLink = toTimelineLink(settlementTarget, () => openTargetWithReturn(settlementTarget, {
                    kind: 'partner_settlement_batch',
                    batchId,
                    amountText: primaryAmount > 0 ? formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit()) : undefined,
                    sourceLabel,
                  }));
                  if (settlementLink && !sourceLinks.some((link) => link.title === settlementLink.title)) sourceLinks.push(settlementLink);
                }
                const expanded = expandedLedgerEntryId === entry.id;
                const details = ledgerDetailLines(entry, meta);

                return (
                  <FinancialTimelineEvent
                    key={`partner-ledger-event-${entry.id}`}
                    title={meta.summary}
                    description={debitValue > 0 ? 'پرداخت یا تسویه ثبت‌شده در دفتر همکار' : creditValue > 0 ? 'تعهد یا خریدی که مانده بدهی به همکار را افزایش داده است' : 'رویداد مالی ثبت‌شده در دفتر همکار'}
                    source={sourceLabel}
                    amount={primaryAmount > 0 ? formatCurrencyText(Math.abs(primaryAmount), readStoredCurrencyUnit()) : '—'}
                    amountLabel={amountLabel}
                    amountTone={amountTone}
                    date={formatLedgerTransactionDate(entry.transactionDate)}
                    status={status}
                    statusTone={statusTone}
                    deepLinks={sourceLinks}
                    navigationAnchorId={navigationAnchorId}
                    marker={<i className={`fa-solid ${debitValue > 0 ? 'fa-money-bill-transfer' : creditValue > 0 ? 'fa-receipt' : 'fa-scale-balanced'}`} />}
                    markerTone={amountTone}
                    isLast={timelineIndex === timelineItems.length - 1}
                    actions={(
                      <TableActionGroup
                        ariaLabel={`عملیات رکورد دفتر همکار ${entry.id}`}
                        collapseBelow="xl"
                        align="start"
                        actions={[
                          {
                            key: `partner-ledger-details-${entry.id}`,
                            kind: 'button',
                            label: expanded ? 'بستن جزئیات' : 'مشاهده جزئیات',
                            tooltip: expanded ? 'بستن جزئیات رکورد' : 'مشاهده جزئیات رکورد',
                            variant: 'secondary',
                            icon: <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-left'}`} />,
                            onClick: () => setExpandedLedgerEntryId((prev) => (prev === entry.id ? null : entry.id)),
                          },
                          {
                            key: `partner-ledger-edit-${entry.id}`,
                            kind: 'button',
                            label: 'ویرایش رکورد',
                            tooltip: 'ویرایش رکورد دفتر همکار',
                            variant: 'warning',
                            icon: <i className="fa-solid fa-pen-to-square" />,
                            onClick: () => setEditingEntry(entry),
                          },
                          {
                            key: `partner-ledger-delete-${entry.id}`,
                            kind: 'button',
                            label: 'حذف رکورد',
                            tooltip: 'حذف رکورد دفتر همکار',
                            variant: 'danger',
                            icon: <i className="fa-solid fa-trash-can" />,
                            disabled: isDeletingEntry,
                            loading: isDeletingEntry,
                            onClick: () => handleLedgerDelete(entry.id),
                          },
                        ]}
                      />
                    )}
                    badges={(
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200" dir="ltr">
                          <i className="fa-solid fa-barcode" />
                          {group.systemId}
                        </span>
                        {batchId ? <Button type="button" onClick={() => setActiveLedgerBatchId(batchId)} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-link" aria-hidden="true" />}>دسته {batchId}</Button> : null}
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          مانده بعد از رویداد: {formatCurrencyText(Math.abs(balanceValue), readStoredCurrencyUnit())}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          ثبت سیستمی: {ledgerRecordedAt(entry)}
                        </span>
                      </>
                    )}
                  >
                    {expanded ? (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
                        <div className="min-w-0 space-y-2">
                          <div className="text-xs font-black text-slate-700 dark:text-slate-200">جزئیات سند</div>
                          {details.map((line) => (
                            <div key={line} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">{line}</div>
                          ))}
                        </div>
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-black text-slate-700 dark:text-slate-200">تاریخچه دارایی مرتبط</div>
                            {relatedPurchase?.history?.length ? <span className="text-xs font-black text-slate-400">{relatedPurchase.history.length.toLocaleString('fa-IR')} تغییر</span> : null}
                          </div>
                          {relatedPurchase?.history?.length ? relatedPurchase.history.slice().reverse().slice(0, 8).map((historyItem: any, historyIndex: number) => (
                            <div key={`${group.systemId}-timeline-history-${historyIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{historyItem.title || 'رویداد ثبت‌شده'}</span>
                                <span className="text-xs font-bold text-slate-400">{formatIsoToShamsiDateTime(historyItem.changedAt, 'jYYYY/jMM/jDD HH:mm')}</span>
                              </div>
                              {historyItem.description ? <div className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{String(historyItem.description)}</div> : null}
                              {historyItem.newPurchasePrice != null ? <div className="mt-1 text-xs font-black text-slate-700 dark:text-slate-200">قیمت خرید: {formatCurrencyText(Number(historyItem.newPurchasePrice || 0), readStoredCurrencyUnit())}</div> : null}
                            </div>
                          )) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">برای این دارایی تاریخچه تغییر مستقلی ثبت نشده است.</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </FinancialTimelineEvent>
                );
              })}
            </div>
          </FinancialTimeline>
        ) : (
          <div>
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <article className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-300">
                  <i className="fa-solid fa-barcode" />
                  <span>شناسه‌های سیستم</span>
                </div>
                <strong className="mt-2 block text-lg text-slate-950 dark:text-slate-50">{groupedLedgerEntries.length.toLocaleString('fa-IR')}</strong>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">گروه‌بندی براساس محصول / گوشی</span>
              </article>
              <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <i className="fa-solid fa-receipt" />
                  <span>تراکنش‌های فیلترشده</span>
                </div>
                <strong className="mt-2 block text-lg text-slate-950 dark:text-slate-50">{Number(ledgerDirectory?.total || 0).toLocaleString('fa-IR')}</strong>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">مطابق فیلترهای فعلی در همه صفحات</span>
              </article>
              <article className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <i className="fa-solid fa-link" />
                  <span>شناسه‌های خرید مرتبط صفحه</span>
                </div>
                <strong className="mt-2 block text-lg text-slate-950 dark:text-slate-50">{purchaseHistoryBySystemId.size.toLocaleString('fa-IR')}</strong>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">فقط دارایی‌های مرتبط با صفحه جاری</span>
              </article>
            </div>
            <DataTableShell className="overflow-hidden rounded-2xl" data-ui-partner-ledger-table="true" aria-label="جدول دفتر حساب همکار">
              <table className="w-full min-w-max table-auto divide-y divide-slate-200 text-xs dark:divide-slate-800">
                <caption className="sr-only">تراکنش‌های دفتر حساب همکار</caption>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-right [&>th]:px-3 [&>th]:py-3 [&>th]:font-bold [&>th]:text-slate-600 dark:[&>th]:text-slate-200">
                    <th scope="col" className={ledgerVisibleColumns.systemId ? '' : 'hidden'}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-barcode text-violet-500" /> شناسه سیستم</span></th>
                    <th scope="col" className={ledgerVisibleColumns.createdAt ? '' : 'hidden'}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-check text-sky-500" /> تاریخ ثبت</span></th>
                    <th scope="col" className={ledgerVisibleColumns.transactionDate ? '' : 'hidden'}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-cyan-500" /> تاریخ تراکنش</span></th>
                    <th scope="col"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-align-right text-indigo-500" /> شرح</span></th>
                    <th scope="col"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-arrow-up text-rose-500" /> بدهکار</span></th>
                    <th scope="col"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-arrow-down text-emerald-500" /> بستانکار</span></th>
                    <th scope="col"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-amber-500" /> مانده</span></th>
                    <th scope="col"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {groupedLedgerEntries.map((group) => {
                    const relatedPurchase = purchaseHistoryBySystemId.get(group.systemId);
                    return (
                      <React.Fragment key={group.systemId}>
                        <tr className="bg-violet-50/80 dark:bg-violet-950/20">
                          <td colSpan={ledgerTableColumnCount} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                <div className="flex min-w-36 flex-col items-end gap-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-right text-violet-700 dark:border-violet-900/40 dark:bg-slate-950 dark:text-violet-300">
                                  <span className="text-xs font-black opacity-80">شناسه سیستم</span>
                                  <bdi className="block w-full text-right font-mono text-xs font-black leading-none" dir="ltr">{group.systemId}</bdi>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                  <i className="fa-solid fa-layer-group" /> {group.entries.length.toLocaleString('fa-IR')} تراکنش
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200">
                                  <i className="fa-solid fa-pen-to-square" /> ثبت: {ledgerRecordedAt(group.entries[group.entries.length - 1] || group.entries[0])}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span>آخرین تراکنش: {formatLedgerTransactionDate(group.entries[0]?.transactionDate || group.entries[0]?.createdAt || '')}</span>
                                {relatedPurchase ? <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-white px-2.5 py-1 dark:border-fuchsia-900/40 dark:bg-slate-950"><i className="fa-solid fa-box-archive text-fuchsia-500" /> تاریخچه خرید مرتبط موجود است</span> : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {group.entries.map((entry) => {
                          const meta = parsePartnerLedgerMeta(entry.description);
                          const recordedAt = ledgerRecordedAt(entry);
                          const systemId = group.systemId;
                          const expanded = expandedLedgerEntryId === entry.id;
                          return (
                            <React.Fragment key={entry.id}>
                              <tr className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${expanded ? 'bg-slate-50/60 dark:bg-slate-800/30' : ''}`}>
                                <td className={`${ledgerVisibleColumns.systemId ? 'px-4 py-3 whitespace-nowrap align-middle' : 'hidden'}`}>
                                  <div className="flex w-full min-w-32 flex-col items-end gap-1.5 rounded-xl border border-violet-100 bg-white px-3 py-2 text-right dark:border-violet-900/40 dark:bg-slate-950/90">
                                    <bdi className="block w-full text-right font-mono text-xs font-bold text-violet-700 dark:text-violet-300" dir="ltr">{systemId}</bdi>
                                    <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                      <i className="fa-solid fa-boxes-stacked text-violet-400" />
                                      {entry.referenceType ? String(entry.referenceType) : 'بدون مرجع'}
                                    </div>
                                  </div>
                                </td>
                                <td className={`${ledgerVisibleColumns.createdAt ? 'px-3 py-3 whitespace-nowrap align-middle text-slate-700 dark:text-slate-200' : 'hidden'}`}><span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-900/70">{recordedAt}</span></td>
                                <td className={`${ledgerVisibleColumns.transactionDate ? 'px-3 py-3 whitespace-nowrap align-middle text-slate-700 dark:text-slate-200' : 'hidden'}`}><span className="inline-flex items-center rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 font-semibold dark:border-cyan-900/30 dark:bg-cyan-950/20">{formatLedgerTransactionDate(entry.transactionDate)}</span></td>
                                <td className="px-3 py-3 align-middle">
                                  <div className="group min-w-56 max-w-sm" title={ledgerDetailLines(entry, meta).join('\n')}>
                                    <div className="flex flex-wrap items-center gap-2 justify-end">
                                      <span className="block min-w-0 whitespace-normal font-semibold leading-6 text-slate-900 dark:text-slate-100">{meta.summary}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                      {meta.imei ? <span>IMEI: {meta.imei}</span> : null}
                                      {meta.saleId ? <span>شناسه فروش: {meta.saleId}</span> : null}
                                    </div>
                                    <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">برای مشاهده اطلاعات کامل، ردیف را باز کنید.</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap align-middle"><span className="inline-flex min-w-20 justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900/30 dark:bg-rose-950/20">{formatPartnerLedgerCurrency(entry.debit, 'debit')}</span></td>
                                <td className="px-3 py-3 whitespace-nowrap align-middle"><span className="inline-flex min-w-20 justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-950/20">{formatPartnerLedgerCurrency(entry.credit, 'credit')}</span></td>
                                <td className="px-3 py-3 whitespace-nowrap align-middle"><span className="inline-flex min-w-24 justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</span></td>
                                <td className="px-3 py-3 whitespace-nowrap align-middle" dir="rtl">
                                  <TableActionGroup
                                    ariaLabel={`عملیات رکورد دفتر همکار ${entry.id}`}
                                    collapseBelow="xl"
                                    actions={[
                                      {
                                        key: `partner-ledger-details-${entry.id}`,
                                        kind: "button",
                                        label: expanded ? "بستن جزئیات" : "مشاهده جزئیات",
                                        tooltip: expanded ? "بستن جزئیات رکورد" : "مشاهده جزئیات رکورد",
                                        variant: "secondary",
                                        icon: <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />,
                                        onClick: () => setExpandedLedgerEntryId(prev => prev === entry.id ? null : entry.id),
                                      },
                                      {
                                        key: `partner-ledger-edit-${entry.id}`,
                                        kind: "button",
                                        label: "ویرایش رکورد",
                                        tooltip: "ویرایش رکورد دفتر همکار",
                                        variant: "warning",
                                        icon: <i className="fa-solid fa-pen-to-square" />,
                                        onClick: () => setEditingEntry(entry),
                                      },
                                      {
                                        key: `partner-ledger-delete-${entry.id}`,
                                        kind: "button",
                                        label: "حذف رکورد",
                                        tooltip: "حذف رکورد دفتر همکار",
                                        variant: "danger",
                                        icon: <i className="fa-solid fa-trash" />,
                                        disabled: isDeletingEntry,
                                        loading: isDeletingEntry,
                                        onClick: () => handleLedgerDelete(entry.id),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                              {expanded ? (
                                <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                  <td colSpan={ledgerTableColumnCount} className="px-4 pb-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60">
                                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <div className="flex flex-col items-end w-full">
  <div className="w-full text-right text-xs text-slate-500">
    شناسه سیستم
  </div>

  <bdi className="mt-1 block w-full text-right font-mono text-sm font-semibold text-violet-700 dark:text-violet-300" dir="ltr">{systemId}</bdi>
</div>
                                        <div><div className="text-xs text-slate-500">شرح کوتاه</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{meta.summary}</div></div>
                                        <div><div className="text-xs text-slate-500">IMEI</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{meta.imei || '—'}</div></div>
                                        <div><div className="text-xs text-slate-500">نوع</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{getLedgerSystemKind(entry) === 'phone' ? 'گوشی' : getLedgerSystemKind(entry) === 'product' ? 'محصول' : 'دیگر'}</div></div>
                                        <div><div className="text-xs text-slate-500">تاریخ ثبت</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{recordedAt}</div></div>
                                        <div><div className="text-xs text-slate-500">تاریخ تراکنش</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatLedgerTransactionDate(entry.transactionDate)}</div></div>
                                        <div><div className="text-xs text-slate-500">بدهکار</div><div className="mt-1 font-semibold text-rose-600">{formatCurrencyText(entry.debit, readStoredCurrencyUnit())}</div></div>
                                        <div><div className="text-xs text-slate-500">بستانکار</div><div className="mt-1 font-semibold text-emerald-600">{formatCurrencyText(entry.credit, readStoredCurrencyUnit())}</div></div>
                                        <div><div className="text-xs text-slate-500">مانده</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</div></div>
                                      </div>
                                      {relatedPurchase?.history?.length ? (
                                        <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/40 p-4 dark:border-fuchsia-900/30 dark:bg-fuchsia-950/10">
                                          <div className="flex items-center justify-between gap-2">
                                            <div>
                                              <div className="text-xs font-black text-fuchsia-700 dark:text-fuchsia-200">تاریخچه همین شناسه محصول</div>
                                              <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{relatedPurchase.name}</div>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{relatedPurchase.history.length.toLocaleString('fa-IR')} تغییر</div>
                                          </div>
                                          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                            {relatedPurchase.history.slice().reverse().map((h: any, idx: number) => (
                                              <div key={`${systemId}-hist-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="text-xs font-black text-slate-500 dark:text-slate-400">{h.title || 'رویداد ثبت‌شده'}</div>
                                                  <div className="text-xs text-slate-400 dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                                                </div>
                                                <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                                  {h.description ? <div>{String(h.description)}</div> : null}
                                                  {h.oldPrice != null || h.newPrice != null ? <div>قیمت قبلی: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newPrice != null ? <div>قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newPurchasePrice != null ? <div>قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPurchasePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newSalePrice != null ? <div>قیمت فروش: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newSalePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>
          </div>
        )}

        {Number(ledgerDirectory?.summary?.total || 0) > 0 ? (
          <footer className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between" aria-label="صفحه‌بندی دفتر همکار">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">تعداد در صفحه</span>
              <SelectField
                value={ledgerPageSize}
                onValueChange={setLedgerPageSize}
                ariaLabel="تعداد تراکنش دفتر همکار در هر صفحه"
                size="md"
                options={[
                  { value: '25', label: '۲۵' },
                  { value: '50', label: '۵۰' },
                  { value: '100', label: '۱۰۰' },
                ]}
              />
            </div>
            <nav className="flex items-center gap-2" aria-label="صفحه‌بندی تراکنش‌های همکار">
              <Button type="button" variant="secondary" size="md" autoIcon={false} disabled={ledgerLoading || Number(ledgerPage || 1) <= 1} onClick={() => setLedgerPage((current: number) => Math.max(1, current - 1))} aria-label="صفحه قبل" leftIcon={<i className="fa-solid fa-chevron-right" />} />
              <span className="min-w-28 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                صفحه {Number(ledgerDirectory?.page || ledgerPage || 1).toLocaleString('fa-IR')} از {Number(ledgerDirectory?.totalPages || 1).toLocaleString('fa-IR')}
              </span>
              <Button type="button" variant="secondary" size="md" autoIcon={false} disabled={ledgerLoading || Number(ledgerPage || 1) >= Number(ledgerDirectory?.totalPages || 1)} onClick={() => setLedgerPage((current: number) => Math.min(Number(ledgerDirectory?.totalPages || 1), current + 1))} aria-label="صفحه بعد" leftIcon={<i className="fa-solid fa-chevron-left" />} />
            </nav>
            <span>
              نمایش {Number(ledgerDirectory?.total || 0) ? (((Number(ledgerDirectory?.page || 1) - 1) * Number(ledgerDirectory?.pageSize || ledgerPageSize)) + 1).toLocaleString('fa-IR') : '۰'} تا {Math.min(Number(ledgerDirectory?.total || 0), Number(ledgerDirectory?.page || 1) * Number(ledgerDirectory?.pageSize || ledgerPageSize)).toLocaleString('fa-IR')} از {Number(ledgerDirectory?.total || 0).toLocaleString('fa-IR')} رکورد
            </span>
          </footer>
        ) : null}
        {ledgerLoading ? <div className="mt-3 text-center text-xs font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin me-2" />در حال به‌روزرسانی دفتر…</div> : null}
      </section>
    </>
  );
};

export default PartnerLedgerWorkspaceSection;
