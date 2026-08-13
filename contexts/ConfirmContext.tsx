import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';

import { Button, Dialog, DialogActions } from '@/components/ui';

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

type ConfirmContextValue = {
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
};

type ConfirmTone = NonNullable<ConfirmDialogOptions['tone']>;

type ConfirmToneConfig = {
  icon: string;
  submitVariant: ComponentProps<typeof Button>['variant'];
  kicker: string;
};

const toneConfig: Record<ConfirmTone, ConfirmToneConfig> = {
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

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((input: ConfirmDialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(typeof input === 'string' ? { description: input } : input);
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const tone: ConfirmTone = options?.tone ?? 'danger';
  const config = toneConfig[tone];
  const resolvedIcon = options?.iconClass || config.icon;
  const title = options?.title || 'تایید عملیات';
  const description = options?.description || 'آیا از ادامه این عملیات مطمئن هستید؟';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        isOpen={Boolean(options)}
        onClose={() => close(false)}
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
          <span className="app-modal-alert__icon" aria-hidden="true">
            <i className={resolvedIcon} />
          </span>
          <div className="app-modal-alert__content">
            <p className="app-modal-alert__title">{description}</p>
            {options?.summaryItems?.length ? (
              <div className="app-modal-alert__summaryGrid">
                {options.summaryItems.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="app-modal-alert__summaryItem">
                    <div className="app-modal-alert__summaryLabel">{item.label}</div>
                    <div className="app-modal-alert__summaryValue">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <DialogActions
          onCancel={() => close(false)}
          cancelText={options?.cancelText || 'انصراف'}
          submitText={options?.confirmText || 'بله، ادامه بده'}
          submitVariant={config.submitVariant}
          submitType="button"
          onSubmitClick={() => close(true)}
          submitIconClass={resolvedIcon}
          className="confirm-dialog-actions"
        />
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
};
