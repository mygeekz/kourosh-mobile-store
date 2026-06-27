import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

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

type ExportMenuPosition = {
  top: number;
  left: number;
};

const MENU_WIDTH = 224;
const VIEWPORT_GAP = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ExportMenu: React.FC<Props> = ({ items, label = 'خروجی', className }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ExportMenuPosition>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const toolbarBoundary = button.closest('[data-ui-repair-toolbar="true"], [data-ui-service-toolbar="true"], .repairs-table-toolbar, .services-workspace-toolbar, .customers-toolbar, .people-customers-shell, main');
    const boundaryRect = toolbarBoundary instanceof HTMLElement ? toolbarBoundary.getBoundingClientRect() : null;

    const viewportLeft = VIEWPORT_GAP;
    const viewportRight = window.innerWidth - VIEWPORT_GAP;
    const boundaryLeft = Math.max(viewportLeft, boundaryRect?.left ?? viewportLeft);
    const boundaryRight = Math.min(viewportRight, boundaryRect?.right ?? viewportRight);

    const top = clamp(rect.bottom + 8, VIEWPORT_GAP, window.innerHeight - VIEWPORT_GAP - 16);
    const preferredLeft = rect.right - MENU_WIDTH;
    const minLeft = boundaryLeft;
    const maxLeft = Math.max(minLeft, boundaryRight - MENU_WIDTH);
    const left = clamp(preferredLeft, minLeft, maxLeft);

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
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

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  const popover = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="export-menu-popover export-menu-popover--portal w-56 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 shadow-2xl"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            right: 'auto',
            bottom: 'auto',
            zIndex: 'var(--kourosh-z-popover, 9500)',
            '--export-menu-top': `${position.top}px`,
            '--export-menu-left': `${position.left}px`,
          } as React.CSSProperties}
          dir="rtl"
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
  );

  return (
    <div className={`export-menu-root relative ${className ?? ''}`} ref={ref} dir="rtl">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((s) => !s);
        }}
        className="export-menu-button px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900"
      >
        <i className="fa-solid fa-file-export" />
        {label}
        <i className={`fa-solid fa-chevron-down text-xs opacity-80 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {typeof document !== 'undefined' ? createPortal(popover, document.body) : null}
    </div>
  );
};

export default ExportMenu;
