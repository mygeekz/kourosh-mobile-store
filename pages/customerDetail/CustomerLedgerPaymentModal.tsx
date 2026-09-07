import { FormGrid, SelectField, TextareaField } from '@/components/ui';
import LedgerTransactionTypeSelector from '../../components/people/LedgerTransactionTypeSelector';
import React, { type ChangeEvent } from 'react';
import { previewAccountingBalanceAfterMovement } from '../../shared/accounting/accountingCore';

type Props = {
  ctx: Record<string, any>;
};

const CustomerLedgerPaymentModal: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
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

  if (!isLedgerModalOpen) return null;

  const currentBalance = Number(profile.currentBalance || 0);
  const enteredAmount = Number(String(transactionType === 'credit' ? newLedgerEntry.credit || '' : newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
  const displayCurrentBalance = Math.abs(currentBalance);
  const nextBalance = previewAccountingBalanceAfterMovement('customer', currentBalance, transactionType === 'credit' ? { credit: enteredAmount } : { debit: enteredAmount });
  const displayNextBalance = Math.abs(nextBalance);
  const previewTone = displayNextBalance <= 0 ? 'settled' : displayNextBalance >= 50000000 ? 'danger' : displayNextBalance >= 10000000 ? 'warning' : 'ok';
  const balanceLabel = getBalanceLabel(getBalanceState(profile.currentBalance), 'customer');
  const effectLabel = transactionType === 'credit' ? 'کاهش بدهی مشتری' : 'افزایش اعتبار / طلب مشتری';
  const effectAmount = enteredAmount > 0 ? `${enteredAmount.toLocaleString('fa-IR')} تومان` : 'پس از ورود مبلغ';
  const quickAmounts = [
    { label: '۱ میلیون', value: 1000000 },
    { label: '۵ میلیون', value: 5000000 },
    { label: '۱۰ میلیون', value: 10000000 },
    { label: 'کل مانده', value: displayCurrentBalance },
  ].filter((chip, index, rows) => chip.value > 0 && rows.findIndex((row) => row.value === chip.value) === index);
  const noteTemplates = [
    { id: transactionType === 'credit' ? 'card' : 'charge', value: transactionType === 'credit' ? 'دریافت کارت‌به‌کارت بابت بدهی' : 'شارژ حساب مشتری' },
    { id: 'cash', value: transactionType === 'credit' ? 'دریافت نقدی' : 'پرداخت نقدی' },
    { id: 'adjust', value: 'اصلاح حساب' },
    { id: 'tracking', value: 'شماره پیگیری: ' },
  ];

  return (
    <>
{/* مودال ثبت تراکنش مالی */}
      {isLedgerModalOpen && (
        <Modal
          title={`${transactionType === 'credit' ? 'ثبت دریافت از مشتری' : 'ثبت پرداخت / شارژ حساب'} ${profile.fullName}`}
          onClose={() => setIsLedgerModalOpen(false)}
          widthClass="max-w-5xl"
          panelClassName="financial-entry-modal financial-entry-modal--customer"
          iconClass="fa-solid fa-money-bill-transfer"
          tone={transactionType === 'credit' ? 'success' : 'warning'}
          variant="operational"
          layout="split"
          ariaDescription="ثبت تراکنش مالی مشتری با پیش‌نمایش اثر مبلغ روی مانده حساب"
          bodyClassName="customer-ledger-payment-modal-body financial-entry-modal__body"
        >
          <form noValidate onSubmit={handleLedgerSubmit} className="people-finance-modal modal-template-form modal-template-form--finance ledger-payment-modal ledger-payment-modal--customer premium-modal-stack" data-ledger-direction={transactionType} data-ui-customer-ledger-polish="v317" data-ui-customer-ledger-layout="shared-v317" data-ui-financial-modal="v317">
            <LedgerTransactionTypeSelector
              value={transactionType}
              onChange={(nextType) => handleTransactionTypeChange({ target: { value: nextType } } as ChangeEvent<HTMLInputElement>)}
              ariaLabel="نوع تراکنش مشتری"
              headingId="customer-ledger-transaction-type-title"
              options={[
                { key: 'credit', title: 'دریافت از مشتری', subtitle: 'کاهش بدهی یا ثبت وصول', iconClass: 'fa-hand-holding-dollar', tone: 'success' },
                { key: 'debit', title: 'پرداخت / شارژ حساب', subtitle: 'افزایش طلب مشتری یا اصلاح حساب', iconClass: 'fa-wallet', tone: 'warning' },
              ]}
            />

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
                    <strong>{displayCurrentBalance.toLocaleString('fa-IR')} تومان</strong>
                    <small>{balanceLabel}</small>
                  </div>
                </section>

                <section className={`ledger-payment-modal__preview-card ledger-payment-modal__preview-card--${previewTone}`}>
                  <span className="ledger-payment-modal__metric-icon" aria-hidden="true"><i className="fa-solid fa-calculator" /></span>
                  <div>
                    <span>مانده بعد از ثبت</span>
                    <strong>{displayNextBalance.toLocaleString('fa-IR')} تومان</strong>
                    <small>{transactionType === 'credit' ? 'بعد از دریافت از مشتری' : 'بعد از پرداخت / شارژ حساب'}</small>
                  </div>
                </section>

                <section className="ledger-payment-modal__impact-row" aria-live="polite">
                  <span><i className={`fa-solid ${transactionType === 'credit' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}`} aria-hidden="true" /> {effectLabel}</span>
                  <strong>{effectAmount}</strong>
                </section>
              </aside>

              <section className="ledger-payment-modal__entry-panel">
                <FormErrorSummary errors={ledgerFormErrors as any} labels={{ referenceMode: 'نوع مرجع', amountType: 'مبلغ تراکنش', transactionDate: 'تاریخ تراکنش', description: 'شرح تراکنش' }} fieldIdMap={{ referenceMode: 'ledgerReferenceMode', amountType: 'ledgerAmount', transactionDate: 'ledgerDatePicker', description: 'ledgerDescription' }} className="people-form-error-summary ledger-payment-modal__errors" />

                <ModalField label="نوع مرجع" iconClass="fa-solid fa-link" required error={ledgerFormErrors.referenceMode} className="people-finance-field ledger-payment-modal__field">
                  <SelectField id="ledgerReferenceMode" name="referenceMode" value={newLedgerEntry.referenceMode || ''} onChange={handleLedgerInputChange as any} aria-label="نوع مرجع حسابداری">
                    <option value="">انتخاب کنید</option>
                    <option value="standalone">سند مستقل حسابداری</option>
                  </SelectField>
                  <small className="block mt-1 text-slate-500">این ثبت به سند فروش/قسط/چک وصل نیست و علت آن به‌صورت Immutable نگهداری می‌شود.</small>
                </ModalField>

                <FormGrid columns={2} className="people-finance-modal__grid ledger-payment-modal__field-grid">
                  <ModalField label={transactionType === 'credit' ? 'مبلغ دریافتی' : 'مبلغ پرداخت / شارژ'} iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amountType} className="people-finance-field people-finance-field--amount ledger-payment-modal__field">
                    <PriceInput
                      id="ledgerAmount" name="amount"
                      value={transactionType === 'credit' ? String(newLedgerEntry.credit || '') : String(newLedgerEntry.debit || '')}
                      onChange={handleLedgerInputChange}
                      preview="مثال: ۵۰۰۰۰۰۰"
                    />
                    <div className="people-amount-chip-row">
                      {quickAmounts.map((chip) => (
                        <Button
                          unstyled
                          key={chip.label}
                          type="button"
                          className="people-amount-chip"
                          onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}
                        >
                          {chip.label}
                        </Button>
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
                </FormGrid>

                <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description} className="people-finance-field people-finance-field--description ledger-payment-modal__field ledger-payment-modal__field--description">
                  <TextareaField controlOnly
                    id="ledgerDescription" name="description" rows={3}
                    value={newLedgerEntry.description || ''} onChange={handleLedgerInputChange}
                    required
                    placeholder={transactionType === 'credit' ? 'مثلاً: دریافت کارت‌به‌کارت بابت بدهی فاکتور' : 'مثلاً: پرداخت یا شارژ حساب مشتری'}
                  />
                  <div key={`customer-note-templates-${transactionType}`} className="people-note-template-row">
                    {noteTemplates.map((note) => {
                      const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                      return (
                        <Button
                          unstyled
                          key={`${transactionType}-${note.id}`}
                          type="button"
                          className={["people-note-template", isActive ? 'is-active' : ''].join(' ')}
                          onClick={() => handleLedgerInputChange({ target: { name: 'description', value: note.value } })}
                        >
                          {note.value}
                        </Button>
                      );
                    })}
                  </div>
                </ModalField>

                <ModalActions
                  onCancel={() => setIsLedgerModalOpen(false)}
                  cancelText="انصراف"
                  submitText={transactionType === 'credit' ? 'ثبت دریافت از مشتری' : 'ثبت پرداخت / شارژ حساب'}
                  submittingText={transactionType === 'credit' ? 'در حال ثبت دریافت...' : 'در حال ثبت پرداخت...'}
                  isSubmitting={isSubmittingLedger}
                  submitDisabled={!token || isSubmittingLedger}
                  submitVariant={transactionType === 'credit' ? 'success' : 'warning'}
                  submitIconClass={transactionType === 'credit' ? 'fa-solid fa-download' : 'fa-solid fa-wallet'}
                  helperTitle="ثبت در دفتر مشتری"
                  helperText="پس از ثبت، مانده حساب مشتری بر اساس مبلغ و جهت تراکنش به‌روزرسانی می‌شود."
                  helperIconClass="fa-solid fa-shield-check"
                  hideHelper={false}
                  align="between"
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
