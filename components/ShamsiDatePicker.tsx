// src/components/ShamsiDatePicker.tsx
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import { useStyle } from '../contexts/StyleContext';
import PortalLayer from './ui/PortalLayer';
import { resolveFloatingOverlayPosition } from '../utils/floatingOverlayPosition';

const CALENDAR_PANEL_WIDTH = 352;
const CALENDAR_PANEL_HEIGHT_FALLBACK = 430;
const CALENDAR_VIEWPORT_MARGIN = 8;
const CALENDAR_ANCHOR_GAP = 8;

type Props = {
  id?: string;
  // New API
  selectedDate?: Date | null;
  onDateChange?: (d: Date | null) => void;
  // Backward-compatible API
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  className?: string;
  inputClassName?: string;
  preview?: string;
  disabled?: boolean;
  hideIcon?: boolean;
  invalid?: boolean;
  size?: 'standard' | 'compact' | 'dense';
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
  className = '',
  inputClassName = '',
  preview = 'انتخاب تاریخ',
  disabled = false,
  hideIcon = false,
  invalid = false,
  size = 'standard',
}) => {
  const generatedId = useId().replace(/:/g, '');
  const calendarId = `${id || `shamsi-date-${generatedId}`}-calendar`;
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
  const [draftValue, setDraftValue] = useState(inputValue);

  useEffect(() => {
    setDraftValue(inputValue);
  }, [inputValue]);

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
    setDraftValue(val);
    const normalizedValue = String(val || '')
      .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    const m = moment(normalizedValue, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true).locale('fa');
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

  // The field and calendar use stable semantic classes. Geometry and all
  // interaction states are owned by date-field.css; no utility class is allowed
  // to move the native input or calendar controls on hover.
  const panelCls = 'app-date-popover-panel';
  const headerBtn = 'calendar-nav-btn';

  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const closePanel = (shouldRestoreFocus = false) => {
    setOpen(false);
    if (shouldRestoreFocus) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const updatePanelPosition = useCallback(() => {
    if (!open || typeof window === 'undefined') return;
    const el = wrapperRef.current;
    if (!el) return;
    const anchor = el.getBoundingClientRect();
    const panelHeight = panelRef.current?.getBoundingClientRect().height
      || CALENDAR_PANEL_HEIGHT_FALLBACK;
    setPanelPos(resolveFloatingOverlayPosition({
      anchor,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      preferredWidth: CALENDAR_PANEL_WIDTH,
      panelHeight,
      margin: CALENDAR_VIEWPORT_MARGIN,
      gap: CALENDAR_ANCHOR_GAP,
    }));
  }, [open]);

  useLayoutEffect(() => {
    updatePanelPosition();
  }, [inputValue, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(onScrollOrResize);
    if (wrapperRef.current) resizeObserver?.observe(wrapperRef.current);
    if (panelRef.current) resizeObserver?.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      resizeObserver?.disconnect();
    };
  }, [open, updatePanelPosition]);

  const rootClassName = [
    'app-date-field app-form-field--date',
    hideIcon ? 'app-date-field--no-icon' : 'app-date-field--with-icon',
    className,
  ].filter(Boolean).join(' ');

  const controlClassName = 'app-date-field__control';
  const nativeInputClassName = ['app-date-field__input', inputClassName].filter(Boolean).join(' ');

  return (
    <div
      className={rootClassName}
      ref={wrapperRef}
      dir="ltr"
      data-ui-field="true"
      data-ui-field-kind="date"
      data-date-stable="true"
      data-date-size={size}
      data-invalid={invalid ? 'true' : 'false'}
      data-field-state={invalid ? 'error' : 'default'}
      data-open={open ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      style={{ '--date-accent': brand } as React.CSSProperties}
    >
      <div
        className={controlClassName}
        data-date-stable-control="true"
        onClick={() => !disabled && setOpen(true)}
      >
        <input
          id={id}
          ref={inputRef}
          type="text"
          dir="ltr"
          value={draftValue}
          onChange={(e) => onInputManual(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={preview}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? calendarId : undefined}
          aria-invalid={invalid || undefined}
          data-app-date-input="true"
          data-date-geometry-lock="true"
          data-date-stable-input="true"
          data-ui-control="true"
          data-ui-control-kind="date"
          className={nativeInputClassName}
        />
        {!hideIcon ? (
          <span className="app-date-field__icon" aria-hidden="true">
            <i className="fa-regular fa-calendar" style={open ? undefined : { color: brand }} />
          </span>
        ) : null}
      </div>

      {open && panelPos ? (
        <PortalLayer layer="popover" className="app-date-popover-layer">
          <div
            id={calendarId}
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="تقویم شمسی"
            data-placement={panelPos.placement}
            className={panelCls}
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              '--date-accent': brand,
            } as React.CSSProperties}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
          {/* هدر ماه/سال */}
          <div className="app-date-popover-header">
            <button
              type="button"
              className={headerBtn}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setView((v) => v.clone().subtract(1, 'jMonth'))}
              aria-label="ماه قبل"
              title="ماه قبل"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>

            <div className="app-date-popover-title">
              {view.format('jYYYY')} &nbsp; {view.format('jMMMM')}
            </div>

            <button
              type="button"
              className={headerBtn}
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
          <div className="app-date-weekdays">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => (
              <div key={w} className="app-date-weekday">
                {w}
              </div>
            ))}
          </div>

          {/* شبکه روزها */}
          <div className="app-date-days-grid">
            {grid.map(({ d, inMonth }, idx) => {
              const today = moment().locale('fa');
              const isToday = d.isSame(today, 'day');
              const selected = isSameDay(effectiveDate, d);

              const dayClassName = [
                'calendar-day-btn',
                selected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                !inMonth ? 'is-outside-month' : '',
              ].filter(Boolean).join(' ');

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
                  className={dayClassName}
                  title={d.format('jYYYY/jMM/jDD')}
                >
                  {d.format('jD')}
                </button>
              );
            })}
          </div>

          {/* اکشن‌ها */}
          <div className="app-date-popover-actions">
            <button
              type="button"
              data-skip-global-button="true"
              className="calendar-action-btn calendar-action-btn--secondary"
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
              className="calendar-action-btn calendar-action-btn--primary"
              onClick={() => closePanel(true)}
            >
              تایید
            </button>
          </div>
          </div>
        </PortalLayer>
      ) : null}
    </div>
  );
};

export default ShamsiDatePicker;
