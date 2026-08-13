import React from 'react';

import { FontAwesomeIcon } from '@/components/ui';
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
  <header className="command-palette-header">
    <div className="command-palette-search-control">
      <span className="command-palette-search-control__icon" aria-hidden="true">
        <FontAwesomeIcon icon="fa-solid fa-magnifying-glass" />
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="جستجو در صفحات، مشتری، کالا، فاکتور یا تعمیرات"
        className="command-palette-input"
        aria-label="جستجوی سریع"
      />
      {query.trim() ? (
        <button
          type="button"
          data-skip-global-button="true"
          onClick={onClear}
          className="command-palette-search-control__action"
          data-tooltip="پاک کردن جستجو"
          aria-label="پاک کردن جستجو"
        >
          <FontAwesomeIcon icon="fa-solid fa-xmark" />
        </button>
      ) : (
        <span className="command-palette-shortcut" aria-hidden="true">Ctrl K</span>
      )}
    </div>

    <div className="command-palette-header__meta">
      <span>با کلیدهای بالا و پایین حرکت کنید و Enter را بزنید.</span>
      {smartSuggestion ? (
        <button
          type="button"
          data-skip-global-button="true"
          onClick={() => onApplySuggestion(smartSuggestion)}
          className="command-palette-suggestion"
          data-tooltip="اعمال پیشنهاد جستجو"
        >
          <FontAwesomeIcon icon="fa-solid fa-wand-magic-sparkles" />
          <span>منظورت «{smartSuggestion}» بود؟</span>
        </button>
      ) : null}
    </div>
  </header>
);
