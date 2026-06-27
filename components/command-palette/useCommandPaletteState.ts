import { useEffect, useRef, useState, type Dispatch, type KeyboardEventHandler, type RefObject, type SetStateAction } from 'react';

import { recordSearch } from '../../utils/searchInsights';
import type { CommandPaletteCombinedItem, CommandPaletteDataQuickAction, DataSearchItem } from './commandPaletteTypes';

export type UseCommandPaletteStateOptions = {
  open: boolean;
  onClose: () => void;
};

export type CommandPaletteStateController = {
  inputRef: RefObject<HTMLInputElement>;
  listRef: RefObject<HTMLDivElement>;
  query: string;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setQueryAndReset: (nextQuery: string) => void;
  clearQuery: () => void;
  selectQuery: (nextQuery: string, options?: { record?: boolean }) => void;
};

export type UseCommandPaletteKeyboardNavigationOptions = {
  open: boolean;
  onClose: () => void;
  listRef: RefObject<HTMLDivElement>;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  combinedItems: CommandPaletteCombinedItem[];
  onOpenNav: (path: string) => void;
  onOpenData: (item: DataSearchItem, action?: CommandPaletteDataQuickAction) => void;
};

export function useCommandPaletteState({ open }: UseCommandPaletteStateOptions): CommandPaletteStateController {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;

    let seeded = '';
    try {
      seeded = localStorage.getItem('commandPaletteInitialQuery') || '';
      localStorage.removeItem('commandPaletteInitialQuery');
    } catch {}
    setQuery(seeded);
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);


  const setQueryAndReset = (nextQuery: string) => {
    setQuery(nextQuery);
    setActiveIndex(0);
  };

  const clearQuery = () => {
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const selectQuery = (nextQuery: string, options?: { record?: boolean }) => {
    setQuery(nextQuery);
    if (options?.record) recordSearch(nextQuery);
    setActiveIndex(0);
  };

  return {
    inputRef,
    listRef,
    query,
    activeIndex,
    setActiveIndex,
    setQueryAndReset,
    clearQuery,
    selectQuery,
  };
}

export function useCommandPaletteKeyboardNavigation({
  open,
  onClose,
  listRef,
  activeIndex,
  setActiveIndex,
  combinedItems,
  onOpenNav,
  onOpenData,
}: UseCommandPaletteKeyboardNavigationOptions): KeyboardEventHandler<HTMLInputElement> {
  useEffect(() => {
    setActiveIndex((index) => {
      const max = Math.max(0, combinedItems.length - 1);
      return Math.min(index, max);
    });
  }, [combinedItems.length, setActiveIndex]);

  useEffect(() => {
    if (!open) return;
    const host = listRef.current;
    if (!host) return;
    const node = host.querySelector<HTMLElement>(`[data-command-index=\"${activeIndex}\"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listRef, open]);

  const onSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (combinedItems.length ? (index + 1) % combinedItems.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (combinedItems.length ? (index - 1 + combinedItems.length) % combinedItems.length : 0));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, combinedItems.length - 1));
      return;
    }
    if (event.key === 'Tab' && combinedItems.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (event.shiftKey ? (index - 1 + combinedItems.length) % combinedItems.length : (index + 1) % combinedItems.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = combinedItems[activeIndex];
      if (!target) return;
      if (target.kind === 'nav') onOpenNav(target.nav.path);
      else onOpenData(target.data);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return onSearchKeyDown;
}
