import React from 'react';
import Button from '../Button';
import ModalActions from '../ModalActions';
import DialogShell from './DialogShell';

export type ConfirmDialogOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
  iconClass?: string;
  summaryItems?: Array<{
    label: string;
    value: string;
  }>;
};

type Props = ConfirmDialogOptions & {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const toneClasses: Record<NonNullable<Props['tone']>, { badge: string; card: string; panel: string; submitVariant: React.ComponentProps<typeof Button>['variant'] }> = {
  danger: {
    badge: 'detail-severity-badge detail-severity-badge--danger',
    card: 'detail-severity-card detail-severity-card--danger',
    panel: 'detail-severity-panel',
    submitVariant: 'danger',
  },
  warning: {
    badge: 'detail-severity-badge detail-severity-badge--warning',
    card: 'detail-severity-card detail-severity-card--warning',
    panel: 'detail-severity-panel',
    submitVariant: 'warning',
  },
  info: {
    badge: 'detail-severity-badge detail-severity-badge--info',
    card: 'detail-severity-card detail-severity-card--info',
    panel: 'detail-severity-panel',
    submitVariant: 'primary',
  },
};

const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'تایید عملیات',
  description = 'آیا از ادامه این عملیات مطمئن هستید؟',
  confirmText = 'بله، ادامه بده',
  cancelText = 'انصراف',
  tone = 'danger',
  iconClass,
  summaryItems,
}) => {
  if (!isOpen) return null;

  const resolvedIcon = iconClass || (tone === 'danger' ? 'fa-solid fa-trash-can' : tone === 'warning' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info');
  const classes = toneClasses[tone];
  const isRestoreDialog = /بازیابی|ریستور|بکاپ|پشتیبان/.test(title || '');

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="ux-overlay-backdrop app-modal-backdrop"
      panelClassName={`ux-stable-panel app-modal app-modal--compact confirm-dialog-surface w-full max-w-md rounded-[28px] p-5 dark:text-slate-100 ${classes.card} ${isRestoreDialog ? 'confirm-dialog-surface--restore' : ''}`}
      panelAttributes={{
        'data-modal-variant': 'compact',
        'data-confirm-dialog-kind': isRestoreDialog ? 'restore-backup' : undefined,
      }}
      panelDataId="panel"
    >
      <div className="flex items-start justify-between gap-4 confirm-dialog-header-row" dir="rtl">
        <Button type="button" onClick={onClose} variant="ghost" size="icon" className="modal-close-btn shrink-0" aria-label="بستن">
          <i className="fa-solid fa-xmark text-lg" />
        </Button>
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-start justify-start gap-3 text-right confirm-dialog-title-row">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Confirmation</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">{title}</h3>
            </div>
            <span className={`grid h-11 w-11 place-items-center rounded-2xl ${classes.badge}`}>
              <i className={resolvedIcon} />
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p>
          {summaryItems && summaryItems.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <div key={`${item.label}-${item.value}`} className={`rounded-2xl px-3 py-2 text-right ${classes.panel}`}>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-100">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ModalActions
        onCancel={onClose}
        cancelText={cancelText}
        submitText={confirmText}
        submitVariant={classes.submitVariant}
        submitType="button"
        onSubmitClick={onConfirm}
        submitIconClass={resolvedIcon}
        className="confirm-dialog-actions"
      />
    </DialogShell>
  );
};

export default ConfirmDialog;
