import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import DialogShell from './ui/DialogShell';
import {
  CommandPaletteDiscoverySections,
  CommandPaletteFooter,
  CommandPaletteResultsList,
  CommandPaletteSearchHeader,
  useCommandPaletteActions,
  useCommandPaletteKeyboardNavigation,
  useCommandPaletteResults,
  useCommandPaletteState,
  type CommandPaletteProps,
} from './command-palette/index';

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const roleName = currentUser?.roleName;
  const { flags: featureFlags } = useFeatureFlags();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const {
    inputRef,
    listRef,
    query,
    activeIndex,
    setActiveIndex,
    setQueryAndReset,
    clearQuery,
    selectQuery,
  } = useCommandPaletteState({ open, onClose });

  const {
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
  } = useCommandPaletteResults({ open, query, roleName, featureFlags, favorites, token });

  const { openNav, openData, toggleNavFavorite } = useCommandPaletteActions({
    roleName,
    featureFlags,
    query,
    processedFinal: processed.final || '',
    navigate,
    onClose,
    toggleFavorite,
  });

  const onSearchKeyDown = useCommandPaletteKeyboardNavigation({
    open,
    onClose,
    listRef,
    activeIndex,
    setActiveIndex,
    combinedItems,
    onOpenNav: openNav,
    onOpenData: openData,
  });

  if (!open) return null;

  return (
    <DialogShell
      isOpen={open}
      onClose={onClose}
      layer="command"
      initialFocusRef={inputRef}
      ariaLabel="جستجوی سریع"
      overlayClassName="app-command-palette-overlay ux-overlay-backdrop"
      panelClassName="command-palette-panel ux-stable-panel ux-stable-floating-panel"
      closeOnBackdrop
      closeOnEscape
      panelAttributes={{
        'data-command-palette-root': 'true',
      }}
    >
      <CommandPaletteSearchHeader
        inputRef={inputRef}
        query={query}
        smartSuggestion={smartSuggestion}
        onQueryChange={setQueryAndReset}
        onClear={clearQuery}
        onApplySuggestion={(nextQuery) => selectQuery(nextQuery, { record: true })}
        onKeyDown={onSearchKeyDown}
      />

      <div ref={listRef} className="max-h-[70vh] overflow-auto">
        <CommandPaletteDiscoverySections
          query={query}
          recentSearches={recentSearches}
          popularSearches={popularSearches}
          relatedSuggestions={relatedSuggestions}
          onSelectQuery={selectQuery}
        />
        <CommandPaletteResultsList
          query={query}
          activeIndex={activeIndex}
          combinedItems={combinedItems}
          dataLoading={dataLoading}
          dataErr={dataErr}
          dataResults={dataResults}
          navResultsCount={navResults.length}
          visibleFavorites={visibleFavorites}
          recents={recents}
          isFavorite={isFavorite}
          onToggleFavorite={toggleNavFavorite}
          onOpenNav={openNav}
          onOpenData={openData}
        />
      </div>

      <CommandPaletteFooter />
    </DialogShell>
  );
};
