import React from 'react';

export const CommandPaletteFooter: React.FC = () => (
  <footer className="command-palette-footer">
    <span className="command-palette-footer__group">
      <kbd>Esc</kbd><span>بستن</span>
    </span>
    <span className="command-palette-footer__group">
      <kbd>↑↓</kbd><span>حرکت</span><kbd>Enter</kbd><span>انتخاب</span>
    </span>
  </footer>
);
