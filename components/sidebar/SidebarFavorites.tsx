import React from 'react';
import { NavLink } from 'react-router-dom';

import type { FavoriteItem } from '../../contexts/FavoritesContext';
import { FontAwesomeIcon } from '../ui';

interface SidebarFavoritesProps {
  favorites: FavoriteItem[];
  onRemoveFavorite: (path: string) => void;
  onNavigate?: () => void;
}

export const SidebarFavorites: React.FC<SidebarFavoritesProps> = ({
  favorites,
  onRemoveFavorite,
  onNavigate,
}) => {
  if (favorites.length === 0) return null;

  return (
    <section className="app-sidebar-favorites" aria-labelledby="sidebar-favorites-title">
      <div className="app-sidebar-section-heading">
        <span id="sidebar-favorites-title" className="app-sidebar-section-heading__label">
          <FontAwesomeIcon icon="fa-solid fa-star" />
          علاقه‌مندی‌ها
        </span>
        <span className="app-sidebar-section-heading__count">{favorites.length.toLocaleString('fa-IR')}</span>
      </div>

      <ul className="app-sidebar-favorites__list">
        {favorites.slice(0, 6).map((favorite) => (
          <li key={favorite.path} className="app-sidebar-favorite">
            <NavLink
              to={favorite.path}
              onClick={onNavigate}
              className={({ isActive }) => [
                'app-sidebar-favorite__link',
                isActive ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="app-sidebar-favorite__icon" aria-hidden="true">
                <FontAwesomeIcon icon={favorite.icon ?? 'fa-regular fa-star'} />
              </span>
              <span className="app-sidebar-favorite__label">{favorite.title}</span>
            </NavLink>

            <button
              type="button"
              data-skip-global-button="true"
              className="app-sidebar-favorite__remove"
              onClick={() => onRemoveFavorite(favorite.path)}
              aria-label={`حذف ${favorite.title} از علاقه‌مندی‌ها`}
              data-tooltip="حذف از علاقه‌مندی‌ها"
            >
              <FontAwesomeIcon icon="fa-solid fa-xmark" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
