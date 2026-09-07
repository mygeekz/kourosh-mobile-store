import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Table } from '@tanstack/react-table';

import { Button, CheckboxField } from './ui';
import { cn } from '../utils/cn';

type Props<T> = {
  table: Table<T>;
  storageKey: string;
  label?: string;
  className?: string;
};

function safeParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

/**
 * Canonical TanStack column visibility menu.
 * Button and checkbox appearance comes from the shared UI primitives; the
 * component only exposes semantic hooks to the table/card reference layer.
 */
export default function ColumnPicker<T>({ table, storageKey, label = 'ستون‌ها', className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const columns = useMemo(() => {
    return table
      .getAllLeafColumns()
      .filter((column) => column.getCanHide())
      .map((column) => {
        const header = column.columnDef.header;
        const label = typeof header === 'string' || typeof header === 'number'
          ? String(header)
          : column.id;
        return { id: column.id, label };
      });
  }, [table]);

  useEffect(() => {
    const saved = safeParse<Record<string, boolean>>(localStorage.getItem(storageKey), {});
    if (saved && Object.keys(saved).length > 0) table.setColumnVisibility(saved);
    // Storage restoration is intentionally scoped to the persisted key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const persistVisibility = (visibility: Record<string, boolean>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch {
      // Local storage can be unavailable in hardened/private browser modes.
    }
  };

  const visibleCount = columns.reduce(
    (count, column) => count + (table.getColumn(column.id)?.getIsVisible() ? 1 : 0),
    0,
  );
  const allVisible = visibleCount === columns.length;

  return (
    <div
      ref={ref}
      dir="rtl"
      className={cn('column-picker', className)}
      data-ui-column-picker="true"
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        leftIcon={<i className="fa-solid fa-table-columns" aria-hidden="true" />}
        rightIcon={(
          <i
            className={cn('fa-solid fa-chevron-down text-xs transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        )}
        autoIcon={false}
      >
        {label} ({visibleCount.toLocaleString('fa-IR')} از {columns.length.toLocaleString('fa-IR')})
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="dialog"
            aria-label="انتخاب ستون‌های جدول"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="column-picker-menu"
            data-ui-table-menu="true"
            data-ui-column-picker-menu="true"
          >
            <header className="column-picker-menu__header">
              <div className="column-picker-menu__heading">
                <strong>نمایش ستون‌ها</strong>
                <span>{visibleCount.toLocaleString('fa-IR')} ستون فعال</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={allVisible}
                onClick={() => {
                  const nextVisibility = Object.fromEntries(columns.map((column) => [column.id, true]));
                  table.setColumnVisibility(nextVisibility);
                  persistVisibility(nextVisibility);
                }}
                autoIcon={false}
              >
                نمایش همه
              </Button>
            </header>

            <div className="column-picker-menu__options" role="group" aria-label="ستون‌های قابل نمایش">
              {columns.map((column) => {
                const tableColumn = table.getColumn(column.id);
                const checked = tableColumn?.getIsVisible() ?? true;
                return (
                  <CheckboxField
                    key={column.id}
                    checked={checked}
                    label={column.label}
                    description={checked ? 'در جدول نمایش داده می‌شود' : 'در جدول پنهان است'}
                    wrapperClassName="column-picker-option"
                    aria-label={`${column.label}: ${checked ? 'نمایش داده می‌شود' : 'پنهان است'}`}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      tableColumn?.toggleVisibility(nextChecked);
                      const nextVisibility = {
                        ...(table.getState().columnVisibility ?? {}),
                        [column.id]: nextChecked,
                      };
                      persistVisibility(nextVisibility);
                    }}
                  />
                );
              })}
            </div>

            <footer className="column-picker-menu__footer">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  table.resetColumnVisibility();
                  try {
                    localStorage.removeItem(storageKey);
                  } catch {
                    // No-op when storage is unavailable.
                  }
                }}
                autoIcon={false}
              >
                بازنشانی
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setOpen(false)}
                autoIcon={false}
              >
                بستن
              </Button>
            </footer>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
