import React from 'react';

import { getNavigationContextSummary } from '../../utils/navigationContext';

import { CommandPaletteDataRow, CommandPaletteNavRow, CommandPaletteSection } from './CommandPaletteRows';
import type {
  CommandPaletteCombinedItem,
  CommandPaletteDataQuickAction,
  CommandPaletteNavLike,
  DataSearchItem,
} from './commandPaletteTypes';

export const CommandPaletteResultsList: React.FC<{
  query: string;
  activeIndex: number;
  combinedItems: CommandPaletteCombinedItem[];
  dataLoading: boolean;
  dataErr: string | null;
  dataResults: DataSearchItem[];
  navResultsCount: number;
  visibleFavorites: CommandPaletteNavLike[];
  recents: CommandPaletteNavLike[];
  isFavorite: (path: string) => boolean;
  onToggleFavorite: (item: CommandPaletteNavLike) => void;
  onOpenNav: (path: string) => void;
  onOpenData: (item: DataSearchItem, action?: CommandPaletteDataQuickAction) => void;
}> = ({
  query,
  activeIndex,
  combinedItems,
  dataLoading,
  dataErr,
  dataResults,
  navResultsCount,
  visibleFavorites,
  recents,
  isFavorite,
  onToggleFavorite,
  onOpenNav,
  onOpenData,
}) => (
  <>
    {visibleFavorites.length > 0 && !query.trim() && (
      <CommandPaletteSection title="علاقه‌مندی‌ها">
        {visibleFavorites.slice(0, 8).map((item) => (
          <CommandPaletteNavRow
            key={item.path}
            title={item.title}
            subtitle={getNavigationContextSummary(item.path)}
            icon={item.icon}
            starred
            onStar={() => onToggleFavorite(item)}
            onClick={() => onOpenNav(item.path)}
          />
        ))}
      </CommandPaletteSection>
    )}

    {recents.length > 0 && !query.trim() && (
      <CommandPaletteSection title="اخیراً باز شده">
        {recents.slice(0, 8).map((item) => (
          <CommandPaletteNavRow
            key={item.path}
            title={item.title}
            subtitle={getNavigationContextSummary(item.path)}
            icon={item.icon}
            starred={isFavorite(item.path)}
            onStar={() => onToggleFavorite(item)}
            onClick={() => onOpenNav(item.path)}
          />
        ))}
      </CommandPaletteSection>
    )}

    <CommandPaletteSection title={query.trim() ? 'نتایج' : 'همه صفحات'}>
      {query.trim() && (
        <div className="command-palette-results-note">
          {dataLoading ? 'در حال جستجو در مشتری/فاکتور/کالا/تعمیر/اقساط…' : dataErr ? dataErr : 'Enter = باز کردن • دکمه‌های کنار هر رکورد = اکشن سریع'}
        </div>
      )}

      {combinedItems.map((item, index) => {
        const selected = index === activeIndex;

        if (item.kind === 'nav') {
          return (
            <CommandPaletteNavRow
              key={item.key}
              title={item.nav.title}
              subtitle={getNavigationContextSummary(item.nav.path)}
              icon={item.nav.icon}
              starred={isFavorite(item.nav.path)}
              onStar={() => onToggleFavorite(item.nav)}
              onClick={() => onOpenNav(item.nav.path)}
              selected={selected}
              index={index}
            />
          );
        }

        return (
          <CommandPaletteDataRow
            key={item.key}
            item={item.data}
            selected={selected}
            onOpen={() => onOpenData(item.data, 'open')}
            onQuick={(action) => onOpenData(item.data, action)}
            index={index}
          />
        );
      })}

      {!dataLoading && !dataErr && query.trim() && dataResults.length === 0 && navResultsCount === 0 && (
        <div className="command-palette-empty">نتیجه‌ای پیدا نشد.</div>
      )}
      {!query.trim() && navResultsCount === 0 && (
        <div className="command-palette-empty">نتیجه‌ای پیدا نشد.</div>
      )}
    </CommandPaletteSection>
  </>
);
