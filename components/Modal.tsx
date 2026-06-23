import React, { ReactNode, useMemo } from 'react';
import { getPeopleUiIconByTitle, getPeopleUiToneByTitle, PeopleModalIcon } from './ui/PeopleUiKit';
import DialogShell from './ui/DialogShell';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  isOpen?: boolean;
  widthClass?: string;
  wrapperClassName?: string;
  iconClass?: string;
  /**
   * Visual contract for modal density and behavior.
   * - compact: confirmation / delete / small account actions
   * - operational: forms and normal workflows
   * - expansive: reports, logs, bulk tools, wide editors
   */
  variant?: 'compact' | 'operational' | 'expansive';
}

const pickIcon = getPeopleUiIconByTitle;
const pickTone = getPeopleUiToneByTitle;

const inferModalVariant = (title: string, widthClass: string, explicitVariant?: ModalProps['variant']): NonNullable<ModalProps['variant']> => {
  if (explicitVariant) return explicitVariant;
  if (/تأیید|تایید|حذف|بازیابی|ریستور|انصراف|هشدار|پاک/.test(title || '')) return 'compact';
  if (/max-w-(5xl|6xl|7xl)|max-w-\[96vw\]|w-\[|min\(/.test(widthClass || '')) return 'expansive';
  return 'operational';
};

const Modal: React.FC<ModalProps> = ({ title, onClose, children, isOpen = true, widthClass = 'max-w-md', wrapperClassName, iconClass, variant }) => {
  const isPeopleModal = /مشتری|همکار|اشخاص/.test(title || '');
  const tone = useMemo(() => pickTone(title), [title]);
  const resolvedIconClass = useMemo(() => iconClass || pickIcon(title), [iconClass, title]);
  const resolvedVariant = inferModalVariant(title, widthClass, variant);
  const isLargeOperationalModal = resolvedVariant === 'expansive' || /max-w-(4xl|5xl|6xl|7xl)|w-\[|min\(/.test(widthClass || '');
  const safeModalClass = isLargeOperationalModal ? ' modal-shell-sidebar-safe modal-shell-sidebar-safe--large' : ' modal-shell-sidebar-safe';
  const densityClass = `app-modal app-modal--${resolvedVariant}`;
  const hideCloseButton = /restore-backup-modal-v22|customer-profile-edit-overlay|customer-edit-v2-overlay|partner-ledger-edit-modal-v141/.test(wrapperClassName || '');

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="ux-overlay-backdrop app-modal-backdrop"
      showBackdrop
      panelClassName={`modal-surface ux-stable-panel modal-shell-premium premium-drawer-panel detail-severity-card detail-severity-card--${tone} ${densityClass} ${isPeopleModal ? 'people-operational-modal' : ''}${safeModalClass} ${widthClass} md:m-auto flex h-full flex-col md:h-auto md:max-h-[92vh] print:m-0 print:h-full print:max-h-full print:rounded-none print:border-none print:shadow-none`}
      panelAttributes={{
        'data-modal-variant': resolvedVariant,
      }}
      panelDataId="panel"
    >
      <div className="modal-premium-header premium-drawer-panel__header print:hidden shrink-0">
        <div className="app-modal-title-row flex min-w-0 items-start gap-3">
          <PeopleModalIcon title={title} iconClass={resolvedIconClass} tone={tone} />
          <div className="min-w-0">
            <p className="modal-premium-kicker">{resolvedVariant === 'compact' ? 'تأیید امن' : resolvedVariant === 'expansive' ? 'نمای عملیاتی' : 'فرم عملیاتی'}</p>
            <h3 className="modal-premium-title">{title}</h3>
          </div>
        </div>
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="modal-close-btn ux-btn ux-btn-ghost ux-btn-sm ux-icon-btn"
            aria-label="بستن"
            type="button"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        )}
      </div>
      <div className="modal-body-premium premium-drawer-panel__body detail-severity-panel flex-1 overflow-y-auto print:overflow-visible">
        {children}
      </div>
    </DialogShell>
  );
};

export default Modal;
