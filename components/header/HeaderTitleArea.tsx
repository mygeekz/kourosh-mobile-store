import React from 'react';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import type { NavigationIconMetadata } from '../../types/iconMetadata';

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
};

const HeaderTitleArea: React.FC<HeaderTitleAreaProps> = ({
  pageTitle,
  currentNav,
  canFavorite,
  isFavorite,
  toggleFavorite,
}) => {
  const favoritePath = currentNav?.path;
  const favoriteActive = Boolean(favoritePath && isFavorite(favoritePath));

  return (
    <div className="header-title-stack flex flex-col min-w-0">
      <div className="header-title-row flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="text-[14px] sm:text-base md:text-[17px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[48vw] sm:max-w-none">
            {pageTitle}
          </h2>

          {currentNav && (currentNav.parentTitle || currentNav.title) && (
            <div className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[56vw] sm:max-w-none">
              {currentNav.parentTitle ? (
                <>
                  <span className="font-semibold">{currentNav.parentTitle}</span>
                  <span className="mx-1 opacity-60">/</span>
                </>
              ) : null}
              <span>{currentNav.title ?? pageTitle}</span>
            </div>
          )}
        </div>

        {canFavorite && currentNav && favoritePath ? (
          <button
            type="button"
            onClick={() =>
              toggleFavorite({
                key: favoritePath,
                title: currentNav.title,
                path: favoritePath,
                icon: currentNav.icon,
                parentTitle: currentNav.parentTitle,
              })
            }
            data-skip-global-button="true"
            className="header-action-icon header-favorite-button grid h-8 w-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title={favoriteActive ? 'حذف مورد از علاقه‌مندی‌ها' : 'افزودن مورد جدید به علاقه‌مندی‌ها'}
            aria-label="علاقه‌مندی"
          >
            <FontAwesomeIcon
              icon={favoriteActive ? 'fa-solid fa-star' : 'fa-regular fa-star'}
              className={favoriteActive ? 'text-amber-500' : undefined}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default HeaderTitleArea;
