import React from 'react';

import { Button, FontAwesomeIcon } from '../ui';

interface SidebarSearchProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({ inputRef, value, onChange }) => (
  <div className="app-sidebar-search" role="search">
    <FontAwesomeIcon icon="fa-solid fa-magnifying-glass" className="app-sidebar-search__icon" />
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="جستجو در منو…"
      className="app-sidebar-search__input"
      aria-label="جستجو در منو"
      autoComplete="off"
    />
    {value ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        ripple={false}
        autoIcon={false}
        className="app-sidebar-search__clear"
        onClick={() => onChange('')}
        aria-label="پاک‌کردن جستجو"
        tooltip="پاک‌کردن جستجو"
        leftIcon={<FontAwesomeIcon icon="fa-solid fa-xmark" />}
      />
    ) : null}
  </div>
);
