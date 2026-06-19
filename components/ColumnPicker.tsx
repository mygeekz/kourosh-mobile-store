import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Table } from '@tanstack/react-table';

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
 * Column visibility menu for TanStack tables.
 * Persists visibility per-page via localStorage.
 */
export default function ColumnPicker<T>({ table, storageKey, label = 'ستون‌ها', className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(() => {
    return table
      .getAllLeafColumns()
      .filter((c) => c.getCanHide())
      .map((c) => ({ id: c.id, label: String(c.columnDef.header ?? c.id) }));
  }, [table]);

  // Restore saved visibility
  useEffect(() => {
    const saved = safeParse<Record<string, boolean>>(localStorage.getItem(storageKey), {});
    if (saved && Object.keys(saved).length > 0) {
      table.setColumnVisibility(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on change
  // Note: we persist directly when toggling checkboxes below.

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const visibleCount = columns.reduce((acc, c) => acc + (table.getColumn(c.id)?.getIsVisible() ? 1 : 0), 0);

  return (
    <div className={`relative ${className ?? ''}`} ref={ref} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="h-10 px-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-sm hover:opacity-95 active:scale-[0.98] transition inline-flex items-center gap-2"
      >
        <i className="fa-solid fa-table-columns" />
        {label}
        <span className="text-[11px] px-2 h-5 rounded-xl bg-black/5 dark:bg-white/10 grid place-items-center font-black">
          {visibleCount.toLocaleString('fa-IR')}/{columns.length.toLocaleString('fa-IR')}
        </span>
        <i className={`fa-solid fa-chevron-down text-xs opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="ux-stable-panel ux-stable-popover absolute left-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl z-50"
          >
            <div className="p-3">
              <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center justify-between">
                <span>نمایش ستون‌ها</span>
                <button
                  type="button"
                  className="text-[11px] text-primary font-bold hover:opacity-80"
                  onClick={() => {
                    // Show all
                    const all: Record<string, boolean> = {};
                    for (const c of columns) all[c.id] = true;
                    table.setColumnVisibility(all);
                    try { localStorage.setItem(storageKey, JSON.stringify(all)); } catch {}
                  }}
                >
                  نمایش همه
                </button>
              </div>

              <div className="max-h-72 overflow-auto no-scrollbar pr-1">
                {columns.map((c) => {
                  const col = table.getColumn(c.id);
                  const checked = col?.getIsVisible() ?? true;
                  return (
                    <label
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{c.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          col?.toggleVisibility(e.target.checked);
                          try {
                            localStorage.setItem(
                              storageKey,
                              JSON.stringify({ ...(table.getState().columnVisibility ?? {}), [c.id]: e.target.checked }),
                            );
                          } catch {}
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  className="text-[11px] text-gray-600 dark:text-gray-300 hover:opacity-80 font-bold"
                  onClick={() => {
                    table.resetColumnVisibility();
                    try { localStorage.removeItem(storageKey); } catch {}
                  }}
                >
                  بازنشانی
                </button>
                <button
                  type="button"
                  className="text-[11px] text-gray-600 dark:text-gray-300 hover:opacity-80 font-bold"
                  onClick={() => setOpen(false)}
                >
                  بستن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
