import React, { type ReactNode, useId } from 'react';

import { cn } from '../../utils/cn';
import ModalHeader from '../modals/ModalHeader';
import type { ModalTone } from '../modals/modalTypes';
import DialogShell from './DialogShell';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'wide';
export type DrawerSide = 'inline-start' | 'inline-end';
export type DrawerBodyPadding = 'default' | 'none';
export type DrawerBodyScroll = 'auto' | 'hidden';

export interface DrawerProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  isOpen?: boolean;
  size?: DrawerSize;
  side?: DrawerSide;
  tone?: ModalTone;
  kicker?: string;
  ariaDescription?: string;
  iconClass?: string;
  hideCloseButton?: boolean;
  hideHeader?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  bodyClassName?: string;
  bodyPadding?: DrawerBodyPadding;
  bodyScroll?: DrawerBodyScroll;
  panelClassName?: string;
  overlayClassName?: string;
  footer?: ReactNode;
  panelAttributes?: React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | number | boolean | undefined>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const Drawer: React.FC<DrawerProps> = ({
  title,
  onClose,
  children,
  isOpen = true,
  size = 'md',
  side = 'inline-end',
  tone = 'neutral',
  kicker,
  ariaDescription,
  iconClass,
  hideCloseButton = false,
  hideHeader = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  bodyClassName,
  bodyPadding = 'default',
  bodyScroll = 'auto',
  panelClassName,
  overlayClassName,
  footer,
  panelAttributes,
  initialFocusRef,
}) => {
  const reactId = useId().replace(/:/g, '');
  const titleId = `kourosh-drawer-title-${reactId}`;
  const descriptionId = ariaDescription ? `kourosh-drawer-description-${reactId}` : undefined;

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      initialFocusRef={initialFocusRef}
      layer="drawer"
      mobileBehavior="fullscreen"
      ariaLabel={hideHeader ? title : undefined}
      ariaLabelledBy={hideHeader ? undefined : titleId}
      ariaDescribedBy={descriptionId}
      overlayClassName={cn('kourosh-drawer__backdrop', overlayClassName)}
      panelClassName={cn('kourosh-drawer__panel', panelClassName)}
      panelAttributes={{
        ...panelAttributes,
        'data-drawer-size': size,
        'data-drawer-side': side,
      }}
    >
      {hideHeader && ariaDescription ? <p id={descriptionId} className="sr-only">{ariaDescription}</p> : null}
      {!hideHeader ? (
        <ModalHeader
          title={title}
          titleId={titleId}
          descriptionId={descriptionId}
          ariaDescription={ariaDescription}
          kicker={kicker}
          iconClass={iconClass}
          tone={tone}
          onClose={onClose}
          hideCloseButton={hideCloseButton}
          className="kourosh-drawer__header"
        />
      ) : null}
      <div
        className={cn('kourosh-drawer__body', bodyClassName)}
        data-drawer-body-padding={bodyPadding}
        data-drawer-body-scroll={bodyScroll}
      >
        {children}
      </div>
      {footer ? <footer className="kourosh-drawer__footer">{footer}</footer> : null}
    </DialogShell>
  );
};

export default Drawer;
