import { useMemo } from 'react';

import { SIDEBAR_ITEMS } from '../../constants';
import type { FavoriteItem } from '../../contexts/FavoritesContext';
import { filterNavigationFavorites, filterNavigationItems, type NavigationFeatureFlags } from '../../utils/navigationPolicy';
import { flattenNav, type FlatNavItem } from '../../utils/nav';
import { getRecents } from '../../utils/recents';
import { processQuery } from '../../utils/search/processQuery';
import { buildRelatedSuggestions, getPopularSearches, getRecentSearches } from '../../utils/searchInsights';
import type { RoleName } from '../../utils/rbac';
import { useCommandPaletteDataSearch } from './useCommandPaletteDataSearch';
import type { CommandPaletteCombinedItem, CommandPaletteNavLike } from './commandPaletteTypes';

export type UseCommandPaletteResultsParams = {
  open: boolean;
  query: string;
  token?: string | null;
  roleName?: RoleName | null;
  featureFlags: NavigationFeatureFlags;
  favorites: readonly FavoriteItem[];
};

export function useCommandPaletteResults({
  open,
  query,
  token,
  roleName,
  featureFlags,
  favorites,
}: UseCommandPaletteResultsParams) {
  const visibleFavorites = useMemo(
    () => filterNavigationFavorites(favorites, { roleName, featureFlags }),
    [favorites, roleName, featureFlags],
  );

  const flat = useMemo(() => {
    const filtered = filterNavigationItems(SIDEBAR_ITEMS, { roleName, featureFlags });
    return flattenNav(filtered);
  }, [roleName, featureFlags]);

  const recents = useMemo(() => getRecents() as CommandPaletteNavLike[], [open]);
  const recentSearches = useMemo(() => getRecentSearches(), [open, query]);
  const popularSearches = useMemo(() => getPopularSearches(), [open, query]);
  const processed = useMemo(() => processQuery(query), [query]);

  const smartSuggestion = useMemo(() => {
    const suggested = processed.suggestion?.trim();
    if (!suggested) return null;
    if (suggested === query.trim().toLowerCase()) return null;
    return suggested;
  }, [processed.suggestion, query]);

  const relatedSuggestions = useMemo(() => {
    const pool = [
      ...recentSearches.map((item) => item.query),
      ...popularSearches.map((item) => item.query),
      ...flat.map((item) => item.title),
      smartSuggestion || '',
      'کاور', 'گلس', 'شارژر', 'اقساط', 'تعمیرات', 'مشتری', 'گوشی',
    ];
    return buildRelatedSuggestions(query || processed.final || '', pool, query.trim() ? 6 : 8);
  }, [recentSearches, popularSearches, flat, smartSuggestion, query, processed.final]);

  const { dataResults, dataLoading, dataErr } = useCommandPaletteDataSearch({
    open,
    term: processed.final || '',
    token,
  });

  const navResults = useMemo<FlatNavItem[]>(() => {
    const term = (processed.final || '').toLowerCase().trim();
    if (!term) return flat.slice(0, 30);
    return flat
      .filter((item) => (`${item.title} ${item.parentTitle ?? ''} ${item.path}`).toLowerCase().includes(term))
      .slice(0, 50);
  }, [flat, processed.final]);

  const combinedItems = useMemo<CommandPaletteCombinedItem[]>(() => {
    if (!query.trim()) return navResults.map((item) => ({ kind: 'nav', key: item.path, nav: item }));
    const data = dataResults.map((item) => ({ kind: 'data', key: `${item.domain}:${item.id}`, data: item } as const));
    const nav = navResults.map((item) => ({ kind: 'nav', key: item.path, nav: item } as const));
    return [...data, ...nav];
  }, [query, dataResults, navResults]);

  return {
    visibleFavorites,
    recents,
    recentSearches,
    popularSearches,
    processed,
    smartSuggestion,
    relatedSuggestions,
    dataResults,
    dataLoading,
    dataErr,
    navResults,
    combinedItems,
  };
}
