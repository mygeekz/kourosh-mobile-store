import { TextareaField } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerLedgerPaymentModal: React.FC<Props> = ({ ctx }) => {
  const {
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    amount,
    current,
    debit,
    errors,
    getBalanceLabel,
    getBalanceState,
    handleLedgerInputChange,
    handleLedgerSubmit,
    id,
    inputClass,
    isLedgerModalOpen,
    isSubmittingLedger,
    item,
    ledger,
    ledgerDateSelected,
    ledgerDirection,
    ledgerFormErrors,
    name,
    newLedgerEntry,
    note,
    profile,
    rows,
    setIsLedgerModalOpen,
    setLedgerDateSelected,
    setLedgerDirection,
    summary,
    target,
    token,
    tone,
    value,
  } = ctx;

  return (
    <>
{/* Ledger Modal (new payment) */}
      {isLedgerModalOpen && (
        <Modal title={`${ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'} ${profile.partnerName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-5xl" iconClass="fa-solid fa-money-bill-transfer" tone={ledgerDirection === 'receipt' ? 'success' : 'warning'} variant="operational" layout="split" bodyClassName="partner-ledger-modal-body">
          <form onSubmit={handleLedgerSubmit} className="people-finance-modal modal-template-form modal-template-form--finance ledger-payment-modal ledger-payment-modal--partner premium-modal-stack p-1" data-ledger-direction={ledgerDirection}>
            <section className="ledger-payment-modal__type-strip" aria-label="نوع تراکنش همکار">
              <div className="ledger-payment-modal__type-head">
                <span className="ledger-payment-modal__type-head-icon"><i className="fa-solid fa-shuffle" /></span>
                <div>
                  <div className="people-finance-modal__eyebrow">نوع تراکنش همکار</div>
                  <strong>پرداخت یا دریافت را قبل از ورود مبلغ مشخص کن</strong>
                  <p>این انتخاب تعیین می‌کند مانده فروشگاه نسبت به همکار کاهش پیدا کند یا به‌عنوان برگشت وجه/اصلاح حساب ثبت شود.</p>
                </div>
              </div>
              <div className="people-ledger-type-grid ledger-payment-modal__type-grid" role="radiogroup" aria-label="نوع تراکنش همکار">
                {[
                  { key: 'payment', title: 'پرداخت به همکار', sub: 'کاهش بدهی فروشگاه به همکار', icon: 'fa-upload', tone: 'warning' },
                  { key: 'receipt', title: 'دریافت از همکار', sub: 'برگشت وجه یا اصلاح حساب', icon: 'fa-download', tone: 'success' },
                ].map((item) => {
                  const active = ledgerDirection === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setLedgerDirection(item.key as any)}
                      className={["people-ledger-type-card ledger-payment-modal__type-card", active ? 'is-active' : '', `ledger-payment-modal__type-card--${item.tone}`].join(' ')}
                      aria-pressed={active}
                    >
                      <span className="people-ledger-type-card__icon ledger-payment-modal__type-icon"><i className={`fa-solid ${item.icon}`} /></span>
                      <span className="people-ledger-type-card__copy ledger-payment-modal__type-copy"><strong>{item.title}</strong><small>{item.sub}</small></span>
                      <span className="people-ledger-type-card__check ledger-payment-modal__type-check"><i className="fa-solid fa-check" /></span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="ledger-payment-modal__workspace">
              <aside className="ledger-payment-modal__account-panel">
                <section className="people-finance-modal__summary modal-template-card ledger-payment-modal__account-card">
                  <div className="min-w-0">
                    <div className="people-finance-modal__eyebrow">دفتر حساب همکار</div>
                    <div className="people-finance-modal__title">{profile.partnerName}</div>
                    <div className="people-finance-modal__hint">
                      پرداخت به همکار مانده بدهی فروشگاه را کم می‌کند؛ دریافت از همکار برای برگشت وجه یا اصلاح حساب استفاده می‌شود.
                    </div>
                  </div>
                </section>

                <section className="people-finance-modal__balance modal-template-card ledger-payment-modal__balance-card">
                  <span className="people-finance-modal__balance-icon ledger-payment-modal__metric-icon" aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
                  <div className="people-finance-modal__balance-copy">
                    <span>مانده فعلی</span>
                    <strong>{Math.abs(Number(profile.currentBalance || 0)).toLocaleString('fa-IR')} تومان</strong>
                    <small>{getBalanceLabel(getBalanceState(profile.currentBalance, { overdue: Math.abs(Number(profile.currentBalance || 0)) >= 50000000 }), 'partner')}</small>
                  </div>
                </section>

                {(() => {
                  const current = Math.abs(Number(profile.currentBalance || 0));
                  const amount = Number(String(newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
                  const nextBalance = ledgerDirection === 'payment' ? Math.max(0, current - amount) : current + amount;
                  const previewTone = nextBalance <= 0 ? 'settled' : nextBalance >= 50000000 ? 'danger' : nextBalance >= 10000000 ? 'warning' : 'ok';
                  return (
                    <section className={`ledger-payment-modal__preview-card ledger-payment-modal__preview-card--${previewTone}`}>
                      <span className="ledger-payment-modal__metric-icon"><i className="fa-solid fa-calculator" /></span>
                      <div>
                        <span>مانده بعد از ثبت</span>
                        <strong>{nextBalance.toLocaleString('fa-IR')} تومان</strong>
                        <small>{ledgerDirection === 'payment' ? 'بعد از پرداخت به همکار' : 'بعد از دریافت از همکار'}</small>
                      </div>
                    </section>
                  );
                })()}
              </aside>

              <section className="ledger-payment-modal__entry-panel">
                <FormErrorSummary errors={ledgerFormErrors as any} labels={{ amount: ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی', transactionDate: 'تاریخ ثبت مالی', description: 'شرح تراکنش' }} fieldIdMap={{ amount: 'ledgerAmount', transactionDate: 'ledgerTransactionDate', description: 'ledgerDescription' }} className="people-form-error-summary ledger-payment-modal__errors" />

                <div className="people-finance-modal__grid ledger-payment-modal__field-grid">
                  <ModalField label={ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی'} iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amount} className="people-finance-field people-finance-field--amount ledger-payment-modal__field">
                    <PriceInput id="ledgerAmount" name="amount" value={String(newLedgerEntry.debit || '')} onChange={handleLedgerInputChange} className={inputClass(!!ledgerFormErrors.amount)} preview="مثال: ۵۰۰۰۰۰۰" topLabel="" suffix="" />
                    <div className="people-amount-chip-row">
                      {[
                        { label: '۱ میلیون', value: 1000000 },
                        { label: '۵ میلیون', value: 5000000 },
                        { label: '۱۰ میلیون', value: 10000000 },
                        { label: 'کل مانده', value: Math.max(0, Math.abs(Number(profile.currentBalance || 0))) },
                      ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index).map((chip) => (
                        <button key={chip.label} type="button" className="people-amount-chip" onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}>{chip.label}</button>
                      ))}
                    </div>
                  </ModalField>

                  <ModalField label="تاریخ ثبت مالی" iconClass="fa-solid fa-calendar-day" required error={ledgerFormErrors.transactionDate} className="people-finance-field people-finance-field--date ledger-payment-modal__field">
                    <ShamsiDatePicker id="ledgerTransactionDate" selectedDate={ledgerDateSelected} onDateChange={setLedgerDateSelected} invalid={Boolean(ledgerFormErrors.transactionDate)} size="compact" hideIcon />
                  </ModalField>
                </div>

                <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description} className="people-finance-field people-finance-field--description ledger-payment-modal__field ledger-payment-modal__field--description">
                  <TextareaField controlOnly id="ledgerDescription" name="description" value={newLedgerEntry.description} onChange={handleLedgerInputChange} rows={4} className={inputClass(!!ledgerFormErrors.description, true)} required placeholder="مثلاً: پرداخت کارت‌به‌کارت بابت تسویه گوشی / دریافت بابت اصلاح حساب" />
                  <div key={`partner-note-templates-${ledgerDirection}`} className="people-note-template-row">
                    {[
                      { id: ledgerDirection === 'payment' ? 'card' : 'adjust', value: ledgerDirection === 'payment' ? 'پرداخت کارت‌به‌کارت بابت تسویه' : 'دریافت بابت اصلاح حساب' },
                      { id: 'cash', value: 'پرداخت نقدی' },
                      { id: 'bank', value: 'حواله بانکی' },
                      { id: 'tracking', value: 'شماره پیگیری: ' },
                    ].map((note) => {
                      const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                      return (
                        <button
                          key={`${ledgerDirection}-${note.id}`}
                          type="button"
                          className={["people-note-template", isActive ? 'is-active' : ''].join(' ')}
                          onClick={() => handleLedgerInputChange({ target: { name: 'description', value: note.value } })}
                        >
                          {note.value}
                        </button>
                      );
                    })}
                  </div>
                </ModalField>

                <ModalActions
                  onCancel={() => setIsLedgerModalOpen(false)}
                  submitText={ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'}
                  submittingText="در حال ثبت..."
                  isSubmitting={isSubmittingLedger}
                  submitDisabled={!token}
                />
              </section>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default PartnerLedgerPaymentModal;
