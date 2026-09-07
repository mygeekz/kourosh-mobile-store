import React from 'react';
import { FormGrid, TextField } from '@/components/ui';
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

  const directionLockRef = React.useRef<{ entryId: number | null; isPayment: boolean }>({ entryId: null, isPayment: false });
  const activeEntryId = editingEntry ? Number(editingEntry.id || 0) : null;
  if (editingEntry && directionLockRef.current.entryId !== activeEntryId) {
    directionLockRef.current = { entryId: activeEntryId, isPayment: Number(editingEntry.debit || 0) > 0 };
  }
  const isPaymentEntry = directionLockRef.current.isPayment;
  const lockedDirectionLabel = isPaymentEntry ? 'پرداخت به همکار' : 'دریافت از همکار';
  const lockedAmount = isPaymentEntry ? Number(editingEntry?.debit || 0) : Number(editingEntry?.credit || 0);

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
            noValidate
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
                  <span>تغییر مبلغ، مانده حساب همکار را به‌روزرسانی می‌کند. جهت تراکنش برای جلوگیری از جابه‌جایی اشتباه بدهکار/بستانکار در ویرایش قفل است.</span>
                </div>
              </aside>

              <FormGrid columns={2} aria-label="فیلدهای ویرایش رکورد">
                <ModalField label="شرح رکورد" iconClass="fa-solid fa-receipt" className="md:col-span-2">
                  <TextField
                    id="editPartnerLedgerDescription"
                    name="description"
                    dir="rtl"
                    value={editingEntry.description || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    placeholder="مثلاً: دریافت گوشی Galaxy A17"
                  />
                </ModalField>

                <ModalField label="جهت تراکنش" iconClass="fa-solid fa-arrow-right-arrow-left">
                  <div
                    className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                    data-ui-partner-ledger-edit-direction-lock="v335"
                  >
                    <span>{lockedDirectionLabel}</span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ثابت</span>
                  </div>
                </ModalField>

                <ModalField label={isPaymentEntry ? "مبلغ پرداختی به همکار" : "مبلغ دریافتی از همکار"} iconClass={isPaymentEntry ? "fa-solid fa-arrow-up" : "fa-solid fa-arrow-down"}>
                  <PriceInput
                    id="editPartnerLedgerAmount"
                    name="amount"
                    value={String(lockedAmount || '')}
                    onChange={(e: PriceInputChangeEvent) => {
                      const amount = Number(e.target.value.replace(/[^\d.-]/g, '')) || 0;
                      setEditingEntry(isPaymentEntry
                        ? { ...editingEntry, debit: amount, credit: 0 }
                        : { ...editingEntry, debit: 0, credit: amount });
                    }}
                    preview={isPaymentEntry ? "مبلغ پرداخت" : "مبلغ دریافت"}
                    topLabel=""
                    suffix="تومان"
                  />
                </ModalField>
              </FormGrid>
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
