import React from 'react';

import { FontAwesomeIcon } from '../ui';

interface SidebarBrandBarProps {
  collapsed: boolean;
  isLoadingSettings: boolean;
  logoUrl: string | null;
  storeName: string;
}

export const SidebarBrandBar: React.FC<SidebarBrandBarProps> = ({ collapsed, isLoadingSettings, logoUrl, storeName }) => (
  <div
    className={[
      'sidebar-brand-bar h-14 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-2.5',
      collapsed ? 'px-2' : 'px-2.5',
    ].join(' ')}
    style={{ minHeight: 'var(--app-header-h)' }}
  >
    <div className="sidebar-brand-content flex items-center gap-3 min-w-0">
      {isLoadingSettings ? (
        <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
      ) : logoUrl ? (
        <img src={logoUrl} alt="لوگو" className="h-9 w-9 object-contain rounded-xl" />
      ) : (
        <div className="h-9 w-9 bg-primary/10 flex items-center justify-center rounded-xl">
          <FontAwesomeIcon icon="fa-solid fa-store" className="text-primary text-base" />
        </div>
      )}
      {!collapsed && <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{storeName}</h1>}
    </div>
  </div>
);
