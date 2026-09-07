import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';
import Surface, { type GlassSurfaceScheme, type GlassSurfaceVariant, type SurfaceMaterial } from './Surface';
import { getOverlayPortalHost, type OverlayLayerKind } from './overlayContract';

export type DialogLayer = 'modal' | 'drawer' | 'sheet' | 'command';
export type DialogMotion = 'standard' | 'fade' | 'none';
export type DialogMobileBehavior = 'dialog' | 'sheet' | 'fullscreen';

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
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  layer?: DialogLayer;
  motion?: DialogMotion;
  mobileBehavior?: DialogMobileBehavior;
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

const DIALOG_OWNED_FLOATING_LAYERS = new Set(['dropdown', 'popover', 'tooltip']);

let activeDialogCount = 0;
let rootWasInert = false;
const dialogStack: string[] = [];

const lockApplication = () => {
  if (typeof document === 'undefined') return;
  if (activeDialogCount === 0) {
    const root = document.getElementById('root');
    rootWasInert = Boolean(root?.hasAttribute('inert'));
    if (root && !rootWasInert) root.setAttribute('inert', '');
    document.documentElement.classList.add('kourosh-dialog-open');
    document.body.classList.add('kourosh-dialog-open');
  }
  activeDialogCount += 1;
};

const unlockApplication = () => {
  if (typeof document === 'undefined') return;
  activeDialogCount = Math.max(0, activeDialogCount - 1);
  if (activeDialogCount !== 0) return;

  const root = document.getElementById('root');
  if (root && !rootWasInert) root.removeAttribute('inert');
  rootWasInert = false;
  document.documentElement.classList.remove('kourosh-dialog-open');
  document.body.classList.remove('kourosh-dialog-open');
};

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => {
    const disabled = node.getAttribute('aria-disabled') === 'true';
    const hidden = node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true';
    return !disabled && !hidden && node.offsetParent !== null;
  });
};

const isDialogOwnedFloatingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const host = target.closest<HTMLElement>('[data-kourosh-layer-host]');
  return Boolean(host && DIALOG_OWNED_FLOATING_LAYERS.has(host.dataset.kouroshLayerHost || ''));
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
  mobileBehavior = 'dialog',
  surface = 'default',
  surfaceVariant = 'panel',
  surfaceScheme = 'adaptive',
}) => {
  const reactId = useId();
  const dialogInstanceId = `kourosh-dialog-${reactId.replace(/:/g, '')}`;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [showContent, setShowContent] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const backdropLayer = `${layer}-backdrop` as OverlayLayerKind;
  const panelLayer = layer as OverlayLayerKind;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setPortalHost(null);
      return undefined;
    }
    setPortalHost(getOverlayPortalHost(backdropLayer, 'rtl'));
    return undefined;
  }, [backdropLayer, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      return undefined;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockApplication();
    dialogStack.push(dialogInstanceId);

    const focusTimer = window.setTimeout(() => {
      setShowContent(true);
      const panel = panelRef.current;
      if (!panel) return;

      const requestedFocus = initialFocusRef?.current;
      const declarativeFocus = panel.querySelector<HTMLElement>('[data-dialog-initial-focus="true"], [autofocus]');
      const nextFocus = requestedFocus && panel.contains(requestedFocus) ? requestedFocus : declarativeFocus || panel;
      nextFocus.focus({ preventScroll: true });
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      const isTopDialog = dialogStack[dialogStack.length - 1] === dialogInstanceId;
      if (!isTopDialog) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      if (isDialogOwnedFloatingTarget(event.target)) return;

      const panel = panelRef.current;
      const focusable = getFocusableElements(panel);
      if (!panel || !focusable.length) {
        event.preventDefault();
        panel?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const isTopDialog = dialogStack[dialogStack.length - 1] === dialogInstanceId;
      if (!isTopDialog) return;
      const panel = panelRef.current;
      if (!panel || panel.contains(event.target as Node) || isDialogOwnedFloatingTarget(event.target)) return;
      panel.focus({ preventScroll: true });
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      const stackIndex = dialogStack.lastIndexOf(dialogInstanceId);
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1);
      unlockApplication();

      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement && document.contains(previousActiveElement)) {
        window.setTimeout(() => previousActiveElement.focus({ preventScroll: true }), 0);
      }
    };
  }, [closeOnEscape, dialogInstanceId, initialFocusRef, isOpen]);

  if (!isOpen || !portalHost) return null;

  const resolvedPanelId = panelAttributes?.id || panelDataId || `${dialogInstanceId}-panel`;

  return createPortal(
    <div
      data-kourosh-overlay={backdropDataId || 'backdrop'}
      data-kourosh-layer={backdropLayer}
      data-dialog-layer={layer}
      data-dialog-mobile={mobileBehavior}
      className={cn(
        'kourosh-dialog-shell fixed inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out',
        showBackdrop ? 'kourosh-dialog-shell--backdrop' : 'kourosh-dialog-shell--transparent',
        showContent ? 'opacity-100' : 'pointer-events-none opacity-0',
        overlayClassName,
        className,
      )}
      onClick={(event) => {
        if (!closeOnBackdrop || event.currentTarget !== event.target) return;
        onCloseRef.current();
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
        data-dialog-mobile={mobileBehavior}
        surface={surface}
        variant={surfaceVariant}
        scheme={surfaceScheme}
        wrapContent={false}
        className={cn(
          'kourosh-dialog-shell__panel w-full outline-none',
          motion === 'none'
            ? (showContent ? 'opacity-100' : 'pointer-events-none opacity-0')
            : motion === 'fade'
              ? (showContent ? 'opacity-100' : 'pointer-events-none opacity-0')
              : (showContent ? 'translate-y-0 opacity-100 md:scale-100' : 'pointer-events-none translate-y-5 opacity-0 md:translate-y-0 md:scale-[0.985]'),
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        {children}
      </Surface>
    </div>,
    portalHost,
  );
};

export default DialogShell;
export type { DialogShellProps };
