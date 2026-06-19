import React, { useRef } from 'react';

export type FilterChip = {
  key: string;
  label: string;
  icon?: string; // FontAwesome class (e.g. "fa-solid fa-clock")
  count?: number;
  disabled?: boolean;
};

type Props = {
  chips: FilterChip[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

/**
 * A horizontally scrollable, mobile-first filter chip bar.
 * Works nicely inside TableToolbar.secondaryRow.
 */
const FilterChipsBar: React.FC<Props> = ({ chips, value, onChange, className }) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusChip = (idx: number) => {
    const next = refs.current[idx];
    next?.focus();
    next?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div className={className ?? ''} dir="rtl">
      <div className="ux-filter-chip-bar flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="فیلترهای سریع">
        {chips.map((c, idx) => {
          const active = c.key === value;
          return (
            <button
              key={c.key}
              ref={(el) => { refs.current[idx] = el; }}
              type="button"
              disabled={c.disabled}
              onClick={() => !c.disabled && onChange(c.key)}
              onKeyDown={(e) => {
                const max = chips.length - 1;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  focusChip(idx <= 0 ? max : idx - 1);
                  return;
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  focusChip(idx >= max ? 0 : idx + 1);
                  return;
                }
                if (e.key === 'Home') {
                  e.preventDefault();
                  focusChip(0);
                  return;
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  focusChip(max);
                  return;
                }
                if ((e.key === 'Enter' || e.key === ' ') && !c.disabled) {
                  e.preventDefault();
                  onChange(c.key);
                }
              }}
              className={[
                'ux-filter-chip',
                active ? 'is-active' : '',
                c.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              title={c.label}
              role="tab"
              aria-selected={active}
              aria-pressed={active}
            >
              {c.icon ? <span className="ux-filter-chip__icon"><i className={c.icon} /></span> : null}
              <span className="leading-6">{c.label}</span>
              {typeof c.count === 'number' ? (
                <span className={['ux-filter-chip__count', active ? 'is-active' : ''].join(' ')}>
                  {c.count.toLocaleString('fa-IR')}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChipsBar;
