import React from 'react';
import { FormGrid, SelectField, TextareaField } from '@/components/ui';
import LedgerTransactionTypeSelector from '../../components/people/LedgerTransactionTypeSelector';
import { previewAccountingBalanceAfterMovement } from '../../shared/accounting/accountingCore';

type Props = {
  ctx: Record<string, any>;
};

const PartnerLedgerPaymentModal: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    getBalanceLabel,
    getBalanceState,
    handleLedgerInputChange,
    handleLedgerSubmit,
    isLedgerModalOpen,
    isSubmittingLedger,
    ledgerDateSelected,
    ledgerDirection,
    ledgerFormErrors,
    newLedgerEntry,
    profile,
    setIsLedgerModalOpen,
    setLedgerDateSelected,
    setLedgerDirection,
    token,
  } = ctx;

  if (!isLedgerModalOpen) return null;

  const currentBalance = Number(profile.currentBalance || 0);
  const enteredAmount = Number(String(newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
  const displayCurrentBalance = Math.abs(currentBalance);
  const nextBalance = previewAccountingBalanceAfterMovement('partner', currentBalance, ledgerDirection === 'payment' ? { debit: enteredAmount } : { credit: enteredAmount });
  const displayNextBalance = Math.abs(nextBalance);
  const previewTone = displayNextBalance <= 0
    ? 'settled'
    : displayNextBalance >= 50000000
      ? 'danger'
      : displayNextBalance >= 10000000
        ? 'warning'
        : 'ok';
  const balanceLabel = getBalanceLabel(
    getBalanceState(profile.currentBalance, { overdue: currentBalance >= 50000000 }),
    'partner',
  );
  const quickAmounts = [
    { label: '۱ میلیون', value: 1000000 },
    { label: '۵ میلیون', value: 5000000 },
    { label: '۱۰ میلیون', value: 10000000 },
    { label: 'کل مانده', value: displayCurrentBalance },
  ].filter((chip, index, rows) => chip.value > 0 && rows.findIndex((row) => row.value === chip.value) === index);
  const noteTemplates = [
    {
      id: ledgerDirection === 'payment' ? 'card' : 'adjust',
      value: ledgerDirection === 'payment'
        ? 'پرداخت کارت‌به‌کارت بابت تسویه'
        : 'دریافت بابت اصلاح حساب',
    },
    { id: 'cash', value: ledgerDirection === 'payment' ? 'پرداخت نقدی' : 'دریافت نقدی' },
    { id: 'bank', value: ledgerDirection === 'payment' ? 'حواله بانکی' : 'دریافت حواله بانکی' },
    { id: 'tracking', value: 'شماره پیگیری: ' },
  ];
  const effectLabel = ledgerDirection === 'payment' ? 'کاهش مانده' : 'افزایش مانده';
  const effectAmount = enteredAmount > 0 ? `${enteredAmount.toLocaleString('fa-IR')} تومان` : 'پس از ورود مبلغ';

  return (
    <Modal
      title={`${ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'} ${profile.partnerName}`}
      onClose={() => setIsLedgerModalOpen(false)}
      widthClass="max-w-5xl"
      iconClass="fa-solid fa-money-bill-transfer"
      tone={ledgerDirection === 'receipt' ? 'success' : 'warning'}
      variant="operational"
      layout="split"
      ariaDescription="ثبت تراکنش مالی همکار با پیش‌نمایش اثر مبلغ روی مانده حساب"
      panelClassName="financial-entry-modal financial-entry-modal--partner"
      bodyClassName="partner-ledger-payment-modal-body financial-entry-modal__body"
    >
      <form
        noValidate
        onSubmit={handleLedgerSubmit}
        className="people-finance-modal modal-template-form modal-template-form--finance ledger-payment-modal ledger-payment-modal--partner premium-modal-stack"
        dir="rtl"
        data-ledger-direction={ledgerDirection}
        data-ui-partner-ledger-payment="v317"
        data-ui-partner-ledger-polish="v317"
        data-ui-partner-ledger-layout="shared-v317"
        data-ui-financial-modal="v317"
      >
        <LedgerTransactionTypeSelector
          value={ledgerDirection}
          onChange={setLedgerDirection}
          ariaLabel="نوع تراکنش همکار"
          headingId="partner-ledger-transaction-type-title"
          options={[
            { key: 'payment', title: 'پرداخت به همکار', subtitle: 'کاهش مانده بدهی فروشگاه', iconClass: 'fa-arrow-up-from-bracket', tone: 'warning' },
            { key: 'receipt', title: 'دریافت از همکار', subtitle: 'برگشت وجه یا اصلاح حساب', iconClass: 'fa-download', tone: 'success' },
          ]}
        />

        <div className="ledger-payment-modal__workspace">
          <aside className="ledger-payment-modal__account-panel" aria-label="خلاصه حساب همکار">
            <section className="people-finance-modal__summary modal-template-card ledger-payment-modal__account-card">
              <div className="min-w-0">
                <div className="people-finance-modal__eyebrow">دفتر حساب همکار</div>
                <div className="people-finance-modal__title">{profile.partnerName}</div>
                <div className="people-finance-modal__hint">
                  {ledgerDirection === 'payment'
                    ? 'پرداخت به همکار مانده قابل پرداخت فروشگاه را کاهش می‌دهد.'
                    : 'دریافت از همکار برای برگشت وجه یا اصلاح مانده حساب استفاده می‌شود.'}
                </div>
              </div>
            </section>

            <section className="people-finance-modal__balance modal-template-card ledger-payment-modal__balance-card">
              <span className="people-finance-modal__balance-icon ledger-payment-modal__metric-icon" aria-hidden="true">
                <i className="fa-solid fa-wallet" />
              </span>
              <div className="people-finance-modal__balance-copy">
                <span>مانده فعلی</span>
                <strong>{displayCurrentBalance.toLocaleString('fa-IR')} تومان</strong>
                <small>{balanceLabel}</small>
              </div>
            </section>

            <section className={`ledger-payment-modal__preview-card ledger-payment-modal__preview-card--${previewTone}`}>
              <span className="ledger-payment-modal__metric-icon" aria-hidden="true">
                <i className="fa-solid fa-calculator" />
              </span>
              <div>
                <span>مانده بعد از ثبت</span>
                <strong>{displayNextBalance.toLocaleString('fa-IR')} تومان</strong>
                <small>{ledgerDirection === 'payment' ? 'پس از ثبت پرداخت به همکار' : 'پس از ثبت دریافت از همکار'}</small>
              </div>
            </section>

            <section className="ledger-payment-modal__impact-row" aria-live="polite">
              <span><i className={`fa-solid ${ledgerDirection === 'payment' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}`} aria-hidden="true" /> {effectLabel}</span>
              <strong>{effectAmount}</strong>
            </section>
          </aside>

          <section className="ledger-payment-modal__entry-panel" aria-label="اطلاعات تراکنش">
            <FormErrorSummary
              errors={ledgerFormErrors as any}
              labels={{
                amount: ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی',
                referenceMode: 'نوع مرجع',
                transactionDate: 'تاریخ ثبت مالی',
                description: 'شرح تراکنش',
              }}
              fieldIdMap={{ referenceMode: 'ledgerReferenceMode', amount: 'ledgerAmount', transactionDate: 'ledgerTransactionDate', description: 'ledgerDescription' }}
              className="people-form-error-summary ledger-payment-modal__errors"
            />

            <ModalField label="نوع مرجع" iconClass="fa-solid fa-link" required error={ledgerFormErrors.referenceMode} className="people-finance-field ledger-payment-modal__field">
              <SelectField id="ledgerReferenceMode" name="referenceMode" value={newLedgerEntry.referenceMode || ''} onChange={handleLedgerInputChange as any} aria-label="نوع مرجع حسابداری">
                <option value="">انتخاب کنید</option>
                <option value="standalone">سند مستقل حسابداری</option>
              </SelectField>
              <small className="block mt-1 text-slate-500">برای پرداخت/دریافت بدون فروش، گوشی یا تسویه منبع، انتخاب سند مستقل الزامی است.</small>
            </ModalField>

            <FormGrid columns={2} className="people-finance-modal__grid ledger-payment-modal__field-grid">
              <ModalField
                label={ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی'}
                iconClass="fa-solid fa-coins"
                required
                error={ledgerFormErrors.amount}
                className="people-finance-field people-finance-field--amount ledger-payment-modal__field"
              >
                <PriceInput
                  id="ledgerAmount"
                  name="amount"
                  value={String(newLedgerEntry.debit || '')}
                  onChange={handleLedgerInputChange}
                  preview="مثال: ۵۰۰۰۰۰۰"
                  topLabel=""
                  suffix=""
                />
                <div className="people-amount-chip-row" aria-label="مبالغ پیشنهادی">
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

              <ModalField
                label="تاریخ ثبت مالی"
                iconClass="fa-solid fa-calendar-day"
                required
                error={ledgerFormErrors.transactionDate}
                className="people-finance-field people-finance-field--date ledger-payment-modal__field"
              >
                <ShamsiDatePicker
                  id="ledgerTransactionDate"
                  selectedDate={ledgerDateSelected}
                  onDateChange={setLedgerDateSelected}
                  invalid={Boolean(ledgerFormErrors.transactionDate)}
                  size="compact"
                  hideIcon
                />
              </ModalField>
            </FormGrid>

            <ModalField
              label="شرح تراکنش"
              iconClass="fa-solid fa-note-sticky"
              required
              error={ledgerFormErrors.description}
              className="people-finance-field people-finance-field--description ledger-payment-modal__field ledger-payment-modal__field--description"
            >
              <TextareaField
                controlOnly
                id="ledgerDescription"
                name="description"
                value={newLedgerEntry.description || ''}
                onChange={handleLedgerInputChange}
                rows={3}
                required
                placeholder={ledgerDirection === 'payment'
                  ? 'مثلاً: پرداخت کارت‌به‌کارت بابت تسویه گوشی'
                  : 'مثلاً: دریافت وجه بابت اصلاح حساب همکار'}
              />
              <div key={`partner-note-templates-${ledgerDirection}`} className="people-note-template-row" aria-label="شرح‌های پیشنهادی">
                {noteTemplates.map((note) => {
                  const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                  return (
                    <Button
                      unstyled
                      key={`${ledgerDirection}-${note.id}`}
                      type="button"
                      className={['people-note-template', isActive ? 'is-active' : ''].join(' ')}
                      aria-pressed={isActive}
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
              submitText={ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'}
              submittingText={ledgerDirection === 'receipt' ? 'در حال ثبت دریافت...' : 'در حال ثبت پرداخت...'}
              isSubmitting={isSubmittingLedger}
              submitDisabled={!token || isSubmittingLedger}
              submitVariant={ledgerDirection === 'receipt' ? 'success' : 'warning'}
              submitIconClass={ledgerDirection === 'receipt' ? 'fa-solid fa-download' : 'fa-solid fa-arrow-up-from-bracket'}
              helperTitle="ثبت در دفتر همکار"
              helperText="پس از ثبت، مانده حساب بر اساس مبلغ و جهت تراکنش به‌روزرسانی می‌شود."
              helperIconClass="fa-solid fa-shield-check"
              hideHelper={false}
              align="between"
            />
          </section>
        </div>
      </form>
    </Modal>
  );
};

export default PartnerLedgerPaymentModal;
