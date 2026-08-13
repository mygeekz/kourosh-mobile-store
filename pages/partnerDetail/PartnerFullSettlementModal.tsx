import { TextareaField, SelectField } from '@/components/ui';
import React from 'react';
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
    amount,
    applyBulkSettlementNoteTemplate,
    balance,
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
    entry,
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
    id,
    identifier,
    isFullPhoneSettlementModalOpen,
    isSubmittingBulkSettlement,
    isSubmittingFullSettlementPhoneId,
    item,
    lastBulkSettlementNote,
    lastSubmittedBulkSettlementBatchId,
    name,
    note,
    num,
    openSoldPhoneSettlementRows,
    phone,
    phoneId,
    phoneSettlementBalance,
    phoneSettlementPaidAmount,
    readStoredCurrencyUnit,
    rows,
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
    settlementPurchasePrice,
    target,
    text,
    tone,
    value,
  } = ctx;

  return (
    <>
{/* Full partner phone settlement desk */}
      {isFullPhoneSettlementModalOpen && (
        <Modal title="نمای تسویه کامل همکار" onClose={() => setIsFullPhoneSettlementModalOpen(false)} widthClass="max-w-6xl" iconClass="fa-solid fa-layer-group" tone="info" variant="expansive" layout="split" bodyClassName="partner-full-settlement-modal-body">
          <div className="partner-settlement-desk space-y-4 p-1" dir="rtl">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/55">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <i className="fa-solid fa-mobile-screen-button text-slate-400" /> فقط گوشی‌های سرمایه باز
                  </div>
                  <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-slate-50">تسویه سریع و گروهی گوشی‌های فروخته‌شده</h3>
                  <p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    این نما فقط آیتم‌های باز را نشان می‌دهد. پرداخت کامل، پرداخت بخشی و تسویه گروهی همگی به گوشی مشخص وصل می‌شوند و هم‌زمان از مانده کل همکار کم می‌کنند.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 lg:w-[480px] lg:grid-cols-4">
                  {[
                    { label: 'گوشی باز', value: `${Number(fullPhoneSettlementTotal || 0).toLocaleString('fa-IR')}` },
                    { label: 'مانده کل باز', value: `${fullSettlementOpenBalanceTotal.toLocaleString('fa-IR')}` },
                    { label: 'مبنای سرمایه', value: `${fullSettlementOpenBasisTotal.toLocaleString('fa-IR')}` },
                    { label: 'سرمایه بازگشتی', value: `${fullSettlementOpenPaidTotal.toLocaleString('fa-IR')}` },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-slate-950/75">
                      <div className="text-[10px] font-black text-slate-400">{metric.label}</div>
                      <div className="mt-1 truncate text-[11px] font-black text-slate-950 dark:text-slate-50">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-check-double" /> تسویه گروهی
                  </div>
                  <p className="mt-2 max-w-2xl text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    چند گوشی را انتخاب کن، مبلغ کلی را وارد کن، سپس سیستم مبلغ را طبق اولویت انتخاب‌شده بین ردیف‌ها پخش می‌کند.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px] sm:grid-cols-4">
                  {[
                    { label: 'انتخاب‌شده', value: `${selectedBulkSettlementRows.length.toLocaleString('fa-IR')} گوشی` },
                    { label: 'مانده انتخاب', value: `${selectedBulkSettlementBalanceTotal.toLocaleString('fa-IR')}` },
                    { label: 'مبلغ قابل ثبت', value: `${bulkSettlementAppliedTotal.toLocaleString('fa-IR')}` },
                    { label: 'مازاد', value: `${bulkSettlementUnallocatedAmount.toLocaleString('fa-IR')}` },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/75">
                      <div className="text-[10px] font-black text-slate-400">{metric.label}</div>
                      <div className="mt-1 truncate text-[11px] font-black text-slate-950 dark:text-slate-50">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
                  <div className="mb-1 flex flex-wrap items-center gap-2 justify-end rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:col-span-4">
                  <i className="fa-solid fa-link" />
                  شناسه دسته این عملیات:
                  <span className="font-mono text-slate-900 dark:text-slate-50" dir="ltr">{bulkSettlementBatchId}</span>
                </div>
                {lastSubmittedBulkSettlementBatchId && (
                  <div className="mb-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 sm:col-span-4">
                    آخرین دسته ثبت‌شده: <button type="button" className="font-mono underline" dir="ltr" onClick={() => setActiveLedgerBatchId(lastSubmittedBulkSettlementBatchId)}>{lastSubmittedBulkSettlementBatchId}</button>
                  </div>
                )}
                <label className="sr-only" htmlFor="bulkSettlementPriority">اولویت پخش مبلغ</label>
                  <SelectField controlOnly unstyled showChevron={false}
                    id="bulkSettlementPriority"
                    name="bulkSettlementPriority"
                    value={bulkSettlementPriority}
                    onChange={(e) => setBulkSettlementPriority(e.target.value as 'highest_balance' | 'oldest_sale' | 'lowest_balance')}
                    disabled={isSubmittingBulkSettlement}
                    className="h-[34px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition     disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                  >
                    <option value="highest_balance">اولویت: بیشترین مانده</option>
                    <option value="oldest_sale">اولویت: قدیمی‌ترین فروش</option>
                    <option value="lowest_balance">اولویت: کمترین مانده</option>
                  </SelectField>
                  <PriceInput
                    id="bulkSettlementAmount"
                    name="bulkSettlementAmount"
                    value={bulkSettlementAmount}
                    onChange={(e: any) => handleBulkSettlementAmountChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold text-slate-800 outline-none transition     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                    preview="مبلغ کلی برای پخش بین گوشی‌ها"
                  />
                  <button
                    type="button"
                    onClick={() => setBulkSettlementAmount(String(selectedBulkSettlementBalanceTotal))}
                    disabled={selectedBulkSettlementBalanceTotal <= 0 || isSubmittingBulkSettlement}
                    className="inline-flex h-[34px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    کل مانده انتخاب
                  </button>
                  <Button
                    type="button"
                    onClick={handleBulkSettlementSubmit}
                    disabled={isSubmittingBulkSettlement || selectedBulkSettlementRows.length === 0 || bulkSettlementAmountValue <= 0}
                    variant="primary"
                    size="sm"
                    className="!h-[34px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                    leftIcon={<i className="fa-solid fa-check-double" />}
                  >
                    {isSubmittingBulkSettlement ? 'در حال ثبت…' : 'ثبت تسویه گروهی'}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button type="button" onClick={handleBulkSettlementSelectAll} disabled={isSubmittingBulkSettlement} className="inline-flex h-[32px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    انتخاب این صفحه
                  </button>
                  <button type="button" onClick={handleBulkSettlementClear} disabled={isSubmittingBulkSettlement} className="inline-flex h-[32px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    پاک‌کردن انتخاب
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">انتخاب‌ها هنگام جابه‌جایی بین صفحه‌ها حفظ می‌شوند؛ «انتخاب این صفحه» فقط ردیف‌های همین صفحه را اضافه می‌کند.</div>

              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <label htmlFor="bulkSettlementNote" className="text-[11px] font-black text-slate-600 dark:text-slate-200">توضیح مشترک تسویه گروهی</label>
                    <p className="mt-1 text-[10px] font-bold leading-5 text-slate-400 dark:text-slate-500">این متن روی همه پرداخت‌های پخش‌شده ثبت می‌شود؛ می‌توانی از متن‌های آماده استفاده کنی و بعد ویرایشش کنی.</p>
                  </div>
                  {bulkSettlementNote.trim() && (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:bg-slate-950/80 dark:text-slate-300">
                      <i className="fa-solid fa-note-sticky" />
                      توضیح روی همه ردیف‌ها ثبت می‌شود
                    </span>
                  )}
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white p-2.5 dark:border-slate-700/70 dark:bg-slate-950/70">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-300">
                      <i className="fa-solid fa-wand-magic-sparkles" /> متن آماده برای ثبت سریع
                    </span>
                    {bulkSettlementNote.trim() && (
                      <button
                        type="button"
                        onClick={() => setBulkSettlementNote('')}
                        disabled={isSubmittingBulkSettlement}
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <i className="fa-solid fa-xmark" /> پاک‌کردن توضیح
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bulkSettlementNoteTemplates.map((template) => {
                      const isActive = bulkSettlementNote.includes(template.text.trim());
                      return (
                        <button
                          key={template.label}
                          type="button"
                          onClick={() => applyBulkSettlementNoteTemplate(template.text)}
                          disabled={isSubmittingBulkSettlement}
                          className={`inline-flex h-[30px] items-center gap-2 rounded-full border px-3 text-[10px] font-black transition disabled:opacity-50 ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <i className={`fa-solid ${template.icon}`} />
                          {template.label}
                        </button>
                      );
                    })}
                    {lastBulkSettlementNote.trim() && (
                      <button
                        type="button"
                        onClick={() => applyBulkSettlementNoteTemplate(lastBulkSettlementNote)}
                        disabled={isSubmittingBulkSettlement}
                        title={lastBulkSettlementNote}
                        className={`inline-flex h-[30px] max-w-full items-center gap-2 rounded-full border px-3 text-[10px] font-black transition disabled:opacity-50 ${bulkSettlementNote.includes(lastBulkSettlementNote.trim()) ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-white dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70'}`}
                      >
                        <i className="fa-solid fa-clock-rotate-left" />
                        <span className="shrink-0">آخرین توضیح</span>
                        <span className="max-w-[220px] truncate text-right font-bold opacity-80">{lastBulkSettlementNote}</span>
                      </button>
                    )}
                  </div>
                  {lastBulkSettlementNote.trim() && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                      <span className="inline-flex items-center gap-2">
                        <i className="fa-solid fa-circle-info" />
                        آخرین توضیح استفاده‌شده در همین مرورگر ذخیره شده و با یک کلیک قابل استفاده است.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLastBulkSettlementNote('');
                          try { window.localStorage.removeItem(BULK_SETTLEMENT_LAST_NOTE_KEY); } catch {}
                        }}
                        disabled={isSubmittingBulkSettlement}
                        className="rounded-full px-2 py-1 font-black text-blue-500 transition hover:bg-white hover:text-blue-800 disabled:opacity-50 dark:hover:bg-blue-950"
                      >
                        حذف پیشنهاد
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] font-bold leading-5 text-slate-400 dark:text-slate-500">چیپ‌ها فقط متن را سریع پر می‌کنند؛ متن نهایی قبل از ثبت کاملاً قابل ویرایش است.</p>
                </div>
                <TextareaField controlOnly
                  id="bulkSettlementNote"
                  name="bulkSettlementNote"
                  value={bulkSettlementNote}
                  onChange={(e) => setBulkSettlementNote(e.target.value)}
                  disabled={isSubmittingBulkSettlement}
                  rows={2}
                  maxLength={280}
                  placeholder="مثلاً: واریز کارت‌به‌کارت بابت تسویه بخشی گوشی‌های فروخته‌شده / شماره پیگیری ..."
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-6 text-slate-800 outline-none transition placeholder:text-slate-300    disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-600  "
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400">
                  <span>اختیاری است، اما برای پیگیری پرداخت‌های گروهی خیلی مفید است.</span>
                  <span>{bulkSettlementNote.length.toLocaleString('fa-IR')} / ۲۸۰</span>
                </div>
              </div>

              {bulkSettlementDistribution.length > 0 && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black text-slate-400">
                    <span>پیش‌نمایش پخش مبلغ بر اساس {bulkSettlementPriority === 'oldest_sale' ? 'قدیمی‌ترین فروش' : bulkSettlementPriority === 'lowest_balance' ? 'کمترین مانده' : 'بیشترین مانده'}</span>
                    <span>{bulkSettlementDistribution.length.toLocaleString('fa-IR')} ردیف</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {bulkSettlementDistribution.slice(0, 6).map((entry: any) => (
                      <div key={`bulk-preview-${entry.item.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[11px] font-bold shadow-sm dark:bg-slate-950/80">
                        <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{entry.item.name || 'گوشی فروخته‌شده'}</span>
                        <span className="shrink-0 text-slate-950 dark:text-slate-50">{formatCurrencyText(Number(entry.amount || 0), readStoredCurrencyUnit())}</span>
                      </div>
                    ))}
                  </div>
                  {bulkSettlementDistribution.length > 6 && (
                    <p className="mt-2 text-[10px] font-bold text-slate-400">و {(bulkSettlementDistribution.length - 6).toLocaleString('fa-IR')} گوشی دیگر در همین ثبت گروهی پوشش داده می‌شود.</p>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {fullPhoneSettlementLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-400" role="status">
                  <i className="fa-solid fa-spinner fa-spin ml-2" /> در حال دریافت گوشی‌های باز این صفحه…
                </div>
              )}
              {Number(fullPhoneSettlementTotal || 0) === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-[13px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-400">
                  هیچ گوشی سرمایه باز‌ای برای این همکار وجود ندارد.
                </div>
              ) : openSoldPhoneSettlementRows.map((item: any) => {
                const phoneId = Number(item.id);
                const balance = Number(item.phoneSettlementBalance || 0);
                const isSelected = bulkSettlementIdSet.has(phoneId);
                const isSubmittingRow = isSubmittingFullSettlementPhoneId === phoneId;
                return (
                  <div key={`full-settlement-${phoneId}`} className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setBulkSettlementPhoneIds(prev => prev.includes(phoneId) ? prev.filter((id) => id !== phoneId) : [...prev, phoneId])}
                          disabled={isSubmittingBulkSettlement || isSubmittingRow}
                          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[12px] transition disabled:opacity-50 ${isSelected ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-100'}`}
                          title="انتخاب برای تسویه گروهی"
                        >
                          <i className={isSelected ? 'fa-solid fa-check' : 'fa-solid fa-plus'} />
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="font-mono" dir="ltr">{item.identifier || 'IMEI ثبت نشده'}</span>
                            <span>•</span>
                            <span>{item.soldAt ? formatIsoToShamsi(item.soldAt) : 'بدون تاریخ فروش'}</span>
                            <span>•</span>
                            <span>{item.settlementPriceSourceLabel || 'قیمت خرید روز'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-black sm:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">مبنای سرمایه</div>
                          <div className="mt-1 text-slate-950 dark:text-slate-50">{Number(item.settlementPurchasePrice || 0).toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">سرمایه بازگشتی</div>
                          <div className="mt-1 text-emerald-700 dark:text-emerald-300">{Number(item.phoneSettlementPaidAmount || 0).toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">مانده</div>
                          <div className="mt-1 text-rose-700 dark:text-rose-300">{balance.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">تعداد پرداخت</div>
                          <div className="mt-1 text-slate-950 dark:text-slate-50">{Number(item.phoneSettlementPaymentCount || 0).toLocaleString('fa-IR')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <PriceInput
                        id={`fullSettlementAmount-${phoneId}`}
                        name={`fullSettlementAmount-${phoneId}`}
                        value={fullSettlementAmounts[phoneId] || ''}
                        onChange={(e: any) => setFullSettlementAmounts(prev => ({ ...prev, [phoneId]: String(num(e.target.value) || '') }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none transition     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                        preview="پرداخت بخشی همین گوشی"
                      />
                      <Button
                        type="button"
                        onClick={() => handleFullSettlementPhoneSubmit(item, balance)}
                        disabled={isSubmittingRow || isSubmittingBulkSettlement || balance <= 0}
                        variant="primary"
                        size="sm"
                        className="!min-h-[40px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                        leftIcon={<i className="fa-solid fa-circle-check" />}
                      >
                        {isSubmittingRow ? 'در حال ثبت…' : 'تسویه کامل'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleFullSettlementPhoneSubmit(item)}
                        disabled={isSubmittingRow || isSubmittingBulkSettlement || num(fullSettlementAmounts[phoneId]) <= 0}
                        variant="secondary"
                        size="sm"
                        className="!min-h-[40px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                        leftIcon={<i className="fa-solid fa-money-bill-transfer" />}
                      >
                        ثبت مبلغ بخشی
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {Number(fullPhoneSettlementTotal || 0) > 0 && (
              <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/75">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  صفحه {Number(fullPhoneSettlementPage || 1).toLocaleString('fa-IR')} از {Number(fullPhoneSettlementTotalPages || 1).toLocaleString('fa-IR')} · {Number(fullPhoneSettlementTotal || 0).toLocaleString('fa-IR')} گوشی باز
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    تعداد در صفحه
                    <SelectField controlOnly value={String(fullPhoneSettlementPageSize)} onChange={(event) => setFullPhoneSettlementPageSize(event.target.value as '25' | '50' | '100')} className="min-w-[82px]">
                      <option value="25">۲۵</option>
                      <option value="50">۵۰</option>
                      <option value="100">۱۰۰</option>
                    </SelectField>
                  </label>
                  <button type="button" disabled={fullPhoneSettlementLoading || Number(fullPhoneSettlementPage || 1) <= 1} onClick={() => setFullPhoneSettlementPage((page: number) => Math.max(1, page - 1))} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <i className="fa-solid fa-chevron-right" /> قبلی
                  </button>
                  <button type="button" disabled={fullPhoneSettlementLoading || Number(fullPhoneSettlementPage || 1) >= Number(fullPhoneSettlementTotalPages || 1)} onClick={() => setFullPhoneSettlementPage((page: number) => Math.min(Number(fullPhoneSettlementTotalPages || 1), page + 1))} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    بعدی <i className="fa-solid fa-chevron-left" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default PartnerFullSettlementModal;
