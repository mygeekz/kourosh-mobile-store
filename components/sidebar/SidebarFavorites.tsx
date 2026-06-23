import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import type { FavoriteItem } from '../../contexts/FavoritesContext';
import { FontAwesomeIcon } from '../ui';

interface SidebarFavoritesProps {
  favorites: FavoriteItem[];
  onRemoveFavorite: (path: string) => void;
}

export const SidebarFavorites: React.FC<SidebarFavoritesProps> = ({ favorites, onRemoveFavorite }) => {
  if (favorites.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="px-2 pb-2">
      <div className="px-2 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500 dark:text-gray-400">
          <span className="w-8 h-8 rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-600 grid place-items-center shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <FontAwesomeIcon icon="fa-solid fa-star" />
          </span>
          علاقه‌مندی‌ها
        </div>
        <span className="text-[11px] px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          {favorites.length.toLocaleString('fa-IR')}
        </span>
      </div>

      <ul className="space-y-1">
        {favorites.slice(0, 10).map((favorite) => (
          <li key={favorite.path}>
            <NavLink
              to={favorite.path}
              className={({ isActive }) =>
                [
                  'group relative flex items-center gap-3 px-3 py-2 rounded-2xl overflow-hidden border border-transparent transition',
                  isActive
                    ? 'border border-[var(--sidebar-active-border)] bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] shadow-[var(--sidebar-active-shadow)] ring-0 dark:text-[var(--sidebar-active-fg-dark)]'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/60',
                ].join(' ')
              }
            >
              <span
                className={[
                  'w-9 h-9 rounded-2xl grid place-items-center shadow-sm',
                  'bg-white/70 dark:bg-gray-900/30',
                ].join(' ')}
                style={{ minHeight: 'var(--app-header-h)' }}
              >
                <FontAwesomeIcon icon={favorite.icon ?? 'fa-regular fa-star'} />
              </span>
              <span className="text-[12px] font-semibold truncate flex-1">{favorite.title}</span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveFavorite(favorite.path);
                }}
                className="opacity-0 group-hover:opacity-100 transition w-8 h-8 rounded-2xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 text-current"
                title="حذف مورد از علاقه‌مندی‌ها"
                aria-label="حذف مورد از علاقه‌مندی‌ها"
              >
                <FontAwesomeIcon icon="fa-solid fa-xmark" />
              </button>

              <span
                className={[
                  'pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition',
                  'bg-gradient-to-l from-white/0 to-white/20',
                ].join(' ')}
              />
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="my-3 h-px bg-slate-200 dark:bg-slate-800" />
    </motion.div>
  );
};
