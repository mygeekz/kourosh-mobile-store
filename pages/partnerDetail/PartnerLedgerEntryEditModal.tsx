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
          wrapperClassName="partner-ledger-edit-modal-canonical"
          panelClassName="partner-ledger-edit-modal-panel"
          iconClass="fa-solid fa-pen-to-square"
          tone="info"
          variant="operational"
          layout="split"
          bodyClassName="partner-ledger-edit-modal-body"
          hideCloseButton
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleLedgerEdit();
            }}
            className="partner-ledger-edit-canonical modal-template-form modal-template-form--profile-edit"
            dir="rtl"
          >
            <aside className="partner-ledger-edit-canonical__summary modal-template-card">
              <span className="partner-ledger-edit-canonical__summary-icon modal-template-card__icon">
                <i className="fa-solid fa-clipboard-list" />
              </span>
              <div className="partner-ledger-edit-canonical__summary-kicker">رکورد دفتر همکار</div>
              <h3 className="partner-ledger-edit-canonical__summary-title">رکورد #{Number(editingEntry.id || 0).toLocaleString('fa-IR')}</h3>
              <p className="partner-ledger-edit-canonical__summary-text">
                شرح رکورد و مبلغ دریافتی/پرداختی همین سند را با استاندارد جدید فیلدها اصلاح کنید.
              </p>
              <div className="partner-ledger-edit-canonical__notice">
                <i className="fa-solid fa-circle-info" />
                <span>فقط اطلاعات همین رکورد به‌روزرسانی می‌شود.</span>
              </div>
            </aside>

            <section className="partner-ledger-edit-canonical__form modal-template-main">
              <ModalField
                label="شرح رکورد"
                iconClass="fa-solid fa-receipt"
                className="partner-ledger-edit-canonical__field partner-ledger-edit-canonical__field--full"
              >
                <TextField
                  id="editPartnerLedgerDescription"
                  name="description"
                  dir="rtl"
                  value={editingEntry.description || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  placeholder="مثلاً: دریافت گوشی Galaxy A17 / اصلاح مبلغ ثبت‌شده"
                />
              </ModalField>

              <div className="partner-ledger-edit-canonical__money-grid">
                <ModalField
                  label="مبلغ دریافتی از همکار"
                  iconClass="fa-solid fa-arrow-down"
                  className="partner-ledger-edit-canonical__field"
                >
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

                <ModalField
                  label="مبلغ پرداختی به همکار"
                  iconClass="fa-solid fa-arrow-up"
                  className="partner-ledger-edit-canonical__field"
                >
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
              </div>

              <div className="partner-ledger-edit-canonical__helper">
                <i className="fa-solid fa-circle-info" />
                <span>مبالغ را به تومان وارد کنید. تغییر این مقادیر روی مانده حساب همکار اثر می‌گذارد.</span>
              </div>
            </section>

            <ModalActions
              onCancel={() => setEditingEntry(null)}
              submitText="ذخیره رکورد دفتر"
              submitType="submit"
              submitIconClass="fa-solid fa-check"
              submitDisabled={!token}
              align="end"
              className="partner-ledger-edit-canonical__actions"
            />
          </form>
        </Modal>
      )}
    </>
  );
};

export default PartnerLedgerEntryEditModal;
