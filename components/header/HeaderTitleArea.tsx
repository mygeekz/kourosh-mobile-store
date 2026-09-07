import React from 'react';
import HeaderIconButton from './HeaderIconButton';
import type { NavigationIconMetadata } from '../../types/iconMetadata';
import type { NavigationContext } from '../../utils/navigationContext';

type HeaderNavEntry = {
  path?: string;
  title: string;
  parentTitle?: string;
  icon?: NavigationIconMetadata;
};

type HeaderFavoritePayload = {
  key: string;
  title: string;
  path: string;
  icon?: NavigationIconMetadata;
  parentTitle?: string;
};

type HeaderTitleAreaProps = {
  pageTitle: string;
  currentNav?: HeaderNavEntry | null;
  canFavorite: boolean;
  isFavorite: (path: string) => boolean;
  toggleFavorite: (favorite: HeaderFavoritePayload) => void;
  navigationContext?: NavigationContext;
};

const HeaderTitleArea: React.FC<HeaderTitleAreaProps> = ({
  pageTitle,
  currentNav,
  canFavorite,
  isFavorite,
  toggleFavorite,
  navigationContext,
}) => {
  const favoritePath = currentNav?.path;
  const favoriteActive = Boolean(favoritePath && isFavorite(favoritePath));

  const contextLabels = navigationContext?.breadcrumbLabels || [];

  return (
    <div className="app-header-title" data-ui-header-title="true">
      <div className="min-w-0 flex-1">
        {contextLabels.length > 0 ? (
          <nav
            className="mb-0.5 hidden min-w-0 items-center gap-1 overflow-hidden text-[10px] font-bold leading-none text-slate-400 dark:text-slate-500 sm:flex"
            aria-label="مسیر صفحه"
            data-ui-header-context="true"
          >
            {contextLabels.map((label, index) => (
              <React.Fragment key={`${label}-${index}`}>
                {index > 0 ? <span className="shrink-0 opacity-60" aria-hidden="true">/</span> : null}
                <span className="min-w-0 truncate">{label}</span>
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h2 className="app-header-title__heading" data-tooltip={pageTitle}>
          {pageTitle}
        </h2>
      </div>

      {canFavorite && currentNav && favoritePath ? (
        <HeaderIconButton
          onClick={() =>
            toggleFavorite({
              key: favoritePath,
              title: currentNav.title,
              path: favoritePath,
              icon: currentNav.icon,
              parentTitle: currentNav.parentTitle,
            })
          }
          icon={favoriteActive ? 'fa-solid fa-star' : 'fa-regular fa-star'}
          iconClassName={favoriteActive ? 'text-amber-500' : undefined}
          active={favoriteActive}
          tooltip={favoriteActive ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          aria-label={favoriteActive ? 'حذف صفحه از علاقه‌مندی‌ها' : 'افزودن صفحه به علاقه‌مندی‌ها'}
        />
      ) : null}
    </div>
  );
};

export default HeaderTitleArea;
