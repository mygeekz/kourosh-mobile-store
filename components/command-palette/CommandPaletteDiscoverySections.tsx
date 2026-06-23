import React from 'react';

import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import { CommandPaletteSection } from './CommandPaletteRows';
import type { SearchInsightChip } from './commandPaletteTypes';

export const CommandPaletteDiscoverySections: React.FC<{
  query: string;
  recentSearches: SearchInsightChip[];
  popularSearches: SearchInsightChip[];
  relatedSuggestions: string[];
  onSelectQuery: (query: string, options?: { record?: boolean }) => void;
}> = ({ query, recentSearches, popularSearches, relatedSuggestions, onSelectQuery }) => (
  <>
    {!query.trim() && (
      <CommandPaletteSection title="جستجوهای کاربردی">
        <div className="px-2 pb-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
              <FontAwesomeIcon icon="fa-regular fa-clock" /> آخرین جستجوها
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.length ? recentSearches.slice(0, 6).map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => onSelectQuery(item.query)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <FontAwesomeIcon icon="fa-solid fa-rotate-left" className="text-[10px]" />
                  {item.query}
                </button>
              )) : <div className="text-xs text-gray-400">هنوز جستجویی ثبت اطلاعات نشده است.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
              <FontAwesomeIcon icon="fa-solid fa-fire" /> پرجستجوها
            </div>
            <div className="flex flex-wrap gap-2">
              {popularSearches.length ? popularSearches.slice(0, 6).map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => onSelectQuery(item.query)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1 text-[10px] font-bold dark:bg-black/20">{item.count}</span>
                  {item.query}
                </button>
              )) : <div className="text-xs text-gray-400">بعد از چند جستجو اینجا پیشنهادهای پرتکرار را می‌بینی.</div>}
            </div>
          </div>
        </div>
      </CommandPaletteSection>
    )}

    {query.trim() && relatedSuggestions.length > 0 && (
      <CommandPaletteSection title="پیشنهادهای مرتبط">
        <div className="px-2 pb-2 flex flex-wrap gap-2">
          {relatedSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelectQuery(item, { record: true })}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10"
            >
              <FontAwesomeIcon icon="fa-solid fa-star" className="text-[10px]" />
              {item}
            </button>
          ))}
        </div>
      </CommandPaletteSection>
    )}
  </>
);
