import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PortalLayer from './ui/PortalLayer';
import { useAnchoredOverlayPosition } from './ui';

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
  popoverClassName?: string;
  menuWidth?: number;
};

const MENU_WIDTH = 224;
const VIEWPORT_GAP = 8;
const MENU_HEIGHT_FALLBACK = 280;

const ExportMenu: React.FC<Props> = ({ items, label = 'خروجی', className, popoverClassName = '', menuWidth = MENU_WIDTH }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const { position } = useAnchoredOverlayPosition({
    isOpen: open,
    anchorRef: buttonRef,
    panelRef: popoverRef,
    preferredWidth: Math.max(160, Number(menuWidth || MENU_WIDTH)),
    fallbackPanelHeight: Math.max(96, Math.min(MENU_HEIGHT_FALLBACK, items.length * 48 + 16)),
    maxPanelHeight: Math.max(120, Math.min(420, typeof window === 'undefined' ? 420 : window.innerHeight - VIEWPORT_GAP * 2)),
    margin: VIEWPORT_GAP,
    gap: 8,
    align: 'start',
    direction: 'rtl',
  });

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


  const popover = (
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={`export-menu-popover export-menu-popover--portal app-floating-surface ${popoverClassName}`}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            overflowY: 'auto',
            pointerEvents: 'auto',
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
          setOpen((s) => !s);
        }}
        className="export-menu-button px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900"
      >
        <i className="fa-solid fa-file-export" />
        {label}
        <i className={`fa-solid fa-chevron-down text-xs opacity-80 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <PortalLayer isOpen={open} layer="popover" className="export-menu-portal-layer">
        {popover}
      </PortalLayer>
    </div>
  );
};

export default ExportMenu;
