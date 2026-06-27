import React from 'react';
import Button from '../Button';
import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';

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
  align?: 'end' | 'between';
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
  align = 'between',
}) => {
  return (
    <footer className={cn('kourosh-modal-actions modal-actions premium-modal-actions premium-sticky-footer app-modal-actions', align === 'end' ? 'kourosh-modal-actions--end app-modal-actions--end' : 'kourosh-modal-actions--between app-modal-actions--between', className)}>
      {!hideHelper ? (
        <div className="kourosh-modal-actions__helper app-modal-actions__helper">
          <span className="kourosh-modal-actions__helperIcon" aria-hidden="true"><i className={helperIconClass} /></span>
          <div className="min-w-0">
            {helperTitle ? <div className="kourosh-modal-actions__helperTitle">{helperTitle}</div> : null}
            {helperText ? <span className="kourosh-modal-actions__helperText">{helperText}</span> : null}
          </div>
        </div>
      ) : null}
      <div className="kourosh-modal-actions__buttons app-modal-command-row">
        {onCancel ? (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="kourosh-modal-actions__button kourosh-modal-actions__button--cancel modal-btn app-command-button app-command-button--cancel premium-cancel-btn"
            leftIcon={<i className={cancelIconClass} aria-hidden="true" />}
          >
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
          className="kourosh-modal-actions__button kourosh-modal-actions__button--submit modal-btn app-command-button app-command-button--submit premium-submit-btn"
          leftIcon={!isSubmitting ? <i className={submitIconClass} aria-hidden="true" /> : undefined}
        >
          {submitText}
        </Button>
      </div>
    </footer>
  );
};

export default ModalActions;
