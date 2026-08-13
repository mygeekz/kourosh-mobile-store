import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@/components/ui';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';
import type { HeaderQuickMenuSmartStyle } from './headerTypes';
import HeaderIconButton from './HeaderIconButton';

type HeaderQuickPopoverProps = {
  menuKey: string;
  title: string;
  subtitle: string;
  icon: FontAwesomeIconClass;
  destination: string;
  destinationLabel: string;
  position: HeaderQuickMenuSmartStyle;
  onClose: () => void;
  children: React.ReactNode;
};

const HeaderQuickPopover: React.FC<HeaderQuickPopoverProps> = ({
  menuKey,
  title,
  subtitle,
  icon,
  destination,
  destinationLabel,
  position,
  onClose,
  children,
}) => (
  <div
    data-ui-header-quick-panel={menuKey}
    data-state="open"
    className="app-header-popover"
    style={position}
    role="dialog"
    aria-label={title}
  >
    <header className="app-header-popover__header">
      <div className="app-header-popover__identity">
        <span className="app-header-popover__icon" aria-hidden="true">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div className="app-header-popover__heading">
          <div className="app-header-popover__title">{title}</div>
          <div className="app-header-popover__subtitle">{subtitle}</div>
        </div>
      </div>

      <HeaderIconButton
        icon="fa-solid fa-xmark"
        onClick={onClose}
        className="app-header-popover__dismiss"
        tooltip="بستن"
        aria-label="بستن پنجره"
      />
    </header>

    <div className="app-header-popover__body">{children}</div>

    <footer className="app-header-popover__footer">
      <Link to={destination} onClick={onClose} className="app-header-popover__primary">
        <span>{destinationLabel}</span>
        <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" />
      </Link>
    </footer>
  </div>
);

export default HeaderQuickPopover;
