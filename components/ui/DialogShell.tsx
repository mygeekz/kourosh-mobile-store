import React, { useEffect, useState } from 'react';
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
  backdropDataId?: string;
  panelDataId?: string;
  closeOnBackdrop?: boolean;
  showBackdrop?: boolean;
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
  backdropDataId,
  panelDataId,
  closeOnBackdrop = true,
  showBackdrop = true,
}) => {
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      return;
    }

    const previousOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const timer = window.setTimeout(() => setShowContent(true), 10);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleEscape);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-kourosh-overlay={backdropDataId || 'backdrop'}
      className={cn(
        'fixed inset-0 z-[2147483646] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out',
        showBackdrop ? 'bg-slate-950/38 dark:bg-black/75' : 'bg-transparent',
        showContent ? 'opacity-100' : 'pointer-events-none opacity-0',
        overlayClassName,
        className,
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
      dir="rtl"
      aria-hidden="false"
    >
      <div
        {...panelAttributes}
        id={panelDataId}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-kourosh-overlay="panel"
        className={cn(
          'w-full',
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
