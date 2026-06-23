import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  status: 'sent' | 'failed' | 'not_sent';
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionLoading?: boolean;
  onClose: () => void;
};

type StatusMeta = {
  badgeText: string;
  badgeClass: string;
  headline: string;
};

const STATUS_META: Record<Props['status'], StatusMeta> = {
  sent: {
    badgeText: 'ارسال شد',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    headline: 'پیامک با موفقیت ارسال شد.',
  },
  failed: {
    badgeText: 'ناموفق',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200',
    headline: 'ارسال پیامک ناموفق بود.',
  },
  not_sent: {
    badgeText: 'ارسال نشد',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
    headline: 'پیامک ارسال نشد (تنظیمات یا پترن ناقص است).',
  },
};

export default function SmsAutoSendSheet({
  open,
  title,
  description,
  status,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionLoading,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const meta = STATUS_META[status];

  return createPortal(
    <div data-kourosh-overlay="backdrop" className="fixed inset-0 z-[2147483646]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        aria-label="close"
      />

      <div data-kourosh-overlay="panel" className="absolute inset-x-0 bottom-0 z-[2147483647]">
        <div className="ux-stable-panel mx-auto w-full max-w-xl rounded-t-2xl bg-white shadow-2xl dark:bg-slate-950 dark:text-slate-100">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />

          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}>{meta.badgeText}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{meta.headline}</p>
                {description ? (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
                ) : null}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                aria-label="close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <button
                onClick={onPrimaryAction}
                disabled={!!primaryActionLoading}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {primaryActionLoading ? 'در حال ارسال…' : primaryActionLabel}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
