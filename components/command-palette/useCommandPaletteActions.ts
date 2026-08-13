import type { NavigateFunction } from 'react-router-dom';

import { canAccessNavigationPath, type NavigationFeatureFlags } from '../../utils/navigationPolicy';
import { recordSearch } from '../../utils/searchInsights';
import type { RoleName } from '../../utils/rbac';
import { getDataActionPath, getDataDomainTitle } from './commandPaletteData';
import type { CommandPaletteDataQuickAction, CommandPaletteNavLike, DataSearchItem } from './commandPaletteTypes';

type ToggleFavorite = (item: {
  key: string;
  title: string;
  path: string;
  icon?: CommandPaletteNavLike['icon'];
  parentTitle?: string;
}) => void;

export type UseCommandPaletteActionsParams = {
  roleName?: RoleName | null;
  featureFlags: NavigationFeatureFlags;
  query: string;
  processedFinal: string;
  navigate: NavigateFunction;
  onClose: () => void;
  toggleFavorite: ToggleFavorite;
};

export function useCommandPaletteActions({
  roleName,
  featureFlags,
  query,
  processedFinal,
  navigate,
  onClose,
  toggleFavorite,
}: UseCommandPaletteActionsParams) {
  const openNav = (path: string) => {
    if (!canAccessNavigationPath(roleName, featureFlags, path)) return;
    const term = (processedFinal || query).trim();
    if (term) recordSearch(term);
    navigate(path);
    onClose();
  };

  const openData = (item: DataSearchItem, action?: CommandPaletteDataQuickAction) => {
    const term = processedFinal.trim();
    const actionPath = getDataActionPath(item, action, term);

    if (!canAccessNavigationPath(roleName, featureFlags, actionPath)) return;
    recordSearch((processedFinal || query).trim() || item.title || getDataDomainTitle(item.domain));
    navigate(actionPath);
    onClose();
  };

  const toggleNavFavorite = (item: CommandPaletteNavLike) => {
    toggleFavorite({ key: item.path, title: item.title, path: item.path, icon: item.icon, parentTitle: item.parentTitle });
  };

  return { openNav, openData, toggleNavFavorite };
}
