import React from 'react';

import { FontAwesomeIcon } from '../ui';

interface SidebarSearchProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({ inputRef, value, onChange }) => (
  <div className="px-3 pb-2">
    <div
      className="kourosh-sidebar-search-grid app-form-field app-form-field--search app-form-field--with-leading-icon"
      dir="rtl"
      data-ui-field="true"
      data-ui-field-kind="sidebar-search"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="جستجو در منو…"
        className="kourosh-sidebar-search-grid__input"
        data-sidebar-search-input="true"
        data-ui-control="true"
        data-ui-control-kind="search"
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'block',
          minWidth: 0,
          width: '100%',
          height: 'var(--sidebar-search-h)',
          lineHeight: 'var(--sidebar-search-h)',
          background: 'transparent',
          border: 0,
          outline: 0,
          boxShadow: 'none',
          borderRadius: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
          color: 'inherit',
          font: 'inherit',
          fontSize: '0.78rem',
          fontWeight: 650,
          direction: 'rtl',
          textAlign: 'right',
          padding: '0 0.55rem 0 0.15rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        aria-label="جستجو در منو"
      />
      <span className="kourosh-sidebar-search-grid__icon" aria-hidden="true">
        <FontAwesomeIcon icon="fa-solid fa-magnifying-glass" />
      </span>
    </div>
  </div>
);
