import React from 'react';
import type { ComponentProps } from 'react';
import Button from '../Button';
import Modal from '../Modal';
import ModalActions from '../ModalActions';

export type ConfirmDialogOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info' | 'success';
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

const toneConfig: Record<NonNullable<Props['tone']>, { icon: string; submitVariant: ComponentProps<typeof Button>['variant']; kicker: string }> = {
  danger: {
    icon: 'fa-solid fa-trash-can',
    submitVariant: 'danger',
    kicker: 'تأیید عملیات حساس',
  },
  warning: {
    icon: 'fa-solid fa-triangle-exclamation',
    submitVariant: 'warning',
    kicker: 'نیازمند توجه',
  },
  info: {
    icon: 'fa-solid fa-circle-info',
    submitVariant: 'primary',
    kicker: 'تأیید اطلاعات',
  },
  success: {
    icon: 'fa-solid fa-circle-check',
    submitVariant: 'success',
    kicker: 'تأیید نهایی',
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

  const config = toneConfig[tone];
  const resolvedIcon = iconClass || config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      iconClass={resolvedIcon}
      tone={tone}
      size="md"
      variant="compact"
      layout="horizontal"
      kicker={config.kicker}
      ariaDescription={description}
      bodyClassName="confirm-dialog-body"
    >
      <div className="app-modal-alert app-modal-alert--horizontal" data-modal-alert-tone={tone}>
        <span className="app-modal-alert__icon" aria-hidden="true"><i className={resolvedIcon} /></span>
        <div className="app-modal-alert__content">
          <p className="app-modal-alert__title">{description}</p>
          {summaryItems && summaryItems.length ? (
            <div className="app-modal-alert__summaryGrid">
              {summaryItems.map((item) => (
                <div key={`${item.label}-${item.value}`} className="app-modal-alert__summaryItem">
                  <div className="app-modal-alert__summaryLabel">{item.label}</div>
                  <div className="app-modal-alert__summaryValue">{item.value}</div>
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
        submitVariant={config.submitVariant}
        submitType="button"
        onSubmitClick={onConfirm}
        submitIconClass={resolvedIcon}
        className="confirm-dialog-actions"
      />
    </Modal>
  );
};

export default ConfirmDialog;
