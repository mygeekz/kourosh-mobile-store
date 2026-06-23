import React from 'react';

export const CommandPaletteFooter: React.FC = () => (
  <div className="px-4 py-3 border-t border-gray-200/70 dark:border-gray-800/70 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
    <span className="inline-flex items-center gap-2">
      <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Esc</span>
      بستن
    </span>
    <span className="inline-flex items-center gap-2">
      <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">↑↓</span>
      انتخاب
      <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Enter</span>
      رفتن
    </span>
  </div>
);
