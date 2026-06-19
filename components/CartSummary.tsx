// components/CartSummary.tsx
import React, { useMemo } from 'react';
import PriceInput from './PriceInput';
import ShamsiDatePicker from './ShamsiDatePicker';
import { parseToman } from '../utils/money';
import { formatCurrencyText, readStoredCurrencyUnit, getCurrencyUnitLabel } from '../utils/currency';
import Button from './Button';
import type { Customer, CartItem } from '../types';

type PaymentMethod = 'cash' | 'credit';
type Summary = {
  subtotal: number;
  itemsDiscount: number;
  grandTotal: number;
};

type Props = {
  customers?: Customer[];
  selectedCustomerId?: number | null;
  onCustomerChange?: (id: number | null) => void;
  paymentMethod?: PaymentMethod;
  onPaymentChange?: (m: PaymentMethod) => void;
  items?: CartItem[];
  summary: Summary;
  globalDiscount: number;
  onGlobalDiscountChange?: (d: number) => void;
  notes?: string;
  onNotesChange?: (t: string) => void;
  salesDate?: Date | null;
  onDateChange?: (d: Date | null) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  loadingHint?: React.ReactNode;
  loadingStageStep?: number;
  loadingStageTotal?: number;
  loadingStageIcon?: React.ReactNode;
};

const fmt = (n: number) => formatCurrencyText(Number(n) || 0, readStoredCurrencyUnit());

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-right font-medium text-slate-900 outline-none transition    dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100  ';

const SectionLabel: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="mb-2.5">
    <div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</div>
    {hint ? <div className="mt-1 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">{hint}</div> : null}
  </div>
);

const CartSummary: React.FC<Props> = ({
  customers = [],
  selectedCustomerId = null,
  onCustomerChange = () => {},
  paymentMethod = 'cash',
  onPaymentChange = () => {},
  items = [],
  summary,
  globalDiscount,
  onGlobalDiscountChange = () => {},
  notes = '',
  salesDate = null,
  onDateChange = () => {},
  onNotesChange = () => {},
  onSubmit,
  isSubmitting = false,
  loadingHint,
  loadingStageStep,
  loadingStageTotal,
  loadingStageIcon,
}) => {
  const customerName = useMemo(() => {
    const c = customers.find((cu) => cu.id === selectedCustomerId);
    return c?.fullName || (c as any)?.name || 'مشتری مهمان';
  }, [customers, selectedCustomerId]);

  const handleDiscountChange = (e: any) => {
    const n = parseToman(String(e?.target?.value ?? ''));
    onGlobalDiscountChange(n);
  };

  return (
    <div className="sales-summary-foundation space-y-3.5 text-right" dir="rtl" data-ui-sales-summary="true">
      <div className="sales-summary-card rounded-[20px] border border-slate-200 bg-white/92 p-3 dark:border-slate-800 dark:bg-slate-950/70" data-ui-sales-summary-card="financial">
        <SectionLabel title="خلاصه مالی فاکتور" hint="وضعیت نهایی فاکتور را قبل از ثبت اطلاعات بررسی و ادامه کن." />
        <div className="space-y-2.5">
          {[
            ['جمع کل اقلام', fmt(summary.subtotal)],
            ['تخفیف اقلام', fmt(summary.itemsDiscount)],
            ['تخفیف کل', fmt(globalDiscount)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 px-3 py-2 dark:bg-slate-900/70">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
              <span className="text-[12px] font-black text-slate-900 dark:text-slate-100">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/85 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <span className="text-[12px] font-black text-emerald-700 dark:text-emerald-300">قابل پرداخت</span>
            <span className="text-[14px] font-black text-emerald-700 dark:text-emerald-300">{fmt(Math.max(Number(summary.grandTotal) || 0, 0))}</span>
          </div>
        </div>
      </div>

      <div className="sales-summary-card rounded-[20px] border border-slate-200 bg-white/92 p-3 dark:border-slate-800 dark:bg-slate-950/70" data-ui-sales-summary-card="settings">
        <SectionLabel title="تنظیمات نهایی فروش" hint="اطلاعات تکمیلی ثبت اطلاعات فاکتور را از این بخش کامل کن." />

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-black text-slate-700 dark:text-slate-200">تخفیف کل ({getCurrencyUnitLabel(readStoredCurrencyUnit())})</label>
            <PriceInput
              name="globalDiscount"
              value={String(globalDiscount ?? '')}
              onChange={handleDiscountChange}
              className={inputClass}
              preview="مثال: ۵۰,۰۰۰"
            />
          </div>

          {customers.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-slate-700 dark:text-slate-200">مشتری</label>
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              >
                <option value="">— مشتری مهمان —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c as any).fullName || (c as any).name}{(c as any).phone ? ` — ${(c as any).phone}` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">
                انتخاب‌شده: <span className="font-black text-slate-700 dark:text-slate-200">{customerName}</span>
              </p>
              {paymentMethod === 'credit' && !selectedCustomerId ? (
                <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5.5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  برای فروش اعتباری باید یک مشتری انتخاب شود تا مبلغ در دفتر حساب او ثبت اطلاعات شود.
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-black text-slate-700 dark:text-slate-200">روش پرداخت</label>
            <div className="sales-payment-method-grid grid grid-cols-2 gap-2" data-ui-sales-payment="true">
              {(['cash', 'credit'] as PaymentMethod[]).map((m) => {
                const active = paymentMethod === m;
                return (
                  <Button
                    key={m}
                    type="button"
                    onClick={() => onPaymentChange(m)}
                    variant={active ? (m === 'cash' ? 'success' : 'warning') : 'secondary'}
                    size="xs"
                    className="w-full justify-center sales-payment-chip"
                    leftIcon={<i className={m === 'cash' ? 'fa-solid fa-money-bill-wave' : 'fa-solid fa-file-invoice-dollar'} />}
                  >
                    {m === 'cash' ? 'نقدی' : 'اعتباری'}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-black text-slate-700 dark:text-slate-200">تاریخ فروش</label>
            <ShamsiDatePicker selectedDate={salesDate} onDateChange={onDateChange} preview="انتخاب تاریخ" />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-black text-slate-700 dark:text-slate-200">یادداشت‌ها</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              preview="توضیحات اختیاری..."
              className={`${inputClass} min-h-[92px] resize-y`}
            />
          </div>
        </div>
      </div>

      {onSubmit ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !items.length}
          loading={isSubmitting}
          loadingText="در حال ثبت اطلاعات…"
          loadingHint={loadingHint ?? (paymentMethod === 'credit' ? 'ثبت اطلاعات فروش اعتباری و به‌روزرسانی حساب مشتری' : 'ثبت اطلاعات فروش، کسر موجودی و صدور فاکتور')}
          loadingStageStep={loadingStageStep}
          loadingStageTotal={loadingStageTotal}
          loadingStageIcon={loadingStageIcon}
          successPulseText={paymentMethod === 'credit' ? 'فروش اعتباری ثبت اطلاعات شد' : 'فاکتور صادر شد'}
          successPulseHint={paymentMethod === 'credit' ? 'حساب مشتری با موفقیت به‌روزرسانی شد' : 'فروش و موجودی با موفقیت نهایی شد'}
          variant={paymentMethod === 'credit' ? 'warning' : 'success'}
          size="sm"
          className="w-full justify-center sales-submit-btn"
          leftIcon={<i className={paymentMethod === 'credit' ? 'fa-solid fa-file-circle-plus' : 'fa-solid fa-receipt'} />}
        >
          {paymentMethod === 'credit' ? 'ثبت اطلاعات فروش اعتباری' : 'ثبت اطلاعات نهایی فاکتور'}
        </Button>
      ) : null}
    </div>
  );
};

export default CartSummary;
