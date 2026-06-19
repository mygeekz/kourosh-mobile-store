import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type FavoriteItem = {
  key: string;
  title: string;
  path: string;
  icon?: string;
  parentTitle?: string;
};

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  isFavorite: (path: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  removeFavorite: (path: string) => void;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const LS_KEY = 'app:favorites:v1';

function safeParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    safeParse<FavoriteItem[]>(localStorage.getItem(LS_KEY), [])
  );

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  const value = useMemo<FavoritesContextValue>(() => ({
    favorites,
    isFavorite: (path) => favorites.some(f => f.path === path),
    toggleFavorite: (item) => {
      setFavorites(prev => {
        const exists = prev.some(f => f.path === item.path);
        if (exists) return prev.filter(f => f.path !== item.path);
        const next = [{ ...item }, ...prev.filter(f => f.path !== item.path)];
        return next.slice(0, 30);
      });
    },
    removeFavorite: (path) => setFavorites(prev => prev.filter(f => f.path !== path)),
    clearFavorites: () => setFavorites([]),
  }), [favorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
