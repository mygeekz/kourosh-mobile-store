import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
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

  return createPortal(
    <AnimatePresence>
      <motion.div
        data-kourosh-overlay="backdrop"
        className="fixed inset-0 z-[2147483646] flex items-start justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button aria-label="بستن" data-kourosh-overlay="backdrop" className="ux-overlay-backdrop absolute inset-0 bg-black/38" onClick={onClose} />
        <motion.div
          role="dialog"
          aria-modal="true"
          data-kourosh-overlay="panel"
          className="command-palette-panel ux-stable-panel ux-stable-floating-panel relative z-[2147483647] w-full max-w-2xl overflow-hidden rounded-[22px] bg-white shadow-2xl border border-gray-200 dark:border-gray-800 dark:bg-slate-950"
          initial={{ y: 14, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 14, scale: 0.98, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};
