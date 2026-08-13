import { useEffect } from 'react';

export const useCommandPaletteShortcut = (onOpen: () => void): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isK = String(event.key || '').toLowerCase() === 'k';
      const isMod = event.ctrlKey || event.metaKey;
      const activeElement = document.activeElement as HTMLElement | null;
      const tag = activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || activeElement?.isContentEditable;

      if (isMod && isK && !isTyping) {
        event.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
};
