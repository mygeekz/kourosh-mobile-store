import { TextareaField } from '@/components/ui';
import React from 'react';
import type { SettlementNoteTemplate } from '../viewBoundaryTypes';

type PhoneSettlementErrors = { amount?: string; transactionDate?: string; note?: string };

export type PartnerPhoneSettlementModalContext = Record<string, any> & {
    phoneSettlementNoteTemplates: SettlementNoteTemplate[];
  setPhoneSettlementErrors: React.Dispatch<React.SetStateAction<PhoneSettlementErrors>>;
};

type Props = {
  ctx: PartnerPhoneSettlementModalContext;
};

const PartnerPhoneSettlementModal: React.FC<Props> = ({ ctx }) => {
  const {
    FinancialProgressBar,
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    amount,
    errors,
    formatCurrencyText,
    handlePhoneSettlementAmountChange,
    handlePhoneSettlementSubmit,
    id,
    identifier,
    inputClass,
    isSubmittingPhoneSettlement,
    name,
    note,
    phone,
    phoneSettlementAmount,
    phoneSettlementDateSelected,
    phoneSettlementErrors,
    phoneSettlementItem,
    phoneSettlementNote,
    phoneSettlementNoteTemplates,
    phoneSettlementPaidAmount,
    readStoredCurrencyUnit,
    rows,
    setPhoneSettlementAmount,
    setPhoneSettlementDateSelected,
    setPhoneSettlementErrors,
    setPhoneSettlementItem,
    setPhoneSettlementNote,
    settlementPurchasePrice,
    summary,
    target,
    text,
    token,
    tone,
    value,
  } = ctx;

  return (
    <>
{/* Product-based phone settlement modal */}
      {phoneSettlementItem && (() => {
        const settlementBasis = Number(phoneSettlementItem.settlementPurchasePrice || phoneSettlementItem.soldDailyPurchasePrice || phoneSettlementItem.purchasePrice || 0);
        const settlementPaid = Number(phoneSettlementItem.phoneSettlementPaidAmount || 0);
        const settlementRemaining = Math.max(0, settlementBasis - settlementPaid);
        const settlementProgress = settlementBasis > 0 ? Math.min(100, Math.max(0, Math.round((settlementPaid / settlementBasis) * 100))) : 0;
        const quickAmounts = [
          { label: 'کل مانده', value: settlementRemaining, icon: 'fa-circle-check' },
          { label: 'نصف مانده', value: Math.floor(settlementRemaining / 2), icon: 'fa-percent' },
          { label: '۵ میلیون', value: Math.min(5000000, settlementRemaining), icon: 'fa-coins' },
          { label: '۱۰ میلیون', value: Math.min(10000000, settlementRemaining), icon: 'fa-sack-dollar' },
        ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index);

        return (
          <Modal title="ثبت پرداخت مرتبط با گوشی" onClose={() => setPhoneSettlementItem(null)} widthClass="max-w-4xl" iconClass="fa-solid fa-mobile-screen-button" tone="warning" variant="operational" layout="split" bodyClassName="partner-phone-settlement-modal-body">
            <form onSubmit={handlePhoneSettlementSubmit} className="people-finance-modal modal-template-form modal-template-form--finance people-finance-modal--horizontal phone-settlement-finance-modal premium-modal-stack p-1">
              <div className="people-finance-modal__side modal-template-side">
                <div className="people-finance-modal__summary phone-settlement-finance-modal__summary">
                <div>
                  <div className="people-finance-modal__eyebrow">پرداخت متصل به همین گوشی</div>
                  <div className="people-finance-modal__title">{phoneSettlementItem.name || 'گوشی فروخته‌شده'}</div>
                  <div className="people-finance-modal__hint">
                    این پرداخت فقط برای پرداخت‌های مستقیم و مرتبط با همین گوشی استفاده می‌شود؛ فروش‌های اقساطی از پرونده اقساط خوانده می‌شوند.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 justify-end">
                    {phoneSettlementItem.identifier ? (
                      <span className="phone-settlement-chip" dir="ltr"><i className="fa-solid fa-barcode" /> IMEI: {phoneSettlementItem.identifier}</span>
                    ) : null}
                    <span className="phone-settlement-chip"><i className="fa-solid fa-tag" /> {phoneSettlementItem.settlementPriceSourceLabel || 'قیمت خرید روز'}</span>
                  </div>
                </div>
                <div className="people-finance-modal__balance phone-settlement-finance-modal__balance">
                  <span>مانده سرمایه همین گوشی</span>
                  <strong>{formatCurrencyText(settlementRemaining, readStoredCurrencyUnit())}</strong>
                  <small>{settlementRemaining > 0 ? 'قابل پرداخت به همکار' : 'این گوشی تسویه شده است'}</small>
                </div>
                </div>

                <div className="phone-settlement-metrics-grid">
                <div className="phone-settlement-metric-card">
                  <span>مبنای سرمایه</span>
                  <strong>{formatCurrencyText(settlementBasis, readStoredCurrencyUnit())}</strong>
                </div>
                <div className="phone-settlement-metric-card">
                  <span>سرمایه بازگشتی</span>
                  <strong>{formatCurrencyText(settlementPaid, readStoredCurrencyUnit())}</strong>
                </div>
                <div className="phone-settlement-metric-card">
                  <span>پیشرفت تسویه</span>
                  <strong>{settlementProgress.toLocaleString('fa-IR')}٪</strong>
                </div>
              </div>

                <FinancialProgressBar
                  className="phone-settlement-progress"
                  value={settlementProgress}
                  showPercent={false}
                  tone={settlementProgress >= 100 ? 'emerald' : settlementProgress > 0 ? 'amber' : 'slate'}
                  ariaLabel={`پیشرفت تسویه ${settlementProgress} درصد`}
                />
              </div>

              <div className="people-finance-modal__main modal-template-main">
                <FormErrorSummary errors={phoneSettlementErrors as any} labels={{ amount: 'مبلغ پرداخت روی همین گوشی', transactionDate: 'تاریخ پرداخت', note: 'شرح پرداخت' }} fieldIdMap={{ amount: 'phoneSettlementAmount', transactionDate: 'phoneSettlementDate', note: 'phoneSettlementNote' }} className="people-form-error-summary" />

              <div className="people-finance-modal__grid">
                <ModalField label="مبلغ پرداخت روی همین گوشی" iconClass="fa-solid fa-coins" required error={phoneSettlementErrors.amount}>
                  <PriceInput id="phoneSettlementAmount" name="amount" value={String(phoneSettlementAmount || '')} onChange={handlePhoneSettlementAmountChange} className={inputClass(!!phoneSettlementErrors.amount)} preview="مثال: ۵۰۰۰۰۰۰" />
                  {quickAmounts.length ? (
                    <div className="people-amount-chip-row">
                      {quickAmounts.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => { setPhoneSettlementAmount(chip.value); if (phoneSettlementErrors.amount) setPhoneSettlementErrors(prev => ({ ...prev, amount: undefined })); }}
                          className="people-amount-chip"
                        >
                          <i className={`fa-solid ${chip.icon}`} />
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </ModalField>

                <ModalField label="تاریخ پرداخت" iconClass="fa-solid fa-calendar-day" required error={phoneSettlementErrors.transactionDate}>
                  <ShamsiDatePicker id="phoneSettlementDate" selectedDate={phoneSettlementDateSelected} onDateChange={setPhoneSettlementDateSelected} invalid={Boolean(phoneSettlementErrors.transactionDate)} size="compact" hideIcon />
                </ModalField>
              </div>

              <ModalField label="شرح پرداخت" iconClass="fa-solid fa-note-sticky" required error={phoneSettlementErrors.note}>
                <TextareaField controlOnly
                  id="phoneSettlementNote"
                  value={phoneSettlementNote}
                  onChange={(e) => { setPhoneSettlementNote(e.target.value); if (phoneSettlementErrors.note) setPhoneSettlementErrors(prev => ({ ...prev, note: undefined })); }}
                  rows={3}
                  className={inputClass(!!phoneSettlementErrors.note, true)}
                  placeholder="مثلاً: کارت‌به‌کارت بابت تسویه همین گوشی / شماره پیگیری ..."
                />
                <div className="people-note-template-row">
                  {phoneSettlementNoteTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => { setPhoneSettlementNote(template.text); if (phoneSettlementErrors.note) setPhoneSettlementErrors(prev => ({ ...prev, note: undefined })); }}
                      className="people-note-template"
                    >
                      <i className={`fa-solid ${template.icon}`} />
                      {template.label}
                    </button>
                  ))}
                  {phoneSettlementNote ? (
                    <button
                      type="button"
                      onClick={() => setPhoneSettlementNote('')}
                      className="people-note-template"
                    >
                      <i className="fa-solid fa-eraser" />
                      پاک‌کردن توضیح
                    </button>
                  ) : null}
                </div>
              </ModalField>

                <ModalActions
                  onCancel={() => setPhoneSettlementItem(null)}
                  submitText="ثبت پرداخت همین گوشی"
                  submittingText="در حال ثبت پرداخت..."
                  isSubmitting={isSubmittingPhoneSettlement}
                  submitDisabled={!token || settlementRemaining <= 0}
                />
              </div>
            </form>
          </Modal>
        );
      })()}
    </>
  );
};

export default PartnerPhoneSettlementModal;
