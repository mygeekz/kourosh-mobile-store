import { useEffect, useRef, useState, type Dispatch, type KeyboardEventHandler, type RefObject, type SetStateAction } from 'react';

import { recordSearch } from '../../utils/searchInsights';
import type { CommandPaletteCombinedItem, CommandPaletteDataQuickAction, DataSearchItem } from './commandPaletteTypes';

export type UseCommandPaletteStateOptions = {
  open: boolean;
  onClose: () => void;
};

export type CommandPaletteStateController = {
  inputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
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
  listRef: RefObject<HTMLDivElement | null>;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  combinedItems: CommandPaletteCombinedItem[];
  onOpenNav: (path: string) => void;
  onOpenData: (item: DataSearchItem, action?: CommandPaletteDataQuickAction) => void;
};

export function useCommandPaletteState({ open, onClose }: UseCommandPaletteStateOptions): CommandPaletteStateController {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      previouslyFocusedRef.current?.focus?.();
      return;
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let seeded = '';
    try {
      seeded = localStorage.getItem('commandPaletteInitialQuery') || '';
      localStorage.removeItem('commandPaletteInitialQuery');
    } catch {}
    setQuery(seeded);
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
