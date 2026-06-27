import Button from "./Button";
import DialogShell from "./ui/DialogShell";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  status: "sent" | "failed" | "not_sent";
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

const STATUS_META: Record<Props["status"], StatusMeta> = {
  sent: {
    badgeText: "ارسال شد",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    headline: "پیامک با موفقیت ارسال شد.",
  },
  failed: {
    badgeText: "ناموفق",
    badgeClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200",
    headline: "ارسال پیامک ناموفق بود.",
  },
  not_sent: {
    badgeText: "ارسال نشد",
    badgeClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    headline: "پیامک ارسال نشد (تنظیمات یا پترن ناقص است).",
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
  if (!open) return null;

  const meta = STATUS_META[status];
  const statusIconClass =
    status === "sent"
      ? "fa-solid fa-check"
      : status === "failed"
        ? "fa-solid fa-triangle-exclamation"
        : "fa-solid fa-circle-exclamation";
  const primaryVariant =
    status === "failed"
      ? "danger"
      : status === "not_sent"
        ? "warning"
        : "primary";

  return (
    <DialogShell
      isOpen={open}
      onClose={onClose}
      overlayClassName="ux-overlay-backdrop app-modal-backdrop sms-auto-send-sheet-overlay"
      panelClassName="ux-stable-panel sms-auto-send-sheet-panel"
      ariaLabel={title}
      panelAttributes={{
        "data-sms-auto-status": status,
      }}
    >
      <div className="sms-auto-send-sheet__handle" aria-hidden="true" />

      <div className="sms-auto-send-sheet__header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="sms-auto-send-sheet__icon" aria-hidden="true">
            <i className={statusIconClass} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${meta.badgeClass}`}
              >
                {meta.badgeText}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              {meta.headline}
            </p>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="بستن"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>

      <div className="sms-auto-send-sheet__actions">
        <Button
          type="button"
          onClick={onPrimaryAction}
          loading={Boolean(primaryActionLoading)}
          loadingText="در حال ارسال…"
          variant={primaryVariant}
          size="sm"
          className="flex-1"
          leftIcon={
            !primaryActionLoading ? (
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
            ) : undefined
          }
        >
          {primaryActionLabel}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="sm"
          leftIcon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
        >
          بستن
        </Button>
      </div>
    </DialogShell>
  );
}
