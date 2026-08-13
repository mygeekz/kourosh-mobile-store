import { TextareaField } from '@/components/ui';
import { IconGlyph } from '@/components/ui';
import React from 'react';
import type { PriceInputChangeEvent } from '../viewBoundaryTypes';

type Props = {
  ctx: Record<string, any>;
};

const CustomerLedgerEntryEditModal: React.FC<Props> = ({ ctx }) => {
  const {
    Modal,
    PriceInput,
    ShamsiDatePicker,
    balanceDirectionLabel,
    balanceValueText,
    credit,
    d,
    debit,
    editingEntry,
    editingEntryAmountText,
    editingEntryKind,
    editingEntryKindLabel,
    editingEntryKindTone,
    editingEntrySourceTarget,
    handleLedgerEdit,
    id,
    inputClass,
    ledger,
    name,
    navigate,
    note,
    rows,
    setEditingEntry,
    token,
    value,
  } = ctx;

  return (
    <>
{/* مودال ویرایش اطلاعات رکورد دفتر */}
      {editingEntry && (
        <Modal
          title="ویرایش رکورد دفتر مشتری"
          onClose={() => setEditingEntry(null)}
          widthClass="max-w-4xl"
          wrapperClassName="customer-ledger-edit-modal-center"
          iconClass="fa-solid fa-pen-to-square"
          variant="operational"
          layout="split"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLedgerEdit();
            }}
            className="space-y-3 p-1"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">مانده فعلی مشتری</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{balanceValueText}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">{balanceDirectionLabel}</div>
                  </div>
                  <IconGlyph tone="neutral" className="h-7 w-7" aria-hidden="true"><i className="fa-regular fa-user" /></IconGlyph>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">مبلغ رکورد</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{editingEntryAmountText}</div>
                  </div>
                  <IconGlyph tone="success" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-wallet" /></IconGlyph>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">نوع اثر مالی</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${editingEntryKindTone}`}>
                        <i className={`fa-solid ${editingEntryKind === 'credit' ? 'fa-arrow-down' : editingEntryKind === 'debit' ? 'fa-arrow-up' : 'fa-scale-balanced'}`} />
                        {editingEntryKindLabel}
                      </span>
                    </div>
                  </div>
                  <IconGlyph tone="danger" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-arrow-right-arrow-left" /></IconGlyph>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">شناسه رکورد</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">#{Number(editingEntry.id || 0).toLocaleString('fa-IR')}</div>
                  </div>
                  <IconGlyph tone="info" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-hashtag" /></IconGlyph>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
              <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200">شرح رکورد</label>
                    <i className="fa-regular fa-note-sticky text-blue-500" />
                  </div>
                  <TextareaField controlOnly
                    rows={3}
                    className={inputClass(false, true)}
                    value={editingEntry.description || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    placeholder="شرح رکورد دفتر حساب"
                  />
                  <div className="text-left text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    {String(editingEntry.description || '').length.toLocaleString('fa-IR')}/300
                  </div>
                </div>

                <div className="space-y-2.5 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200">ریشه تراکنش</label>
                    <i className="fa-solid fa-link text-blue-500" />
                  </div>
                  {editingEntrySourceTarget ? (
                    <button
                      type="button"
                      onClick={() => navigate(editingEntrySourceTarget.path)}
                      className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-black text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-700 dark:hover:text-blue-300"
                      title={editingEntrySourceTarget.label}
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <IconGlyph tone="info" className="h-7 w-7" aria-hidden="true"><i className={editingEntrySourceTarget.icon} /></IconGlyph>
                        <span className="truncate">{editingEntrySourceTarget.label}</span>
                      </span>
                      <i className="fa-solid fa-chevron-left text-slate-400" />
                    </button>
                  ) : (
                    <div className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <span className="inline-flex items-center gap-3">
                        <IconGlyph tone="neutral" className="h-7 w-7" aria-hidden="true"><i className="fa-solid fa-link-slash" /></IconGlyph>
                        ریشه تراکنش مشخص نیست
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">تاریخ رکورد</label>
                  <ShamsiDatePicker
                    id="editCustomerLedgerDate"
                    selectedDate={editingEntry.transactionDate || ''}
                    onDateChange={(value: Date | null) => setEditingEntry({ ...editingEntry, transactionDate: value })}
                    size="compact"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">دریافت / بستانکار (تومان)</label>
                  <PriceInput
                    id="editCustomerLedgerCredit"
                    name="credit"
                    value={String(editingEntry.credit || '')}
                    onChange={(e: PriceInputChangeEvent) => setEditingEntry({ ...editingEntry, credit: Number(e.target.value.replace(/[^\d.-]/g, '')) || 0 })}
                    className={inputClass(false)}
                    preview="مبلغ دریافت"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">پرداخت / بدهکار (تومان)</label>
                  <PriceInput
                    id="editCustomerLedgerDebit"
                    name="debit"
                    value={String(editingEntry.debit || '')}
                    onChange={(e: PriceInputChangeEvent) => setEditingEntry({ ...editingEntry, debit: Number(e.target.value.replace(/[^\d.-]/g, '')) || 0 })}
                    className={inputClass(false)}
                    preview="مبلغ پرداخت"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-blue-100 bg-blue-50/60 px-4 py-3.5 text-[13px] leading-6.5 text-slate-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <IconGlyph tone="info" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-circle-info" /></IconGlyph>
                <div className="w-full text-center xl:text-right">
                  با ذخیره این تغییرات، مانده حساب مشتری به‌روزرسانی خواهد شد.
                  <br className="hidden sm:block" />
                  در صورت تغییر نوع یا مبلغ، گزارش‌ها و تسویه‌حساب‌های مرتبط نیز تحت تأثیر قرار می‌گیرند.
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!token}
                className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2.5 rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <i className="fa-regular fa-floppy-disk" />
                ذخیره رکورد دفتر
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default CustomerLedgerEntryEditModal;
