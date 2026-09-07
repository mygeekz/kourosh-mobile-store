import React from 'react';

import { FontAwesomeIcon } from '@/components/ui';
import { CommandPaletteSection } from './CommandPaletteRows';
import type { SearchInsightChip } from './commandPaletteTypes';

const QueryChip: React.FC<{
  icon: 'fa-solid fa-rotate-left' | 'fa-solid fa-fire' | 'fa-solid fa-star';
  label: string;
  count?: number;
  onClick: () => void;
}> = ({ icon, label, count, onClick }) => (
  <button type="button" data-skip-global-button="true" onClick={onClick} className="command-palette-query-chip">
    <FontAwesomeIcon icon={icon} />
    <span>{label}</span>
    {typeof count === 'number' ? <span className="command-palette-query-chip__count">{count}</span> : null}
  </button>
);

export const CommandPaletteDiscoverySections: React.FC<{
  query: string;
  recentSearches: SearchInsightChip[];
  popularSearches: SearchInsightChip[];
  relatedSuggestions: string[];
  onSelectQuery: (query: string, options?: { record?: boolean }) => void;
}> = ({ query, recentSearches, popularSearches, relatedSuggestions, onSelectQuery }) => (
  <>
    {!query.trim() && (recentSearches.length > 0 || popularSearches.length > 0) ? (
      <CommandPaletteSection title="جستجوهای کاربردی">
        <div className="command-palette-discovery-grid">
          {recentSearches.length > 0 ? (
            <div className="command-palette-discovery-group">
              <div className="command-palette-discovery-group__label">آخرین جستجوها</div>
              <div className="command-palette-query-chips">
                {recentSearches.slice(0, 5).map((item) => (
                  <QueryChip key={item.query} icon="fa-solid fa-rotate-left" label={item.query} onClick={() => onSelectQuery(item.query)} />
                ))}
              </div>
            </div>
          ) : null}
          {popularSearches.length > 0 ? (
            <div className="command-palette-discovery-group">
              <div className="command-palette-discovery-group__label">پرجستجوها</div>
              <div className="command-palette-query-chips">
                {popularSearches.slice(0, 5).map((item) => (
                  <QueryChip key={item.query} icon="fa-solid fa-fire" label={item.query} count={item.count} onClick={() => onSelectQuery(item.query)} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CommandPaletteSection>
    ) : null}

    {query.trim() && relatedSuggestions.length > 0 ? (
      <CommandPaletteSection title="پیشنهادهای مرتبط">
        <div className="command-palette-query-chips">
          {relatedSuggestions.map((item) => (
            <QueryChip key={item} icon="fa-solid fa-star" label={item} onClick={() => onSelectQuery(item, { record: true })} />
          ))}
        </div>
      </CommandPaletteSection>
    ) : null}
  </>
);
