import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import Surface, { type GlassSurfaceScheme, type GlassSurfaceVariant, type SurfaceMaterial } from './Surface';

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
  motion?: 'standard' | 'fade' | 'none';
  surface?: SurfaceMaterial;
  surfaceVariant?: GlassSurfaceVariant;
  surfaceScheme?: GlassSurfaceScheme;
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
  motion = 'standard',
  surface = 'default',
  surfaceVariant = 'panel',
  surfaceScheme = 'adaptive',
}) => {
  const reactId = useId();
  const dialogInstanceId = `kourosh-dialog-${reactId.replace(/:/g, '')}`;
  const overlayRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!isOpen) return undefined;

    const enforceViewportContract = () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      const viewportHeight = Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight));
      const viewportWidth = Math.max(320, Math.round(window.visualViewport?.width || window.innerWidth));
      const padding = layer === 'modal' ? (viewportWidth < 640 ? 8 : viewportWidth < 1024 ? 12 : 16) : 0;

      overlay.style.setProperty('box-sizing', 'border-box', 'important');
      overlay.style.setProperty('width', '100%', 'important');
      overlay.style.setProperty('height', `${viewportHeight}px`, 'important');
      overlay.style.setProperty('max-width', '100vw', 'important');
      overlay.style.setProperty('max-height', `${viewportHeight}px`, 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
      if (layer === 'modal') overlay.style.setProperty('padding', `${padding}px`, 'important');

      panel.style.setProperty('box-sizing', 'border-box', 'important');
      panel.style.setProperty('min-width', '0', 'important');
      panel.style.setProperty('min-height', '0', 'important');
      panel.style.setProperty('max-width', `${Math.max(280, viewportWidth - (padding * 2))}px`, 'important');
      panel.style.setProperty('max-height', `${Math.max(280, viewportHeight - (padding * 2))}px`, 'important');

      if (layer === 'modal') {
        panel.style.setProperty('display', 'flex', 'important');
        panel.style.setProperty('flex-direction', 'column', 'important');
        panel.style.setProperty('overflow', 'hidden', 'important');

        const panelChildren = Array.from(panel.children);
        const body = (panelChildren.find((child) => {
          const className = String((child as HTMLElement).className || '');
          return /(?:modal|dialog).*(?:body|content)|(?:body|content).*(?:modal|dialog)/i.test(className);
        }) || panelChildren.find((child) => {
          const className = String((child as HTMLElement).className || '');
          return !/(?:header|footer|actions)/i.test(className);
        })) as HTMLElement | undefined;

        if (body) {
          body.style.setProperty('min-width', '0', 'important');
          body.style.setProperty('min-height', '0', 'important');
          body.style.setProperty('max-height', 'none', 'important');
          body.style.setProperty('overflow', 'auto', 'important');
          body.style.setProperty('overscroll-behavior', 'contain', 'important');
          body.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
        }
      }
    };

    enforceViewportContract();
    window.addEventListener('resize', enforceViewportContract);
    window.addEventListener('orientationchange', enforceViewportContract);
    window.visualViewport?.addEventListener('resize', enforceViewportContract);
    return () => {
      window.removeEventListener('resize', enforceViewportContract);
      window.removeEventListener('orientationchange', enforceViewportContract);
      window.visualViewport?.removeEventListener('resize', enforceViewportContract);
    };
  }, [isOpen, layer]);

  if (!isOpen || typeof document === 'undefined') return null;

  const resolvedPanelId = panelAttributes?.id || panelDataId || `${dialogInstanceId}-panel`;
  const backdropLayer = layer === 'modal' ? 'modal-backdrop' : `${layer}-backdrop`;
  const panelLayer = layer;

  return createPortal(
    <div
      ref={overlayRef}
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
      <Surface
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
        surface={surface}
        variant={surfaceVariant}
        scheme={surfaceScheme}
        wrapContent={false}
        className={cn(
          'w-full outline-none',
          motion === 'none'
            ? (showContent ? 'opacity-100' : 'pointer-events-none opacity-0')
            : motion === 'fade'
              ? (showContent ? 'opacity-100' : 'pointer-events-none opacity-0')
              : (showContent ? 'translate-y-0 opacity-100 md:scale-100' : 'pointer-events-none translate-y-8 opacity-0 md:translate-y-0 md:scale-[0.985]'),
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        {children}
      </Surface>
    </div>,
    document.body,
  );
};

export default DialogShell;
