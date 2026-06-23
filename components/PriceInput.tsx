import React from 'react';
import { cn } from '../utils/cn';
import {
  formatNumberWithCommas,
  convertNumberToPersianWords,
} from '../utils/numberUtils';

interface PriceInputProps {
  id?: string;
  name?: string;
  value: string | number; // مقدار خام از استیت والد
  onChange: (e: { target: { name: string; value: string } }) => void; // ارسال رشتهٔ عددیِ خام
  preview?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  topLabel?: string;
  suffix?: string;
  prefix?: string;
  tone?: 'auto' | 'money' | 'percent' | 'quantity' | 'neutral';
}

/** تبدیل ارقام فارسی/عربی به لاتین */
const normalizeDigits = (s: string) =>
  (s || '').replace(/[۰-۹٠-٩]/g, (d) =>
    '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(d) <= 9
      ? String('0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
      : String('0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d) - 10])
  );

/** حذف مورد کاما، فاصله، نیم‌فاصله، NBSP و… */
const stripGroupChars = (s: string) => s.replace(/[,\s\u200c\u200f\u202f]/g, '');

const toCleanNumericString = (s: string): string => {
  const raw = stripGroupChars(normalizeDigits(s));
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return '0';
  return String(Math.round(n));
};

const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  id,
  name = '',
  preview,
  className,
  disabled,
  onBlur,
  topLabel = 'مبلغ',
  suffix = 'تومان',
  prefix,
  tone = 'auto',
}) => {
  // مقدار ورودیِ قابل نمایش (با کاما)
  const raw = typeof value === 'number' ? String(value) : String(value ?? '');
  const clean = toCleanNumericString(raw);
  const numeric = clean === '' ? 0 : Number(clean);
  const displayValue = clean === '' ? '' : formatNumberWithCommas(numeric);
  const words = numeric > 0 ? convertNumberToPersianWords(String(numeric)) : '';


  const resolvedTone = (() => {
    if (tone !== 'auto') return tone;
    const hint = `${topLabel ?? ''} ${suffix ?? ''} ${prefix ?? ''} ${name ?? ''} ${preview ?? ''}`;
    if (/[٪%]|درصد/.test(hint)) return 'percent';
    if (/عدد|تعداد|ماه|qty|count/i.test(hint)) return 'quantity';
    if (/تومان|ریال|مبلغ|قیمت|فی|هزینه|اجرت|نهایی|برآورد/.test(hint)) return 'money';
    return 'neutral';
  })();

  const toneStyles = {
    money: {
      input:
        'border-emerald-200/80 bg-emerald-50/50   dark:border-emerald-900/60 dark:bg-emerald-950/20 ',
      label:
        'border-emerald-200 bg-emerald-50 text-emerald-700 group-focus-within:border-emerald-300 group-focus-within:bg-emerald-100/80 group-focus-within:text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:group-focus-within:border-emerald-700 dark:group-focus-within:bg-emerald-900/40 dark:group-focus-within:text-emerald-200',
      suffix:
        'border-emerald-200 bg-emerald-50 text-emerald-700 group-focus-within:border-emerald-300 group-focus-within:bg-emerald-100/80 group-focus-within:text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:group-focus-within:border-emerald-700 dark:group-focus-within:bg-emerald-900/40 dark:group-focus-within:text-emerald-200',
    },
    percent: {
      input:
        'border-violet-200/80 bg-violet-50/50   dark:border-violet-900/60 dark:bg-violet-950/20 ',
      label:
        'border-violet-200 bg-violet-50 text-violet-700 group-focus-within:border-violet-300 group-focus-within:bg-violet-100/80 group-focus-within:text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300 dark:group-focus-within:border-violet-700 dark:group-focus-within:bg-violet-900/40 dark:group-focus-within:text-violet-200',
      suffix:
        'border-violet-200 bg-violet-50 text-violet-700 group-focus-within:border-violet-300 group-focus-within:bg-violet-100/80 group-focus-within:text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300 dark:group-focus-within:border-violet-700 dark:group-focus-within:bg-violet-900/40 dark:group-focus-within:text-violet-200',
    },
    quantity: {
      input:
        'border-amber-200/80 bg-amber-50/50   dark:border-amber-900/60 dark:bg-amber-950/20 ',
      label:
        'border-amber-200 bg-amber-50 text-amber-700 group-focus-within:border-amber-300 group-focus-within:bg-amber-100/80 group-focus-within:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300 dark:group-focus-within:border-amber-700 dark:group-focus-within:bg-amber-900/40 dark:group-focus-within:text-amber-200',
      suffix:
        'border-amber-200 bg-amber-50 text-amber-700 group-focus-within:border-amber-300 group-focus-within:bg-amber-100/80 group-focus-within:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300 dark:group-focus-within:border-amber-700 dark:group-focus-within:bg-amber-900/40 dark:group-focus-within:text-amber-200',
    },
    neutral: {
      input: '',
      label:
        'border-slate-200 bg-slate-50 text-slate-500 group-focus-within:border-sky-200 group-focus-within:bg-sky-50 group-focus-within:text-sky-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400 dark:group-focus-within:border-sky-500/50 dark:group-focus-within:bg-sky-500/10 dark:group-focus-within:text-sky-300',
      suffix:
        'border-slate-200 bg-slate-50 text-slate-500 group-focus-within:border-sky-200 group-focus-within:bg-sky-50 group-focus-within:text-sky-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400 dark:group-focus-within:border-sky-500/50 dark:group-focus-within:bg-sky-500/10 dark:group-focus-within:text-sky-300',
    },
  } as const;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanOut = toCleanNumericString(e.target.value);
    onChange({ target: { name, value: cleanOut } }); // فقط عدد خام بدون جداکننده
  };

  const mergedInputClassName = cn(
    'price-input__field app-form-field__control unified-form-control unified-number-input w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black tracking-tight text-slate-900 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.35)] outline-none transition-all duration-200 preview:font-medium preview:text-slate-400     disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:preview:text-slate-500  ',
    toneStyles[resolvedTone].input,
    className,
  );

  const suffixText = (prefix ? `${prefix} · ${suffix || ''}`.trim().replace(/ · $/, '') : suffix) || '';
  const hasMetaChips = Boolean((topLabel || '').trim() || suffixText);

  return (
    <div className="price-input app-form-field app-form-field--price group w-full" data-ui-field="true" data-ui-field-kind="price">
      {hasMetaChips ? (
      <div className="mb-2 flex items-center justify-between gap-2">
        {suffixText ? (
          <span className={cn(
            'unified-field-chip pointer-events-none inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black transition-colors duration-200',
            toneStyles[resolvedTone].suffix,
          )}>
            {suffixText}
          </span>
        ) : <span />}
        {topLabel ? (
        <span className={cn(
          'unified-field-chip pointer-events-none inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black transition-colors duration-200',
          toneStyles[resolvedTone].label,
        )}>
          {topLabel}
        </span>
        ) : <span />}
      </div>
      ) : null}
      <input
        type="text"
        inputMode="numeric"
        data-number-field="true"
        data-ui-control="true"
        data-ui-control-kind="number"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={preview}
        className={mergedInputClassName}
        disabled={disabled}
        autoComplete="off"
        dir="ltr"
      />
      <div className={cn('min-h-[1.1rem] text-xs text-slate-500 dark:text-slate-400 text-right', hasMetaChips ? 'mt-1.5' : 'mt-2')}>
        {words}
      </div>
    </div>
  );
};

export default PriceInput;
