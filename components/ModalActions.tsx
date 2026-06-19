import React from 'react';
import Button from './Button';
import type { ComponentProps } from 'react';

type Props = {
  onCancel?: () => void;
  cancelText?: string;
  submitText?: string;
  submittingText?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitType?: 'button' | 'submit';
  onSubmitClick?: () => void;
  className?: string;
  helperTitle?: string;
  helperText?: string;
  helperIconClass?: string;
  hideHelper?: boolean;
  cancelIconClass?: string;
  submitIconClass?: string;
  submitVariant?: ComponentProps<typeof Button>['variant'];
};

const ModalActions: React.FC<Props> = ({
  onCancel,
  cancelText = 'انصراف',
  submitText = 'ذخیره تغییرات',
  submittingText,
  isSubmitting,
  submitDisabled,
  submitType = 'submit',
  onSubmitClick,
  className,
  helperTitle = '',
  helperText = '',
  helperIconClass = 'fa-solid fa-shield-halved',
  hideHelper = true,
  cancelIconClass = 'fa-solid fa-xmark',
  submitIconClass = 'fa-solid fa-check',
  submitVariant = 'primary',
}) => {
  return (
    <div className={["modal-actions premium-modal-actions premium-sticky-footer", className].filter(Boolean).join(' ')}>
      {!hideHelper ? (
      <div className="premium-helper-inline premium-helper-inline--card">
        <span className="premium-helper-inline__icon"><i className={helperIconClass} /></span>
        <div className="min-w-0">
          <div className="text-[11px] font-black text-slate-800 dark:text-slate-100">{helperTitle}</div>
          <span>{helperText}</span>
        </div>
      </div>
      ) : null}
      <div className="app-modal-command-row flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
        {onCancel ? (
          <Button type="button" onClick={onCancel} variant="ghost" className="modal-btn app-command-button app-command-button--cancel premium-cancel-btn" leftIcon={<i className={cancelIconClass} />}>
            {cancelText}
          </Button>
        ) : null}
        <Button
          type={submitType}
          onClick={onSubmitClick}
          disabled={submitDisabled || isSubmitting}
          loading={Boolean(isSubmitting)}
          loadingText={submittingText || 'در حال ذخیره تغییرات...'}
          variant={submitVariant}
          className="modal-btn app-command-button app-command-button--submit premium-submit-btn"
          leftIcon={!isSubmitting ? <i className={submitIconClass} /> : undefined}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
};

export default ModalActions;
