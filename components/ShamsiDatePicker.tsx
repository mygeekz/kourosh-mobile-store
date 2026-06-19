// src/components/ShamsiDatePicker.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import moment from 'jalali-moment';
import { useStyle } from '../contexts/StyleContext';

type Props = {
  id?: string;
  // New API
  selectedDate?: Date | null;
  onDateChange?: (d: Date | null) => void;
  // Backward-compatible API
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  inputClassName?: string;
  preview?: string;
  disabled?: boolean;
};

/**
 * تقویم شمسی سبک‌وزن با استایل دارک/لایت متناسب با پروژه
 * - بدون وابستگی خارجی
 * - راست‌چین
 * - فرمت ورودی: jYYYY/jMM/jDD
 */
const ShamsiDatePicker: React.FC<Props> = ({
  id,
  selectedDate,
  onDateChange,
  value,
  onChange,
  inputClassName = '',
  preview = 'انتخاب تاریخ',
  disabled = false,
}) => {
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [open, setOpen] = useState(false);
  const effectiveDate = (selectedDate ?? value) ?? null;
  const emitChange = (d: Date | null) => {
    (onDateChange ?? onChange)?.(d);
  };

  const [view, setView] = useState(() =>
    moment(effectiveDate || new Date()).locale('fa')
  ); // ماهی که نمایش می‌دهیم

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // بستن با کلیک بیرون (با Portal سازگار)
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  // مقدار ورودی به فرمت شمسی
  const [focusedDay, setFocusedDay] = useState<moment.Moment | null>(null);

  const inputValue = useMemo(() => {
    if (!effectiveDate) return '';
    return moment(effectiveDate).locale('fa').format('jYYYY/jMM/jDD');
  }, [effectiveDate]);

  // روزهای تقویم (با فاصله‌های اول ماه)
  const grid = useMemo(() => {
    const startOfMonth = view.clone().startOf('jMonth');
    const daysInMonth = view.clone().jDaysInMonth();
    // ۱=شنبه … 7=جمعه (برای چیدمان RTL، شنبه را ستون اول می‌گیریم)
    const weekDayIndex = Number(startOfMonth.format('d')); // 0..6 (یکشنبه=0)
    // تبدیل به الگوی ما (شنبه=0)
    const startPad = (weekDayIndex + 1) % 7; // یکشنبه(0) -> 1 => شنبه(0)

    const cells: Array<{ d: moment.Moment; inMonth: boolean }> = [];

    // روزهای قبل از ماه
    for (let i = 0; i < startPad; i++) {
      const d = startOfMonth.clone().subtract(startPad - i, 'day');
      cells.push({ d, inMonth: false });
    }
    // خود ماه
    for (let i = 0; i < daysInMonth; i++) {
      cells.push({ d: startOfMonth.clone().add(i, 'day'), inMonth: true });
    }
    // کامل کردن تا مضرب 7
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].d;
      cells.push({ d: last.clone().add(1, 'day'), inMonth: false });
    }
    return cells;
  }, [view]);

  const isSameDay = (a: Date | null, b: moment.Moment) => {
    if (!a) return false;
    const ma = moment(a).locale('fa');
    return ma.isSame(b, 'day') && ma.isSame(b, 'month') && ma.isSame(b, 'year');
  };

  useEffect(() => {
    if (!open) return;
    const next = effectiveDate ? moment(effectiveDate).locale('fa') : view.clone().startOf('jMonth');
    setFocusedDay(next);
  }, [open, effectiveDate, view]);

  useEffect(() => {
    if (!open || !focusedDay) return;
    const key = focusedDay.format('jYYYY/jMM/jDD');
    const node = dayButtonRefs.current[key];
    node?.focus();
  }, [open, focusedDay, grid]);

  // انتخاب روز
  const pick = (m: moment.Moment) => {
    emitChange(m.toDate());
    closePanel(true);
  };

  // پارس ورودی دستی کاربر
  const onInputManual = (val: string) => {
    const m = moment(val, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true).locale('fa');
    if (m.isValid()) {
      emitChange(m.toDate());
      setView(m.clone());
    }
  };

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closePanel(false);
    }
  };

  const handleCalendarKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (!focusedDay) return;
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      closePanel(true);
      return;
    }

    let next: moment.Moment | null = null;
    if (e.key === 'ArrowRight') next = focusedDay.clone().subtract(1, 'day');
    else if (e.key === 'ArrowLeft') next = focusedDay.clone().add(1, 'day');
    else if (e.key === 'ArrowUp') next = focusedDay.clone().subtract(7, 'day');
    else if (e.key === 'ArrowDown') next = focusedDay.clone().add(7, 'day');
    else if (e.key === 'Home') next = view.clone().startOf('jMonth');
    else if (e.key === 'End') next = view.clone().endOf('jMonth');
    else if (e.key === 'PageUp') next = focusedDay.clone().subtract(1, 'jMonth');
    else if (e.key === 'PageDown') next = focusedDay.clone().add(1, 'jMonth');
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(focusedDay);
      return;
    }

    if (next) {
      e.preventDefault();
      setView((current) => {
        const nextView = current.clone();
        if (!next.isSame(current, 'jMonth') || !next.isSame(current, 'jYear')) {
          nextView.jYear(next.jYear());
          nextView.jMonth(next.jMonth());
        }
        return nextView;
      });
      setFocusedDay(next);
    }
  };

  // کلاس‌های تم (دارک/لایت)
  // Panel as a portal so it won't be clipped inside scrollable modals
  const panelCls =
    'fixed z-[9999] w-[22rem] rounded-[28px] border border-slate-200/90 bg-white p-4 text-slate-800 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.45)] ' +
    'dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100 dark:shadow-[0_30px_80px_-30px_rgba(2,6,23,0.88)]';
  const cellBase =
    'h-11 w-11 inline-flex items-center justify-center rounded-2xl text-base font-black select-none transition-all duration-200';
  const headerBtn =
    'inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 ' +
    'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const closePanel = (shouldRestoreFocus = false) => {
    setOpen(false);
    if (shouldRestoreFocus) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 320; // w-80
    const gap = 8;
    // RTL: align to the right edge of the input
    let left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
    let top = r.bottom + gap;
    // اگر پایین جا نشد، بالا باز شود
    const panelHeightGuess = 360;
    if (top + panelHeightGuess > window.innerHeight - 8) {
      top = Math.max(8, r.top - gap - panelHeightGuess);
    }
    setPanelPos({ top, left });
  }, [open, inputValue]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      // Reposition on scroll/resize
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 320;
      const gap = 8;
      let left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      let top = r.bottom + gap;
      const panelHeightGuess = 360;
      if (top + panelHeightGuess > window.innerHeight - 8) {
        top = Math.max(8, r.top - gap - panelHeightGuess);
      }
      setPanelPos({ top, left });
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  return (
    <div className="app-date-field app-form-field app-form-field--date app-form-field--with-trailing-icon" ref={wrapperRef} dir="ltr" data-ui-field="true" data-ui-field-kind="date" data-open={open ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'}>
      <div
        className={['app-date-field__control', inputClassName].filter(Boolean).join(' ')}
        onClick={() => !disabled && setOpen(true)}
      >
        <input
          id={id}
          ref={inputRef}
          type="text"
          dir="ltr"
          value={inputValue}
          onChange={(e) => onInputManual(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={preview}
          disabled={disabled}
          data-app-date-input="true"
          data-ui-control="true"
          data-ui-control-kind="date"
          className="app-date-field__input app-form-field__control"
        />

        <span className="app-date-field__icon" aria-hidden="true">
          <i className="fa-regular fa-calendar" style={open ? undefined : { color: brand }} />
        </span>
      </div>

      {open && panelPos && createPortal(
        <div ref={panelRef} role="dialog" aria-modal="false" className={panelCls} style={{ top: panelPos.top, left: panelPos.left }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          {/* هدر ماه/سال */}
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              className={`calendar-nav-btn ${headerBtn}`}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setView((v) => v.clone().subtract(1, 'jMonth'))}
              aria-label="ماه قبل"
              title="ماه قبل"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>

            <div className="rounded-2xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white">
              {view.format('jYYYY')} &nbsp; {view.format('jMMMM')}
            </div>

            <button
              type="button"
              className={`calendar-nav-btn ${headerBtn}`}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setView((v) => v.clone().add(1, 'jMonth'))}
              aria-label="ماه بعد"
              title="ماه بعد"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
          </div>

          {/* نام روزها */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => (
              <div key={w} className="h-7 flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          {/* شبکه روزها */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ d, inMonth }, idx) => {
              const today = moment().locale('fa');
              const isToday = d.isSame(today, 'day');
              const selected = isSameDay(effectiveDate, d);

              const muted =
                !inMonth ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-100';

              const base =
                cellBase +
                ' ' +
                (selected
                  ? 'text-white shadow-[0_18px_40px_-20px_rgba(14,165,233,0.75)]'
                  : isToday
                  ? 'border border-sky-200 bg-sky-50 text-sky-700 shadow-[0_10px_30px_-20px_rgba(14,165,233,0.7)] dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200'
                  : 'border border-transparent bg-slate-50/90 dark:bg-slate-900/70');

              const dayStyle = selected
                ? { background: `linear-gradient(135deg, ${brand} 0%, hsl(${style.primaryHue} 82% 44%) 100%)` }
                : undefined;

              return (
                <button
                  key={idx}
                  ref={(node) => { dayButtonRefs.current[d.format('jYYYY/jMM/jDD')] = node; }}
                  type="button"
                  data-skip-global-button="true"
                  tabIndex={focusedDay && d.isSame(focusedDay, 'day') ? 0 : -1}
                  onFocus={() => setFocusedDay(d)}
                  onKeyDown={handleCalendarKeyDown}
                  onClick={() => pick(d)}
                  className={['calendar-day-btn',
                    base,
                    muted,
                    !selected &&
                      'hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.38)] dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white',
                  ].join(' ')}
                  style={dayStyle}
                  title={d.format('jYYYY/jMM/jDD')}
                >
                  {d.format('jD')}
                </button>
              );
            })}
          </div>

          {/* اکشن‌ها */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              data-skip-global-button="true"
              className="calendar-action-btn rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => {
                const now = moment().locale('fa');
                setView(now);
                setFocusedDay(now);
                emitChange(now.toDate());
                closePanel(true);
              }}
            >
              امروز
            </button>

            <button
              type="button"
              data-skip-global-button="true"
              className="calendar-action-btn rounded-2xl px-4 py-2 text-xs font-black text-white shadow-[0_18px_40px_-20px_rgba(14,165,233,0.85)] transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: brand }}
              onClick={() => closePanel(true)}
            >
              تایید
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* CSS متغیر برند برای رینگ امروز */}
      <style>{`:root { --brand: ${brand}; }`}</style>
    </div>
  );
};

export default ShamsiDatePicker;
