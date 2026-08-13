import React, { type ComponentProps } from 'react';

import Button from '../Button';
import { cn } from '../../utils/cn';

export type DialogActionsProps = {
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
  cancelButtonProps?: Omit<ComponentProps<typeof Button>, 'type' | 'onClick' | 'children'>;
  submitButtonProps?: Omit<ComponentProps<typeof Button>, 'type' | 'onClick' | 'disabled' | 'loading' | 'children'>;
};

const DialogActions: React.FC<DialogActionsProps> = ({
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
  cancelButtonProps,
  submitButtonProps,
}) => (
  <footer
    className={cn(
      'kourosh-modal-actions modal-actions premium-modal-actions premium-sticky-footer app-modal-actions',
      align === 'end'
        ? 'kourosh-modal-actions--end app-modal-actions--end'
        : 'kourosh-modal-actions--between app-modal-actions--between',
      className,
    )}
  >
    {!hideHelper ? (
      <div className="kourosh-modal-actions__helper app-modal-actions__helper">
        <span className="kourosh-modal-actions__helperIcon" aria-hidden="true">
          <i className={helperIconClass} />
        </span>
        <div className="min-w-0">
          {helperTitle ? <div className="kourosh-modal-actions__helperTitle">{helperTitle}</div> : null}
          {helperText ? <span className="kourosh-modal-actions__helperText">{helperText}</span> : null}
        </div>
      </div>
    ) : null}
    <div className="kourosh-modal-actions__buttons app-modal-command-row">
      {onCancel ? (
        <Button
          {...cancelButtonProps}
          type="button"
          onClick={onCancel}
          variant={cancelButtonProps?.variant || 'secondary'}
          className={cn('kourosh-modal-actions__button kourosh-modal-actions__button--cancel modal-btn app-command-button app-command-button--cancel premium-cancel-btn', cancelButtonProps?.className)}
          leftIcon={cancelButtonProps?.leftIcon ?? <i className={cancelIconClass} aria-hidden="true" />}
        >
          {cancelText}
        </Button>
      ) : null}
      <Button
        {...submitButtonProps}
        type={submitType}
        onClick={onSubmitClick}
        disabled={submitDisabled || isSubmitting}
        loading={Boolean(isSubmitting)}
        loadingText={submittingText || submitButtonProps?.loadingText || 'در حال ذخیره تغییرات...'}
        variant={submitButtonProps?.variant || submitVariant}
        className={cn('kourosh-modal-actions__button kourosh-modal-actions__button--submit modal-btn app-command-button app-command-button--submit premium-submit-btn', submitButtonProps?.className)}
        leftIcon={!isSubmitting ? (submitButtonProps?.leftIcon ?? <i className={submitIconClass} aria-hidden="true" />) : undefined}
      >
        {submitText}
      </Button>
    </div>
  </footer>
);

export default DialogActions;
