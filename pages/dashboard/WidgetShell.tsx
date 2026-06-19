import React from 'react';
import { useContainerSize } from './useContainerSize';

type Props = {
  title: string;
  icon?: string;
  editable: boolean;
  onRemove?: () => void;
  onResizeToggle?: () => void;
  sizePreset?: 'tile' | 'wide' | 'tall' | 'hero';
  children: (container: { width: number; height: number }) => React.ReactNode;
};

const presetLabel = (p?: Props['sizePreset']) => {
  switch (p) {
    case 'hero':
      return 'بزرگ';
    case 'tall':
      return 'بلند';
    case 'wide':
      return 'متوسط';
    case 'tile':
    default:
      return 'کوچک';
  }
};

export default function WidgetShell({
  title,
  icon,
  editable,
  onRemove,
  onResizeToggle,
  sizePreset,
  children,
}: Props) {
  const [ref, size] = useContainerSize<HTMLDivElement>();

  const headerH = editable ? 52 : 0;
  const content = {
    width: Math.max(0, size.width),
    height: Math.max(0, size.height - headerH),
  };

  return (
    <div
      ref={ref}
      dir="rtl"
      data-ui-dashboard-widget-shell="true"
      data-dashboard-editable={editable ? 'true' : 'false'}
      data-dashboard-size-preset={sizePreset || 'tile'}
      className={[
        'ux-stable-panel dashboard-widget-shell dashboard-widget-shell--executive group relative isolate h-full w-full overflow-hidden rounded-[30px] border border-slate-200/85 bg-white dark:border-slate-800/85 dark:bg-slate-950',
        'shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] transition-all duration-300',
        editable
          ? 'outline outline-2 outline-indigo-500/15 hover:outline-indigo-500/25'
          : 'hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-36px_rgba(15,23,42,0.24)]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-sky-500/0 via-sky-400/35 to-indigo-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {editable && (
        <div
          data-ui-dashboard-widget-header="edit"
          className={[
            'dash-drag-handle dashboard-widget-edit-header flex items-center justify-between px-3 py-2.5',
            'border-b border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900',
            'cursor-move select-none',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-2.5 flex-row-reverse">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <i className={(icon || 'fa-solid fa-grip-vertical') + ' text-sm'} />
            </div>

            <div className="min-w-0 text-right">
              <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">{title}</div>
              <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-up-down-left-right" />
                <span>جابه‌جایی کارت</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResizeToggle && (
              <button
                type="button"
                data-rgl-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onResizeToggle?.();
                }}
                data-ui-dashboard-widget-action="resize"
                className="app-command-button dashboard-widget-resize-button flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                title="تغییر اندازه"
              >
                <i className="fa-solid fa-up-right-and-down-left-from-center text-[12px]" />
                <span className="text-[11px] font-extrabold">{presetLabel(sizePreset)}</span>
              </button>
            )}

            {onRemove ? (
              <button
                type="button"
                data-rgl-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove?.();
                }}
                data-ui-dashboard-widget-action="remove"
                className="app-command-button dashboard-widget-remove-button flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
                title="حذف کارت"
              >
                <i className="fa-solid fa-trash" />
              </button>
            ) : (
              <span
                data-rgl-no-drag
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                title="این کارت ثابت است و قابل حذف نیست"
              >
                ثابت
              </span>
            )}
          </div>
        </div>
      )}

      <div data-ui-dashboard-widget-content="true" className={editable ? 'dashboard-widget-content dashboard-widget-content--editable h-[calc(100%-52px)]' : 'dashboard-widget-content h-full'}>{children(content)}</div>
    </div>
  );
}
