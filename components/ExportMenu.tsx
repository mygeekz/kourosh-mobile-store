import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ExportMenuItem = {
  key: string;
  label: string;
  icon: string; // FontAwesome class
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  items: ExportMenuItem[];
  label?: string;
  className?: string;
};

const ExportMenu: React.FC<Props> = ({ items, label = 'خروجی', className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className={`relative ${className ?? ''}`} ref={ref} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900"
      >
        <i className="fa-solid fa-file-export" />
        {label}
        <i className={`fa-solid fa-chevron-down text-xs opacity-80 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="ux-stable-panel ux-stable-popover absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 shadow-2xl z-50"
          >
            <div className="p-2">
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => {
                    if (it.disabled) return;
                    setOpen(false);
                    it.onClick();
                  }}
                  className={`w-full text-right px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition 
                    ${it.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10 dark:hover:bg-white/10'}
                  `}
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <i className={`fa-solid ${it.icon}`} />
                    </span>
                    {it.label}
                  </span>
                  <i className="fa-solid fa-arrow-left text-xs text-gray-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportMenu;
