import React from 'react';
import { TextField } from '@/components/ui';
import type { PriceInputChangeEvent } from '../viewBoundaryTypes';

type Props = {
  ctx: Record<string, any>;
};

const PartnerLedgerEntryEditModal: React.FC<Props> = ({ ctx }) => {
  const {
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    credit,
    debit,
    editingEntry,
    entry,
    handleLedgerEdit,
    id,
    ledger,
    name,
    profile,
    setEditingEntry,
    target,
    text,
    token,
    tone,
    value,
  } = ctx;

  return (
    <>
{/* Edit single ledger entry */}
      {editingEntry && (
        <Modal
          title="ویرایش رکورد دفتر همکار"
          onClose={() => setEditingEntry(null)}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-pen-to-square"
          tone="info"
          variant="operational"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleLedgerEdit();
            }}
            className="space-y-4"
            dir="rtl"
          >
            <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" aria-hidden="true">
                  <i className="fa-solid fa-clipboard-list" />
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">رکورد دفتر همکار</p>
                <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  رکورد <bdi dir="ltr">#{Number(editingEntry.id || 0).toLocaleString('fa-IR')}</bdi>
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  شرح و مبالغ همین سند را ویرایش کنید؛ سایر رکوردها تغییر نمی‌کنند.
                </p>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <i className="fa-solid fa-circle-info mt-1" aria-hidden="true" />
                  <span>تغییر مبلغ، مانده حساب همکار را به‌روزرسانی می‌کند.</span>
                </div>
              </aside>

              <section className="grid min-w-0 gap-4 sm:grid-cols-2" aria-label="فیلدهای ویرایش رکورد">
                <ModalField label="شرح رکورد" iconClass="fa-solid fa-receipt" className="sm:col-span-2">
                  <TextField
                    id="editPartnerLedgerDescription"
                    name="description"
                    dir="rtl"
                    value={editingEntry.description || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    placeholder="مثلاً: دریافت گوشی Galaxy A17"
                  />
                </ModalField>

                <ModalField label="مبلغ دریافتی از همکار" iconClass="fa-solid fa-arrow-down">
                  <PriceInput
                    id="editPartnerLedgerCredit"
                    name="credit"
                    value={String(editingEntry.credit || '')}
                    onChange={(e: PriceInputChangeEvent) => setEditingEntry({ ...editingEntry, credit: Number(e.target.value.replace(/[^\d.-]/g, '')) || 0 })}
                    preview="مبلغ دریافت"
                    topLabel=""
                    suffix="تومان"
                  />
                </ModalField>

                <ModalField label="مبلغ پرداختی به همکار" iconClass="fa-solid fa-arrow-up">
                  <PriceInput
                    id="editPartnerLedgerDebit"
                    name="debit"
                    value={String(editingEntry.debit || '')}
                    onChange={(e: PriceInputChangeEvent) => setEditingEntry({ ...editingEntry, debit: Number(e.target.value.replace(/[^\d.-]/g, '')) || 0 })}
                    preview="مبلغ پرداخت"
                    topLabel=""
                    suffix="تومان"
                  />
                </ModalField>
              </section>
            </div>

            <ModalActions
              onCancel={() => setEditingEntry(null)}
              submitText="ذخیره رکورد دفتر"
              submitType="submit"
              submitIconClass="fa-solid fa-check"
              submitDisabled={!token}
              align="end"
            />
          </form>
        </Modal>
      )}
    </>
  );
};

export default PartnerLedgerEntryEditModal;
