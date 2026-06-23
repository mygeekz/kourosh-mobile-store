import React from 'react';

import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import type { CommandPaletteInputRef } from './commandPaletteTypes';

export const CommandPaletteSearchHeader: React.FC<{
  inputRef: CommandPaletteInputRef;
  query: string;
  smartSuggestion: string | null;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  onApplySuggestion: (query: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
}> = ({ inputRef, query, smartSuggestion, onQueryChange, onClear, onApplySuggestion, onKeyDown }) => (
  <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm dark:bg-white dark:text-slate-900">
        <FontAwesomeIcon icon="fa-solid fa-magnifying-glass" />
      </div>
      <div className="flex-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="جستجوی سریع (صفحه، فاکتور، تعمیرات...)"
          className="command-palette-input w-full bg-transparent outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          ↑↓ جابه‌جایی • Enter انتخاب • Ctrl/⌘ + K بازکردن • Esc بستن
        </div>
        {query.trim() ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800"
            title="پاک کردن جستجو"
          >
            <FontAwesomeIcon icon="fa-solid fa-xmark" className="text-[10px]" />
            پاک کردن جستجو
          </button>
        ) : null}
        {smartSuggestion ? (
          <button
            type="button"
            onClick={() => onApplySuggestion(smartSuggestion)}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-950"
            title="اعمال پیشنهاد و جستجوی خودکار"
          >
            <FontAwesomeIcon icon="fa-solid fa-wand-magic-sparkles" className="text-[10px]" />
            منظورت <strong>{smartSuggestion}</strong> بود؟
          </button>
        ) : null}
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">Ctrl</span>
        <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">K</span>
      </div>
    </div>
  </div>
);
