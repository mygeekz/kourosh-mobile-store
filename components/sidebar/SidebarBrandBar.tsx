import React from 'react';

import defaultLogoUrl from '../assets/kourosh-final-symbol-gold.svg';
import { Button, FontAwesomeIcon } from '../ui';

interface SidebarBrandBarProps {
  isLoadingSettings: boolean;
  logoUrl: string | null;
  storeName: string;
  onClose?: () => void;
}

export const SidebarBrandBar: React.FC<SidebarBrandBarProps> = ({
  isLoadingSettings,
  logoUrl,
  storeName,
  onClose,
}) => (
  <header className="app-sidebar-brand">
    <div className="app-sidebar-brand__identity">
      {isLoadingSettings ? (
        <span className="app-sidebar-brand__logo app-sidebar-brand__logo--loading" aria-hidden="true" />
      ) : logoUrl ? (
        <img src={logoUrl} alt="لوگوی فروشگاه" className="app-sidebar-brand__logo" />
      ) : (
        <img
          src={defaultLogoUrl}
          alt="نشان کوروش"
          className="app-sidebar-brand__logo app-sidebar-brand__logo--fallback object-contain"
        />
      )}
      <h1 className="app-sidebar-brand__name">{storeName}</h1>
    </div>

    {onClose ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        ripple={false}
        autoIcon={false}
        className="app-sidebar-brand__close"
        onClick={onClose}
        aria-label="بستن منو"
        tooltip="بستن منو"
        leftIcon={<FontAwesomeIcon icon="fa-solid fa-xmark" />}
      />
    ) : null}
  </header>
);
