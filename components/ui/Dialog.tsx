import React, { type ReactNode, useId, useMemo } from 'react';

import { cn } from '../../utils/cn';
import ModalBody from '../modals/ModalBody';
import ModalHeader from '../modals/ModalHeader';
import type { ModalLayout, ModalSize, ModalTone, ModalVariant } from '../modals/modalTypes';
import DialogShell from './DialogShell';

export type DialogTone = ModalTone;
export type DialogVariant = ModalVariant;
export type DialogLayout = ModalLayout;
export type DialogSize = ModalSize;

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  isOpen?: boolean;
  widthClass?: string;
  wrapperClassName?: string;
  panelClassName?: string;
  iconClass?: string;
  tone?: DialogTone;
  size?: DialogSize;
  layout?: DialogLayout;
  kicker?: string;
  ariaDescription?: string;
  bodyClassName?: string;
  hideCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  variant?: DialogVariant;
}

const inferTone = (title: string, explicitTone?: DialogTone): DialogTone => {
  if (explicitTone) return explicitTone;
  if (/حذف|پاک|ریستور|بازیابی|هشدار|خطا|ابطال|خطر/i.test(title || '')) return 'danger';
  if (/موفق|ثبت شد|تکمیل/i.test(title || '')) return 'success';
  if (/اطلاع|راهنما|جزئیات|نمایش|گزارش|ارسال|پیام/i.test(title || '')) return 'info';
  return 'neutral';
};

const inferVariant = (title: string, widthClass = '', explicit?: DialogVariant): DialogVariant => {
  if (explicit) return explicit;
  if (/تأیید|تایید|حذف|بازیابی|ریستور|انصراف|هشدار|پاک|ابطال/.test(title || '')) return 'compact';
  if (/max-w-(5xl|6xl|7xl)|max-w-\[|96vw|1180|min\(/.test(widthClass)) return 'expansive';
  return 'operational';
};

const inferSize = (variant: DialogVariant, widthClass = '', explicit?: DialogSize): DialogSize => {
  if (explicit) return explicit;
  if (/max-w-(sm|md)/.test(widthClass)) return 'sm';
  if (/max-w-(lg|xl|2xl)/.test(widthClass)) return 'md';
  if (/max-w-3xl/.test(widthClass)) return 'lg';
  if (/max-w-4xl|max-w-\[920px\]/.test(widthClass)) return 'wide';
  if (/max-w-5xl|max-w-\[980px\]/.test(widthClass)) return 'full';
  if (/max-w-6xl|max-w-7xl|max-w-\[1180px\]|96vw|1440|min\(/.test(widthClass)) return 'full';
  if (variant === 'compact') return 'sm';
  if (variant === 'expansive') return 'full';
  return 'lg';
};

const inferLayout = (title: string, variant: DialogVariant, explicit?: DialogLayout): DialogLayout => {
  if (explicit) return explicit;
  if (variant === 'compact' && /تأیید|تایید|حذف|بازیابی|ریستور|هشدار|پاک|ابطال/.test(title || '')) return 'horizontal';
  return 'vertical';
};

const inferKicker = (variant: DialogVariant, title: string) => {
  if (variant === 'compact') return /حذف|پاک|ابطال/.test(title) ? 'تأیید عملیات' : 'تأیید امن';
  if (/گزارش|تحلیل|سود|فروش|وصول|مطالبات|بدهی|موجودی/i.test(title)) {
    return variant === 'expansive' ? 'نمای تحلیلی مبتنی بر داده سرور' : 'جزئیات گزارش از داده ثبت‌شده';
  }
  if (variant === 'expansive') return 'نمای عملیاتی';
  return 'فرم عملیاتی';
};

const Dialog: React.FC<DialogProps> = ({
  title,
  onClose,
  children,
  isOpen = true,
  widthClass,
  wrapperClassName,
  panelClassName,
  iconClass,
  tone,
  size,
  layout,
  kicker,
  ariaDescription,
  bodyClassName,
  hideCloseButton = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  variant,
}) => {
  const reactId = useId();
  const dialogId = reactId.replace(/:/g, '');
  const titleId = `kourosh-dialog-title-${dialogId}`;
  const descriptionId = ariaDescription ? `kourosh-dialog-description-${dialogId}` : undefined;
  const resolvedVariant = useMemo(() => inferVariant(title, widthClass, variant), [title, widthClass, variant]);
  const resolvedSize = useMemo(() => inferSize(resolvedVariant, widthClass, size), [resolvedVariant, widthClass, size]);
  const resolvedLayout = useMemo(() => inferLayout(title, resolvedVariant, layout), [title, resolvedVariant, layout]);
  const resolvedTone = useMemo(() => inferTone(title, tone), [title, tone]);

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      overlayClassName={cn('kourosh-modal__backdrop app-modal-backdrop', wrapperClassName)}
      showBackdrop
      ariaLabelledBy={titleId}
      ariaDescribedBy={descriptionId}
      surface="default"
      panelClassName={cn(
        'kourosh-modal__panel app-modal modal-surface modal-shell-premium',
        `app-modal--${resolvedVariant}`,
        `app-modal--layout-${resolvedLayout}`,
        `app-modal--tone-${resolvedTone}`,
        panelClassName,
      )}
      panelAttributes={{
        'data-dialog-variant': resolvedVariant,
        'data-modal-variant': resolvedVariant,
        'data-modal-tone': resolvedTone,
        'data-modal-layout': resolvedLayout,
        'data-modal-size': resolvedSize,
        'data-legacy-wrapper': wrapperClassName || undefined,
        'data-modal-context': /گزارش|تحلیل|سود|فروش|وصول|مطالبات|بدهی|موجودی/i.test(title) ? 'report' : 'operation',
      }}
    >
      <ModalHeader
        title={title}
        titleId={titleId}
        descriptionId={descriptionId}
        ariaDescription={ariaDescription}
        kicker={kicker || inferKicker(resolvedVariant, title)}
        iconClass={iconClass}
        tone={resolvedTone}
        onClose={onClose}
        hideCloseButton={hideCloseButton}
      />
      <ModalBody className={bodyClassName}>{children}</ModalBody>
    </DialogShell>
  );
};

export default Dialog;
