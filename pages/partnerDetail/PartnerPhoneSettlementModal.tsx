import React from 'react';
import { TextareaField } from '@/components/ui';
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
    Button,
    FinancialProgressBar,
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    formatCurrencyText,
    handlePhoneSettlementAmountChange,
    handlePhoneSettlementSubmit,
    isSubmittingPhoneSettlement,
    phoneSettlementAmount,
    phoneSettlementDateSelected,
    phoneSettlementErrors,
    phoneSettlementItem,
    phoneSettlementNote,
    phoneSettlementNoteTemplates,
    readStoredCurrencyUnit,
    setPhoneSettlementAmount,
    setPhoneSettlementDateSelected,
    setPhoneSettlementErrors,
    setPhoneSettlementItem,
    setPhoneSettlementNote,
    token,
  } = ctx;

  if (!phoneSettlementItem) return null;

  const settlementBasis = Number(phoneSettlementItem.settlementPurchasePrice || phoneSettlementItem.soldDailyPurchasePrice || phoneSettlementItem.purchasePrice || 0);
  const settlementPaid = Number(phoneSettlementItem.phoneSettlementPaidAmount || 0);
  const settlementRemaining = Math.max(0, settlementBasis - settlementPaid);
  const settlementProgress = settlementBasis > 0 ? Math.min(100, Math.max(0, Math.round((settlementPaid / settlementBasis) * 100))) : 0;
  const quickAmounts = [
    { label: 'کل مانده', value: settlementRemaining, icon: 'fa-circle-check' },
    { label: 'نصف مانده', value: Math.floor(settlementRemaining / 2), icon: 'fa-percent' },
    { label: '۵ میلیون', value: Math.min(5000000, settlementRemaining), icon: 'fa-coins' },
    { label: '۱۰ میلیون', value: Math.min(10000000, settlementRemaining), icon: 'fa-sack-dollar' },
  ].filter((chip, index, rows) => chip.value > 0 && rows.findIndex((row) => row.value === chip.value) === index);

  return (
    <Modal
      title="ثبت پرداخت مرتبط با گوشی"
      onClose={() => setPhoneSettlementItem(null)}
      widthClass="max-w-4xl"
      iconClass="fa-solid fa-mobile-screen-button"
      tone="warning"
      variant="operational"
    >
      <form onSubmit={handlePhoneSettlementSubmit} className="space-y-4" dir="rtl">
        <FormErrorSummary
          errors={phoneSettlementErrors as any}
          labels={{ amount: 'مبلغ پرداخت روی همین گوشی', transactionDate: 'تاریخ پرداخت', note: 'شرح پرداخت' }}
          fieldIdMap={{ amount: 'phoneSettlementAmount', transactionDate: 'phoneSettlementDate', note: 'phoneSettlementNote' }}
        />

        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">پرداخت متصل به همین گوشی</p>
              <h3 className="mt-1 break-words text-base font-bold text-slate-950 dark:text-white">{phoneSettlementItem.name || 'گوشی فروخته‌شده'}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                {phoneSettlementItem.identifier ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                    <i className="fa-solid fa-barcode" aria-hidden="true" />
                    <bdi dir="ltr">IMEI: {phoneSettlementItem.identifier}</bdi>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                  <i className="fa-solid fa-tag" aria-hidden="true" />
                  {phoneSettlementItem.settlementPriceSourceLabel || 'قیمت خرید روز'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs text-amber-800 dark:text-amber-200">مانده سرمایه همین گوشی</p>
              <p className="mt-1 break-words text-lg font-bold text-amber-900 dark:text-amber-100">{formatCurrencyText(settlementRemaining, readStoredCurrencyUnit())}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'مبنای سرمایه', value: formatCurrencyText(settlementBasis, readStoredCurrencyUnit()) },
                { label: 'سرمایه بازگشتی', value: formatCurrencyText(settlementPaid, readStoredCurrencyUnit()) },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{metric.value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>پیشرفت تسویه</span>
                <span>{settlementProgress.toLocaleString('fa-IR')}٪</span>
              </div>
              <FinancialProgressBar value={settlementProgress} showPercent={false} tone={settlementProgress >= 100 ? 'emerald' : settlementProgress > 0 ? 'amber' : 'slate'} ariaLabel={`پیشرفت تسویه ${settlementProgress} درصد`} />
            </div>
          </aside>

          <section className="min-w-0 space-y-4" aria-label="فرم ثبت پرداخت گوشی">
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label="مبلغ پرداخت روی همین گوشی" iconClass="fa-solid fa-coins" required error={phoneSettlementErrors.amount}>
                <PriceInput id="phoneSettlementAmount" name="amount" value={String(phoneSettlementAmount || '')} onChange={handlePhoneSettlementAmountChange} preview="مثال: ۵۰۰۰۰۰۰" />
                {quickAmounts.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickAmounts.map((chip) => (
                      <Button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setPhoneSettlementAmount(chip.value);
                          if (phoneSettlementErrors.amount) setPhoneSettlementErrors((previous) => ({ ...previous, amount: undefined }));
                        }}
                        variant="secondary"
                        size="sm"
                        leftIcon={<i className={`fa-solid ${chip.icon}`} aria-hidden="true" />}
                      >
                        {chip.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </ModalField>

              <ModalField label="تاریخ پرداخت" iconClass="fa-solid fa-calendar-day" required error={phoneSettlementErrors.transactionDate}>
                <ShamsiDatePicker id="phoneSettlementDate" selectedDate={phoneSettlementDateSelected} onDateChange={setPhoneSettlementDateSelected} invalid={Boolean(phoneSettlementErrors.transactionDate)} size="compact" hideIcon />
              </ModalField>
            </div>

            <ModalField label="شرح پرداخت" iconClass="fa-solid fa-note-sticky" required error={phoneSettlementErrors.note}>
              <TextareaField
                id="phoneSettlementNote"
                value={phoneSettlementNote}
                onChange={(event) => {
                  setPhoneSettlementNote(event.target.value);
                  if (phoneSettlementErrors.note) setPhoneSettlementErrors((previous) => ({ ...previous, note: undefined }));
                }}
                rows={3}
                placeholder="مثلاً: کارت‌به‌کارت بابت تسویه همین گوشی"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {phoneSettlementNoteTemplates.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    onClick={() => {
                      setPhoneSettlementNote(template.text);
                      if (phoneSettlementErrors.note) setPhoneSettlementErrors((previous) => ({ ...previous, note: undefined }));
                    }}
                    variant={phoneSettlementNote === template.text ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={phoneSettlementNote === template.text}
                    leftIcon={<i className={`fa-solid ${template.icon}`} aria-hidden="true" />}
                  >
                    {template.label}
                  </Button>
                ))}
                {phoneSettlementNote ? <Button type="button" onClick={() => setPhoneSettlementNote('')} variant="ghost" size="sm">پاک‌کردن توضیح</Button> : null}
              </div>
            </ModalField>
          </section>
        </div>

        <ModalActions
          onCancel={() => setPhoneSettlementItem(null)}
          submitText="ثبت پرداخت همین گوشی"
          submittingText="در حال ثبت پرداخت..."
          isSubmitting={isSubmittingPhoneSettlement}
          submitDisabled={!token || settlementRemaining <= 0}
          align="end"
        />
      </form>
    </Modal>
  );
};

export default PartnerPhoneSettlementModal;
