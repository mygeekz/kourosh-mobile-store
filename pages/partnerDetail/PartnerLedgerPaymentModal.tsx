import React from 'react';
import { TextareaField } from '@/components/ui';

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

  const currentBalance = Math.abs(Number(profile.currentBalance || 0));
  const enteredAmount = Number(String(newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
  const nextBalance = ledgerDirection === 'payment' ? Math.max(0, currentBalance - enteredAmount) : currentBalance + enteredAmount;
  const balanceLabel = getBalanceLabel(getBalanceState(profile.currentBalance, { overdue: currentBalance >= 50000000 }), 'partner');
  const quickAmounts = [
    { label: '۱ میلیون', value: 1000000 },
    { label: '۵ میلیون', value: 5000000 },
    { label: '۱۰ میلیون', value: 10000000 },
    { label: 'کل مانده', value: currentBalance },
  ].filter((chip, index, rows) => chip.value > 0 && rows.findIndex((row) => row.value === chip.value) === index);
  const noteTemplates = [
    { id: ledgerDirection === 'payment' ? 'card' : 'adjust', value: ledgerDirection === 'payment' ? 'پرداخت کارت‌به‌کارت بابت تسویه' : 'دریافت بابت اصلاح حساب' },
    { id: 'cash', value: 'پرداخت نقدی' },
    { id: 'bank', value: 'حواله بانکی' },
    { id: 'tracking', value: 'شماره پیگیری: ' },
  ];

  return (
    <Modal
      title={`${ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'} ${profile.partnerName}`}
      onClose={() => setIsLedgerModalOpen(false)}
      widthClass="max-w-5xl"
      iconClass="fa-solid fa-money-bill-transfer"
      tone={ledgerDirection === 'receipt' ? 'success' : 'warning'}
      variant="operational"
    >
      <form onSubmit={handleLedgerSubmit} className="space-y-4" dir="rtl" data-ledger-direction={ledgerDirection}>
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60" aria-labelledby="ledger-transaction-type-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 id="ledger-transaction-type-title" className="text-base font-bold text-slate-950 dark:text-white">نوع تراکنش همکار</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">جهت تراکنش را پیش از ورود مبلغ مشخص کنید.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="نوع تراکنش همکار">
              {[
                { key: 'payment', title: 'پرداخت به همکار', sub: 'کاهش بدهی فروشگاه', icon: 'fa-upload', variant: 'warning' },
                { key: 'receipt', title: 'دریافت از همکار', sub: 'برگشت وجه یا اصلاح حساب', icon: 'fa-download', variant: 'success' },
              ].map((item) => {
                const active = ledgerDirection === item.key;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerDirection(item.key as any)}
                    variant={active ? item.variant : 'secondary'}
                    size="md"
                    aria-pressed={active}
                    role="radio"
                    aria-checked={active}
                    leftIcon={<i className={`fa-solid ${item.icon}`} aria-hidden="true" />}
                  >
                    <span className="text-start">
                      <span className="block font-bold">{item.title}</span>
                      <span className="mt-0.5 block text-xs opacity-80">{item.sub}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <FormErrorSummary
          errors={ledgerFormErrors as any}
          labels={{ amount: ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی', transactionDate: 'تاریخ ثبت مالی', description: 'شرح تراکنش' }}
          fieldIdMap={{ amount: 'ledgerAmount', transactionDate: 'ledgerTransactionDate', description: 'ledgerDescription' }}
        />

        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">دفتر حساب همکار</p>
              <h3 className="mt-1 break-words text-base font-bold text-slate-950 dark:text-white">{profile.partnerName}</h3>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">مانده فعلی</p>
              <p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">{currentBalance.toLocaleString('fa-IR')} تومان</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{balanceLabel}</p>
            </div>
            <div className={`rounded-xl border p-3 ${nextBalance <= 0 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30' : nextBalance >= 50000000 ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'}`}>
              <p className="text-xs text-slate-600 dark:text-slate-300">مانده بعد از ثبت</p>
              <p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">{nextBalance.toLocaleString('fa-IR')} تومان</p>
            </div>
          </aside>

          <section className="min-w-0 space-y-4" aria-label="اطلاعات تراکنش">
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label={ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی'} iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amount}>
                <PriceInput id="ledgerAmount" name="amount" value={String(newLedgerEntry.debit || '')} onChange={handleLedgerInputChange} preview="مثال: ۵۰۰۰۰۰۰" topLabel="" suffix="" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAmounts.map((chip) => (
                    <Button key={chip.label} type="button" variant="secondary" size="sm" onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}>
                      {chip.label}
                    </Button>
                  ))}
                </div>
              </ModalField>

              <ModalField label="تاریخ ثبت مالی" iconClass="fa-solid fa-calendar-day" required error={ledgerFormErrors.transactionDate}>
                <ShamsiDatePicker id="ledgerTransactionDate" selectedDate={ledgerDateSelected} onDateChange={setLedgerDateSelected} invalid={Boolean(ledgerFormErrors.transactionDate)} size="compact" hideIcon />
              </ModalField>
            </div>

            <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description}>
              <TextareaField id="ledgerDescription" name="description" value={newLedgerEntry.description} onChange={handleLedgerInputChange} rows={3} required placeholder="مثلاً: پرداخت کارت‌به‌کارت بابت تسویه گوشی" />
              <div className="mt-2 flex flex-wrap gap-2">
                {noteTemplates.map((note) => {
                  const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                  return (
                    <Button
                      key={`${ledgerDirection}-${note.id}`}
                      type="button"
                      variant={isActive ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={isActive}
                      onClick={() => handleLedgerInputChange({ target: { name: 'description', value: note.value } })}
                    >
                      {note.value}
                    </Button>
                  );
                })}
              </div>
            </ModalField>
          </section>
        </div>

        <ModalActions
          onCancel={() => setIsLedgerModalOpen(false)}
          submitText={ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'}
          submittingText="در حال ثبت..."
          isSubmitting={isSubmittingLedger}
          submitDisabled={!token}
          align="end"
        />
      </form>
    </Modal>
  );
};

export default PartnerLedgerPaymentModal;
