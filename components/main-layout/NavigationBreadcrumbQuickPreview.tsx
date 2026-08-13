import React from 'react';
import { createPortal } from 'react-dom';
import type { OperationalBreadcrumbStage } from '../../utils/operationalNavigationBreadcrumb';
import { deriveNavigationQuickCopyActions } from '../../utils/navigationQuickPreviewActions';

const toneClasses: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

const itemToneClasses: Record<string, string> = {
  success: 'text-emerald-700 dark:text-emerald-200',
  warning: 'text-amber-700 dark:text-amber-200',
  danger: 'text-rose-700 dark:text-rose-200',
  info: 'text-sky-700 dark:text-sky-200',
  neutral: 'text-slate-800 dark:text-slate-100',
};

type Props = {
  stage: OperationalBreadcrumbStage;
  anchor: HTMLElement | null;
  pinned: boolean;
  canOpenStage: boolean;
  onOpenStage: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
};

const writeClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === 'undefined') throw new Error('clipboard unavailable');
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy failed');
};

const NavigationBreadcrumbQuickPreview: React.FC<Props> = ({
  stage,
  anchor,
  pinned,
  canOpenStage,
  onOpenStage,
  onMouseEnter,
  onMouseLeave,
  onClose,
}) => {
  const preview = stage.preview;
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = React.useState<{ key: string; state: 'success' | 'error' } | null>(null);
  const copyFeedbackTimerRef = React.useRef<number | null>(null);
  const copyActions = React.useMemo(() => deriveNavigationQuickCopyActions(stage), [stage]);

  React.useLayoutEffect(() => {
    if (!anchor || typeof window === 'undefined') return undefined;

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = Math.max(320, window.innerWidth || 0);
      const width = Math.min(360, Math.max(280, viewportWidth - 24));
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - width / 2),
        Math.max(12, viewportWidth - width - 12),
      );
      setPosition({ top: Math.max(12, rect.bottom + 8), left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor]);

  React.useEffect(() => () => {
    if (copyFeedbackTimerRef.current != null && typeof window !== 'undefined') {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
  }, []);

  const handleCopy = React.useCallback(async (key: string, value: string) => {
    if (copyFeedbackTimerRef.current != null && typeof window !== 'undefined') {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    try {
      await writeClipboard(value);
      setCopyFeedback({ key, state: 'success' });
    } catch {
      setCopyFeedback({ key, state: 'error' });
    }
    if (typeof window !== 'undefined') {
      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setCopyFeedback(null);
        copyFeedbackTimerRef.current = null;
      }, 1400);
    }
  }, []);

  if (!preview || !anchor || !position || typeof document === 'undefined') return null;

  const items = Array.isArray(preview.items) ? preview.items.filter((item) => item?.label && item?.value).slice(0, 8) : [];
  const statusTone = toneClasses[String(preview.statusTone || 'neutral')] || toneClasses.neutral;
  const hasQuickActions = canOpenStage || copyActions.length > 0;

  return createPortal(
    <aside
      className="fixed z-[160] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950 dark:ring-white/5"
      style={{ top: position.top, left: position.left, width: position.width }}
      data-ui-breadcrumb-quick-preview="true"
      data-ui-breadcrumb-quick-actions={hasQuickActions ? 'true' : undefined}
      role="dialog"
      aria-label={`پیش‌نمایش ${stage.label}`}
      dir="rtl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-hidden="true">
          <i className={`${stage.iconClass} text-[12px]`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
              {preview.eyebrow || 'پیش‌نمایش سریع'}
            </span>
            {pinned ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <i className="fa-solid fa-thumbtack text-[8px]" aria-hidden="true" />
                ثابت
              </span>
            ) : null}
          </div>
          <div className="mt-1 truncate text-[12px] font-black text-slate-950 dark:text-white" title={preview.title || stage.label}>
            {preview.title || stage.label}
          </div>
          {preview.subtitle ? (
            <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {preview.subtitle}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          data-skip-global-button="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-200 dark:focus-visible:ring-slate-700"
          aria-label="بستن پیش‌نمایش"
          title="بستن پیش‌نمایش"
        >
          <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
        </button>
      </div>

      {preview.status || items.length > 0 ? (
        <div className="space-y-3 px-4 py-3">
          {preview.status ? (
            <div className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-black ${statusTone}`}>
              <i className="fa-solid fa-circle-check text-[8px]" aria-hidden="true" />
              <span className="truncate">{preview.status}</span>
            </div>
          ) : null}

          {items.length > 0 ? (
            <dl className="grid grid-cols-2 gap-2">
              {items.map((item, index) => {
                const valueTone = itemToneClasses[String(item.tone || 'neutral')] || itemToneClasses.neutral;
                return (
                  <div key={`${item.label}-${item.value}-${index}`} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                    <dt className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                      {item.iconClass ? <i className={`${item.iconClass} shrink-0 text-[8px]`} aria-hidden="true" /> : null}
                      <span className="truncate">{item.label}</span>
                    </dt>
                    <dd className={`mt-1 min-w-0 break-words text-[10.5px] font-black leading-5 ${valueTone}`} dir="auto">
                      {item.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </div>
      ) : null}

      {preview.note ? (
        <div className="border-t border-slate-100 px-4 py-2.5 text-[9.5px] font-semibold leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {preview.note}
        </div>
      ) : null}

      {hasQuickActions ? (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800" data-ui-breadcrumb-quick-actions-panel="true">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500">
            <i className="fa-solid fa-bolt text-[8px]" aria-hidden="true" />
            اقدامات سریع
          </div>
          <div className="grid grid-cols-2 gap-2">
            {canOpenStage ? (
              <button
                type="button"
                onClick={onOpenStage}
                data-skip-global-button="true"
                data-ui-breadcrumb-action="open-stage"
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-700"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                <span className="truncate">باز کردن مرحله</span>
              </button>
            ) : null}
            {copyActions.map((action) => {
              const feedback = copyFeedback?.key === action.key ? copyFeedback.state : null;
              const label = feedback === 'success' ? 'کپی شد' : feedback === 'error' ? 'کپی نشد' : action.label;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => handleCopy(action.key, action.value)}
                  data-skip-global-button="true"
                  data-ui-breadcrumb-action="copy"
                  data-copy-action-label={action.label}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-700"
                  title={feedback === 'error' ? 'کپی انجام نشد؛ دوباره تلاش کنید' : action.label}
                  aria-live="polite"
                >
                  <i className={`fa-solid ${feedback === 'success' ? 'fa-check' : feedback === 'error' ? 'fa-triangle-exclamation' : action.iconClass.replace('fa-regular ', '').replace('fa-solid ', '')} text-[9px]`} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>,
    document.body,
  );
};

export default NavigationBreadcrumbQuickPreview;
