import React, { useEffect } from "react";
import ReactDOM from "react-dom";

type Props = {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
  overlayClassName?: string;
  iconClassName?: string;
  eyebrow?: React.ReactNode;
  hideCloseButton?: boolean;
};

export default function InventoryModal({
  open,
  title,
  onClose,
  children,
  widthClassName = "max-w-[1180px]",
  overlayClassName = "",
  iconClassName,
  eyebrow = "انبار",
  hideCloseButton = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
      className={`ux-overlay-backdrop bg-slate-950/42 flex items-center justify-center p-2 md:p-4 ${overlayClassName}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div
        className={`ux-stable-panel inventory-modal-foundation w-full ${widthClassName} overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_80px_-28px_rgba(15,23,42,0.36)] dark:border-slate-800 dark:bg-slate-950 max-h-[min(840px,calc(100dvh-20px))] flex flex-col`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 md:px-5 dark:border-slate-800 ${hideCloseButton ? 'justify-start' : 'justify-between'}`}>
          <div className="flex min-w-0 items-center gap-3">
            {iconClassName ? (
              <span className="inventory-modal-title-icon" aria-hidden="true">
                <i className={iconClassName} />
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{eyebrow}</div>
              <div className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
            </div>
          </div>
          {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="بستن"
            title="بستن"
          >
            <i className="fa-solid fa-xmark text-xl" />
          </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-5 md:py-4" data-ui-inventory-modal="true">
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
