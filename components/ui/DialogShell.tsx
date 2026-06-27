import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

type DialogShellProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  panelClassName?: string;
  panelAttributes?: React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | number | boolean | undefined>;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  backdropDataId?: string;
  panelDataId?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  layer?: 'modal' | 'drawer' | 'sheet' | 'command';
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

let activeDialogCount = 0;
let originalBodyOverflow = '';
const dialogStack: string[] = [];

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  if (activeDialogCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeDialogCount += 1;
};

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  activeDialogCount = Math.max(0, activeDialogCount - 1);
  if (activeDialogCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    originalBodyOverflow = '';
  }
};

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => {
    const disabled = node.getAttribute('aria-disabled') === 'true';
    const hidden = node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true';
    return !disabled && !hidden && node.offsetParent !== null;
  });
};

const DialogShell: React.FC<DialogShellProps> = ({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
  panelClassName,
  panelAttributes,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  backdropDataId,
  panelDataId,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showBackdrop = true,
  initialFocusRef,
  layer = 'modal',
}) => {
  const reactId = useId();
  const dialogInstanceId = `kourosh-dialog-${reactId.replace(/:/g, '')}`;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      return undefined;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    dialogStack.push(dialogInstanceId);

    const timer = window.setTimeout(() => {
      setShowContent(true);
      const panel = panelRef.current;
      if (!panel) return;
      const initialFocusElement = initialFocusRef?.current;
      const activeElement = document.activeElement;
      if (initialFocusElement && panel.contains(initialFocusElement)) {
        initialFocusElement.focus({ preventScroll: true });
        return;
      }
      if (!activeElement || !panel.contains(activeElement)) {
        panel.focus({ preventScroll: true });
      }
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      const isTopDialog = dialogStack[dialogStack.length - 1] === dialogInstanceId;
      if (!isTopDialog) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(panelRef.current);
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      const stackIndex = dialogStack.lastIndexOf(dialogInstanceId);
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1);
      unlockBodyScroll();

      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement && document.contains(previousActiveElement)) {
        window.setTimeout(() => previousActiveElement.focus({ preventScroll: true }), 0);
      }
    };
  }, [closeOnEscape, dialogInstanceId, initialFocusRef, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const resolvedPanelId = panelAttributes?.id || panelDataId || `${dialogInstanceId}-panel`;
  const backdropLayer = layer === 'modal' ? 'modal-backdrop' : `${layer}-backdrop`;
  const panelLayer = layer;

  return createPortal(
    <div
      data-kourosh-overlay={backdropDataId || 'backdrop'}
      data-kourosh-layer={backdropLayer}
      className={cn(
        'fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out',
        showBackdrop ? 'bg-slate-950/38 dark:bg-black/75' : 'bg-transparent',
        showContent ? 'opacity-100' : 'pointer-events-none opacity-0',
        overlayClassName,
        className,
      )}
      onClick={(event) => {
        if (!closeOnBackdrop || event.currentTarget !== event.target) return;
        onClose();
      }}
      dir="rtl"
    >
      <div
        {...panelAttributes}
        ref={panelRef}
        id={resolvedPanelId}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        data-kourosh-overlay="panel"
        data-kourosh-layer={panelLayer}
        className={cn(
          'w-full outline-none',
          showContent ? 'translate-y-0 opacity-100 md:scale-100' : 'pointer-events-none translate-y-8 opacity-0 md:translate-y-0 md:scale-[0.985]',
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default DialogShell;
