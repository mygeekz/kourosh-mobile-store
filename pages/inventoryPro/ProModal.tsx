
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string; // tailwind width
};

export default function ProModal({ open, title, onClose, children, widthClassName }: Props) {
  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      {/* Dialog */}
      <div
        style={{ position: "relative", height: "100%", width: "100%", display: "grid", placeItems: "center", pointerEvents: "none" }}
      >
        <div
          className={`w-[min(92vw,980px)] ${widthClassName ?? ""} rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-black/10 dark:border-white/10`}
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
            <div className="font-extrabold text-sm md:text-base">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-bold text-xs"
            >
              بستن
            </button>
          </div>
          <div className="p-4 max-h-[78vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
