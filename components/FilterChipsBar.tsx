import React, { useRef } from 'react';
import Button from './Button';

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
  ariaLabel?: string;
};

/**
 * A horizontally scrollable, mobile-first filter chip bar.
 * Works nicely inside TableToolbar.secondaryRow.
 */
const FilterChipsBar: React.FC<Props> = ({ chips, value, onChange, className, ariaLabel = 'فیلترهای سریع' }) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusChip = (idx: number) => {
    const next = refs.current[idx];
    next?.focus();
    next?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div className={className ?? ''} dir="rtl">
      <div className="ux-filter-chip-bar flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label={ariaLabel}>
        {chips.map((c, idx) => {
          const active = c.key === value;
          return (
            <Button
              key={c.key}
              ref={(el) => { refs.current[idx] = el; }}
              type="button"
              variant={active ? 'neutral' : 'secondary'}
              size="xs"
              autoIcon={false}
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
              className="ux-filter-button"
              title={c.label}
              role="tab"
              aria-selected={active}
              aria-pressed={active}
              leftIcon={c.icon ? <i className={c.icon} /> : undefined}
            >
              <span className="ux-filter-button__label">{c.label}</span>
              {typeof c.count === 'number' ? (
                <span className="ux-filter-button__count !h-auto !min-w-0 !rounded-none !border-0 !bg-transparent !px-0 !shadow-none !text-current">{c.count.toLocaleString('fa-IR')}</span>
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChipsBar;
