import { TextareaField } from '@/components/ui';
import React, { type ChangeEvent } from 'react';

type Props = {
  ctx: Record<string, any>;
};

const CustomerLedgerPaymentModal: React.FC<Props> = ({ ctx }) => {
  const {
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    amount,
    credit,
    d,
    debit,
    errors,
    getBalanceLabel,
    getBalanceState,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handleTransactionTypeChange,
    id,
    inputClass,
    isLedgerModalOpen,
    isSubmittingLedger,
    ledger,
    ledgerDateSelected,
    ledgerFormErrors,
    name,
    newLedgerEntry,
    note,
    ok,
    profile,
    rows,
    setIsLedgerModalOpen,
    setLedgerDateSelected,
    token,
    transactionType,
    value,
  } = ctx;

  return (
    <>
{/* مودال ثبت تراکنش مالی */}
      {isLedgerModalOpen && (
        <Modal title={`ثبت تراکنش مالی ${profile.fullName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-5xl" iconClass="fa-solid fa-money-bill-transfer" variant="operational" layout="split">
          <form onSubmit={handleLedgerSubmit} className="people-finance-modal modal-template-form modal-template-form--finance ledger-payment-modal ledger-payment-modal--customer premium-modal-stack p-1" data-ledger-direction={transactionType}>
            <section className="ledger-payment-modal__type-strip" aria-label="نوع تراکنش مشتری">
              <div className="ledger-payment-modal__type-head">
                <span className="ledger-payment-modal__type-head-icon"><i className="fa-solid fa-shuffle" /></span>
                <div>
                  <div className="people-finance-modal__eyebrow">نوع تراکنش</div>
                  <strong>اول مشخص کن این عملیات دریافت است یا پرداخت</strong>
                  <p>نوع تراکنش روی مانده حساب و متن پیشنهادی ثبت مالی اثر مستقیم دارد.</p>
                </div>
              </div>
              <div className="people-ledger-type-grid ledger-payment-modal__type-grid" role="radiogroup" aria-label="نوع تراکنش مشتری">
                {[
                  { key: 'credit', title: 'دریافت از مشتری', sub: 'کاهش بدهی یا ثبت وصول', icon: 'fa-hand-holding-dollar', tone: 'success' },
                  { key: 'debit', title: 'پرداخت / شارژ حساب', sub: 'افزایش طلب مشتری یا اصلاح حساب', icon: 'fa-wallet', tone: 'warning' },
                ].map((item) => {
                  const active = transactionType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleTransactionTypeChange({ target: { value: item.key } } as ChangeEvent<HTMLInputElement>)}
                      className={["people-ledger-type-card ledger-payment-modal__type-card", active ? 'is-active' : '', `ledger-payment-modal__type-card--${item.tone}`].join(' ')}
                      aria-pressed={active}
                    >
                      <span className="people-ledger-type-card__icon ledger-payment-modal__type-icon"><i className={`fa-solid ${item.icon}`} /></span>
                      <span className="people-ledger-type-card__copy ledger-payment-modal__type-copy">
                        <strong>{item.title}</strong>
                        <small>{item.sub}</small>
                      </span>
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
                    <div className="people-finance-modal__eyebrow">دفتر حساب مشتری</div>
                    <div className="people-finance-modal__title">{profile.fullName}</div>
                    <div className="people-finance-modal__hint">
                      دریافت از مشتری بدهی او را کم می‌کند؛ پرداخت/شارژ حساب زمانی استفاده می‌شود که مشتری بستانکار یا حسابش شارژ شود.
                    </div>
                  </div>
                </section>

                <section className="people-finance-modal__balance modal-template-card ledger-payment-modal__balance-card">
                  <span className="people-finance-modal__balance-icon ledger-payment-modal__metric-icon" aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
                  <div className="people-finance-modal__balance-copy">
                    <span>مانده فعلی</span>
                    <strong>{Math.abs(Number(profile.currentBalance || 0)).toLocaleString('fa-IR')} تومان</strong>
                    <small>{getBalanceLabel(getBalanceState(profile.currentBalance), 'customer')}</small>
                  </div>
                </section>

                {(() => {
                  const current = Math.abs(Number(profile.currentBalance || 0));
                  const amount = Number(String(transactionType === 'credit' ? newLedgerEntry.credit || '' : newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
                  const nextBalance = transactionType === 'credit' ? Math.max(0, current - amount) : current + amount;
                  const previewTone = nextBalance <= 0 ? 'settled' : nextBalance >= 50000000 ? 'danger' : nextBalance >= 10000000 ? 'warning' : 'ok';
                  return (
                    <section className={`ledger-payment-modal__preview-card ledger-payment-modal__preview-card--${previewTone}`}>
                      <span className="ledger-payment-modal__metric-icon"><i className="fa-solid fa-calculator" /></span>
                      <div>
                        <span>مانده بعد از ثبت</span>
                        <strong>{nextBalance.toLocaleString('fa-IR')} تومان</strong>
                        <small>{transactionType === 'credit' ? 'بعد از دریافت از مشتری' : 'بعد از پرداخت/شارژ حساب'}</small>
                      </div>
                    </section>
                  );
                })()}
              </aside>

              <section className="ledger-payment-modal__entry-panel">
                <FormErrorSummary errors={ledgerFormErrors as any} labels={{ amountType: 'مبلغ تراکنش', transactionDate: 'تاریخ تراکنش', description: 'شرح تراکنش' }} fieldIdMap={{ amountType: 'ledgerAmount', transactionDate: 'ledgerDatePicker', description: 'ledgerDescription' }} className="people-form-error-summary ledger-payment-modal__errors" />

                <div className="people-finance-modal__grid ledger-payment-modal__field-grid">
                  <ModalField label="مبلغ تراکنش" iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amountType} className="people-finance-field people-finance-field--amount ledger-payment-modal__field">
                    <PriceInput
                      id="ledgerAmount" name="amount"
                      value={transactionType === 'credit' ? String(newLedgerEntry.credit || '') : String(newLedgerEntry.debit || '')}
                      onChange={handleLedgerInputChange}
                      className={inputClass(!!ledgerFormErrors.amountType)}
                      preview="مثال: ۵۰۰۰۰۰۰"
                    />
                    <div className="people-amount-chip-row">
                      {[
                        { label: '۱ میلیون', value: 1000000 },
                        { label: '۵ میلیون', value: 5000000 },
                        { label: '۱۰ میلیون', value: 10000000 },
                        { label: 'کل مانده', value: Math.max(0, Math.abs(Number(profile.currentBalance || 0))) },
                      ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index).map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          className="people-amount-chip"
                          onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </ModalField>

                  <ModalField label="تاریخ تراکنش" iconClass="fa-solid fa-calendar-day" required error={ledgerFormErrors.transactionDate} className="people-finance-field people-finance-field--date ledger-payment-modal__field">
                    <ShamsiDatePicker
                      id="ledgerDatePicker"
                      selectedDate={ledgerDateSelected}
                      onDateChange={setLedgerDateSelected}
                      invalid={Boolean(ledgerFormErrors.transactionDate)}
                      size="compact"
                      hideIcon
                    />
                  </ModalField>
                </div>

                <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description} className="people-finance-field people-finance-field--description ledger-payment-modal__field ledger-payment-modal__field--description">
                  <TextareaField controlOnly
                    id="ledgerDescription" name="description" rows={3}
                    value={newLedgerEntry.description || ''} onChange={handleLedgerInputChange}
                    className={inputClass(!!ledgerFormErrors.description, true)} required
                    placeholder="مثلاً: دریافت کارت‌به‌کارت بابت بدهی فاکتور / شارژ حساب مشتری"
                  />
                  <div key={`customer-note-templates-${transactionType}`} className="people-note-template-row">
                    {[
                      { id: transactionType === 'credit' ? 'card' : 'charge', value: transactionType === 'credit' ? 'دریافت کارت‌به‌کارت بابت بدهی' : 'شارژ حساب مشتری' },
                      { id: 'cash', value: 'پرداخت نقدی' },
                      { id: 'adjust', value: 'اصلاح حساب' },
                      { id: 'tracking', value: 'شماره پیگیری: ' },
                    ].map((note) => {
                      const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                      return (
                        <button
                          key={`${transactionType}-${note.id}`}
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
                  submitText="ثبت تراکنش مالی"
                  submittingText="در حال ثبت تراکنش..."
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

export default CustomerLedgerPaymentModal;
