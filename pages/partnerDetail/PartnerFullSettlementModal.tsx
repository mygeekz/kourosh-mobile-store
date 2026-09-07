import React from 'react';
import { SelectField, TextareaField } from '@/components/ui';
import type { SettlementNoteTemplate } from '../viewBoundaryTypes';

export type PartnerFullSettlementModalContext = Record<string, any> & {
  bulkSettlementNoteTemplates: SettlementNoteTemplate[];
  setBulkSettlementPhoneIds: React.Dispatch<React.SetStateAction<number[]>>;
  setFullSettlementAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
};

type Props = {
  ctx: PartnerFullSettlementModalContext;
};

const PartnerFullSettlementModal: React.FC<Props> = ({ ctx }) => {
  const {
    BULK_SETTLEMENT_LAST_NOTE_KEY,
    Button,
    Modal,
    PriceInput,
    applyBulkSettlementNoteTemplate,
    bulkSettlementAmount,
    bulkSettlementAmountValue,
    bulkSettlementAppliedTotal,
    bulkSettlementBatchId,
    bulkSettlementDistribution,
    bulkSettlementIdSet,
    bulkSettlementNote,
    bulkSettlementNoteTemplates,
    bulkSettlementPriority,
    bulkSettlementUnallocatedAmount,
    formatCurrencyText,
    formatIsoToShamsi,
    fullSettlementAmounts,
    fullPhoneSettlementLoading,
    fullPhoneSettlementPage,
    fullPhoneSettlementPageSize,
    fullPhoneSettlementTotal,
    fullPhoneSettlementTotalPages,
    fullSettlementOpenBalanceTotal,
    fullSettlementOpenBasisTotal,
    fullSettlementOpenPaidTotal,
    handleBulkSettlementAmountChange,
    handleBulkSettlementClear,
    handleBulkSettlementSelectAll,
    handleBulkSettlementSubmit,
    handleFullSettlementPhoneSubmit,
    isFullPhoneSettlementModalOpen,
    isSubmittingBulkSettlement,
    isSubmittingFullSettlementPhoneId,
    lastBulkSettlementNote,
    lastSubmittedBulkSettlementBatchId,
    num,
    openSoldPhoneSettlementRows,
    readStoredCurrencyUnit,
    selectedBulkSettlementBalanceTotal,
    selectedBulkSettlementRows,
    setActiveLedgerBatchId,
    setBulkSettlementAmount,
    setBulkSettlementNote,
    setBulkSettlementPhoneIds,
    setBulkSettlementPriority,
    setFullPhoneSettlementPage,
    setFullPhoneSettlementPageSize,
    setFullSettlementAmounts,
    setIsFullPhoneSettlementModalOpen,
    setLastBulkSettlementNote,
  } = ctx;

  if (!isFullPhoneSettlementModalOpen) return null;

  const overviewMetrics = [
    { label: 'گوشی باز', value: Number(fullPhoneSettlementTotal || 0).toLocaleString('fa-IR') },
    { label: 'مانده کل باز', value: Number(fullSettlementOpenBalanceTotal || 0).toLocaleString('fa-IR') },
    { label: 'مبنای سرمایه', value: Number(fullSettlementOpenBasisTotal || 0).toLocaleString('fa-IR') },
    { label: 'سرمایه بازگشتی', value: Number(fullSettlementOpenPaidTotal || 0).toLocaleString('fa-IR') },
  ];

  const selectionMetrics = [
    { label: 'انتخاب‌شده', value: `${selectedBulkSettlementRows.length.toLocaleString('fa-IR')} گوشی` },
    { label: 'مانده انتخاب', value: Number(selectedBulkSettlementBalanceTotal || 0).toLocaleString('fa-IR') },
    { label: 'مبلغ قابل ثبت', value: Number(bulkSettlementAppliedTotal || 0).toLocaleString('fa-IR') },
    { label: 'مازاد', value: Number(bulkSettlementUnallocatedAmount || 0).toLocaleString('fa-IR') },
  ];

  return (
    <Modal
      title="تسویه همکار"
      onClose={() => setIsFullPhoneSettlementModalOpen(false)}
      widthClass="max-w-6xl"
      iconClass="fa-solid fa-layer-group"
      tone="info"
      variant="operational"
    >
      <div className="space-y-4" dir="rtl">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60" aria-labelledby="partner-full-settlement-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
                گوشی‌های دارای سرمایه باز
              </div>
              <h2 id="partner-full-settlement-title" className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
                تسویه تکی یا گروهی گوشی‌های فروخته‌شده
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                هر پرداخت به گوشی مربوط متصل می‌شود و مانده کل همکار را هم‌زمان به‌روزرسانی می‌کند.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
              {overviewMetrics.map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" aria-labelledby="bulk-settlement-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 id="bulk-settlement-title" className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                <i className="fa-solid fa-check-double text-blue-600" aria-hidden="true" />
                تسویه گروهی
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                گوشی‌ها را انتخاب کنید و مبلغ را بر اساس اولویت میان آن‌ها پخش کنید.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {selectionMetrics.map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.4fr)_auto_auto]">
              <SelectField
                id="bulkSettlementPriority"
                name="bulkSettlementPriority"
                value={bulkSettlementPriority}
                onChange={(event) => setBulkSettlementPriority(event.target.value as 'highest_balance' | 'oldest_sale' | 'lowest_balance')}
                disabled={isSubmittingBulkSettlement}
                aria-label="اولویت پخش مبلغ"
                size="md"
              >
                <option value="highest_balance">اولویت: بیشترین مانده</option>
                <option value="oldest_sale">اولویت: قدیمی‌ترین فروش</option>
                <option value="lowest_balance">اولویت: کمترین مانده</option>
              </SelectField>
              <PriceInput
                id="bulkSettlementAmount"
                name="bulkSettlementAmount"
                value={bulkSettlementAmount}
                onChange={(event: any) => handleBulkSettlementAmountChange(event.target.value)}
                preview="مبلغ کلی تسویه"
              />
              <Button
                type="button"
                onClick={() => setBulkSettlementAmount(String(selectedBulkSettlementBalanceTotal))}
                disabled={selectedBulkSettlementBalanceTotal <= 0 || isSubmittingBulkSettlement}
                variant="secondary"
                size="md"
              >
                کل مانده انتخاب
              </Button>
              <Button
                type="button"
                onClick={handleBulkSettlementSubmit}
                disabled={isSubmittingBulkSettlement || selectedBulkSettlementRows.length === 0 || bulkSettlementAmountValue <= 0}
                loading={isSubmittingBulkSettlement}
                loadingText="در حال ثبت تسویه…"
                variant="primary"
                size="md"
                leftIcon={<i className="fa-solid fa-check-double" aria-hidden="true" />}
              >
                ثبت تسویه گروهی
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleBulkSettlementSelectAll} disabled={isSubmittingBulkSettlement} variant="secondary" size="md">
                انتخاب این صفحه
              </Button>
              <Button type="button" onClick={handleBulkSettlementClear} disabled={isSubmittingBulkSettlement} variant="ghost" size="md">
                پاک‌کردن انتخاب
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-900">
              شناسه دسته: <bdi dir="ltr" className="font-mono text-slate-800 dark:text-slate-200">{bulkSettlementBatchId}</bdi>
            </span>
            {lastSubmittedBulkSettlementBatchId ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveLedgerBatchId(lastSubmittedBulkSettlementBatchId)}>
                مشاهده آخرین دسته ثبت‌شده
              </Button>
            ) : null}
          </div>

          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <summary className="min-h-11 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              توضیح و متن‌های آماده تسویه
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2" aria-label="متن‌های آماده">
                {bulkSettlementNoteTemplates.map((template) => {
                  const isActive = bulkSettlementNote.includes(template.text.trim());
                  return (
                    <Button
                      key={template.label}
                      type="button"
                      onClick={() => applyBulkSettlementNoteTemplate(template.text)}
                      disabled={isSubmittingBulkSettlement}
                      variant={isActive ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={isActive}
                      leftIcon={<i className={`fa-solid ${template.icon}`} aria-hidden="true" />}
                    >
                      {template.label}
                    </Button>
                  );
                })}
                {lastBulkSettlementNote.trim() ? (
                  <Button
                    type="button"
                    onClick={() => applyBulkSettlementNoteTemplate(lastBulkSettlementNote)}
                    disabled={isSubmittingBulkSettlement}
                    variant="secondary"
                    size="sm"
                    title={lastBulkSettlementNote}
                  >
                    آخرین توضیح
                  </Button>
                ) : null}
                {bulkSettlementNote.trim() ? (
                  <Button type="button" onClick={() => setBulkSettlementNote('')} disabled={isSubmittingBulkSettlement} variant="ghost" size="sm">
                    پاک‌کردن توضیح
                  </Button>
                ) : null}
                {lastBulkSettlementNote.trim() ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setLastBulkSettlementNote('');
                      try { window.localStorage.removeItem(BULK_SETTLEMENT_LAST_NOTE_KEY); } catch {}
                    }}
                    disabled={isSubmittingBulkSettlement}
                    variant="ghost"
                    size="sm"
                  >
                    حذف پیشنهاد ذخیره‌شده
                  </Button>
                ) : null}
              </div>
              <TextareaField
                id="bulkSettlementNote"
                name="bulkSettlementNote"
                value={bulkSettlementNote}
                onChange={(event) => setBulkSettlementNote(event.target.value)}
                disabled={isSubmittingBulkSettlement}
                rows={2}
                maxLength={280}
                label="توضیح مشترک تسویه گروهی"
                hint={`${bulkSettlementNote.length.toLocaleString('fa-IR')} از ۲۸۰ نویسه`}
                placeholder="مثلاً: واریز کارت‌به‌کارت بابت تسویه بخشی"
              />
            </div>
          </details>

          {bulkSettlementDistribution.length > 0 ? (
            <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <summary className="min-h-11 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                پیش‌نمایش پخش مبلغ ({bulkSettlementDistribution.length.toLocaleString('fa-IR')} ردیف)
              </summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {bulkSettlementDistribution.slice(0, 6).map((distributionEntry: any) => (
                  <div key={`bulk-preview-${distributionEntry.item.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                    <span className="min-w-0 break-words text-slate-600 dark:text-slate-300">{distributionEntry.item.name || 'گوشی فروخته‌شده'}</span>
                    <span className="shrink-0 font-bold text-slate-950 dark:text-white">
                      {formatCurrencyText(Number(distributionEntry.amount || 0), readStoredCurrencyUnit())}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" aria-labelledby="open-capital-phones-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 id="open-capital-phones-title" className="text-base font-bold text-slate-950 dark:text-white">گوشی‌های سرمایه باز</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">انتخاب‌ها بین صفحه‌ها حفظ می‌شوند.</span>
          </div>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
            {fullPhoneSettlementLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" role="status">
                <i className="fa-solid fa-spinner fa-spin me-2" aria-hidden="true" />
                در حال دریافت گوشی‌های باز…
              </div>
            ) : null}

            {Number(fullPhoneSettlementTotal || 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                هیچ گوشی دارای سرمایه باز برای این همکار وجود ندارد.
              </div>
            ) : openSoldPhoneSettlementRows.map((item: any) => {
              const phoneId = Number(item.id);
              const balance = Number(item.phoneSettlementBalance || 0);
              const isSelected = bulkSettlementIdSet.has(phoneId);
              const isSubmittingRow = isSubmittingFullSettlementPhoneId === phoneId;

              return (
                <article key={`full-settlement-${phoneId}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="grid gap-3 xl:grid-cols-[minmax(12rem,1.3fr)_minmax(24rem,2fr)] xl:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Button
                        type="button"
                        onClick={() => setBulkSettlementPhoneIds((previous) => previous.includes(phoneId) ? previous.filter((id) => id !== phoneId) : [...previous, phoneId])}
                        disabled={isSubmittingBulkSettlement || isSubmittingRow}
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="icon"
                        aria-label={isSelected ? 'حذف از تسویه گروهی' : 'افزودن به تسویه گروهی'}
                        aria-pressed={isSelected}
                      >
                        <i className={isSelected ? 'fa-solid fa-check' : 'fa-solid fa-plus'} aria-hidden="true" />
                      </Button>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-bold text-slate-950 dark:text-white">{item.name || 'گوشی فروخته‌شده'}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <bdi dir="ltr" className="font-mono">{item.identifier || 'IMEI ثبت نشده'}</bdi>
                          <span aria-hidden="true">•</span>
                          <span>{item.soldAt ? formatIsoToShamsi(item.soldAt) : 'بدون تاریخ فروش'}</span>
                          <span aria-hidden="true">•</span>
                          <span>{item.settlementPriceSourceLabel || 'قیمت خرید روز'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'مبنای سرمایه', value: Number(item.settlementPurchasePrice || 0), tone: 'text-slate-950 dark:text-white' },
                        { label: 'سرمایه بازگشتی', value: Number(item.phoneSettlementPaidAmount || 0), tone: 'text-emerald-700 dark:text-emerald-300' },
                        { label: 'مانده', value: balance, tone: 'text-rose-700 dark:text-rose-300' },
                        { label: 'تعداد پرداخت', value: Number(item.phoneSettlementPaymentCount || 0), tone: 'text-slate-950 dark:text-white' },
                      ].map((metric) => (
                        <div key={metric.label} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
                          <p className={`mt-1 break-words text-sm font-bold ${metric.tone}`}>{metric.value.toLocaleString('fa-IR')}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <PriceInput
                      id={`fullSettlementAmount-${phoneId}`}
                      name={`fullSettlementAmount-${phoneId}`}
                      value={fullSettlementAmounts[phoneId] || ''}
                      onChange={(event: any) => setFullSettlementAmounts((previous) => ({ ...previous, [phoneId]: String(num(event.target.value) || '') }))}
                      preview="پرداخت بخشی همین گوشی"
                    />
                    <Button
                      type="button"
                      onClick={() => handleFullSettlementPhoneSubmit(item, balance)}
                      disabled={isSubmittingRow || isSubmittingBulkSettlement || balance <= 0}
                      loading={isSubmittingRow}
                      variant="primary"
                      size="md"
                    >
                      تسویه کامل
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleFullSettlementPhoneSubmit(item)}
                      disabled={isSubmittingRow || isSubmittingBulkSettlement || num(fullSettlementAmounts[phoneId]) <= 0}
                      variant="secondary"
                      size="md"
                    >
                      ثبت مبلغ بخشی
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {Number(fullPhoneSettlementTotal || 0) > 0 ? (
            <footer className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                صفحه {Number(fullPhoneSettlementPage || 1).toLocaleString('fa-IR')} از {Number(fullPhoneSettlementTotalPages || 1).toLocaleString('fa-IR')} · {Number(fullPhoneSettlementTotal || 0).toLocaleString('fa-IR')} گوشی باز
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  value={String(fullPhoneSettlementPageSize)}
                  onChange={(event) => setFullPhoneSettlementPageSize(event.target.value as '25' | '50' | '100')}
                  aria-label="تعداد گوشی در صفحه"
                  size="md"
                >
                  <option value="25">۲۵ در صفحه</option>
                  <option value="50">۵۰ در صفحه</option>
                  <option value="100">۱۰۰ در صفحه</option>
                </SelectField>
                <Button
                  type="button"
                  disabled={fullPhoneSettlementLoading || Number(fullPhoneSettlementPage || 1) <= 1}
                  onClick={() => setFullPhoneSettlementPage((page: number) => Math.max(1, page - 1))}
                  variant="secondary"
                  size="md"
                >
                  قبلی
                </Button>
                <Button
                  type="button"
                  disabled={fullPhoneSettlementLoading || Number(fullPhoneSettlementPage || 1) >= Number(fullPhoneSettlementTotalPages || 1)}
                  onClick={() => setFullPhoneSettlementPage((page: number) => Math.min(Number(fullPhoneSettlementTotalPages || 1), page + 1))}
                  variant="secondary"
                  size="md"
                >
                  بعدی
                </Button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>
    </Modal>
  );
};

export default PartnerFullSettlementModal;
