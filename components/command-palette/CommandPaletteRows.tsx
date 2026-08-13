import React from 'react';

import { FontAwesomeIcon } from '@/components/ui';
import type { FontAwesomeIconClass, NavigationIconMetadata } from '../../types/iconMetadata';
import type { CommandPaletteDataQuickAction, DataSearchItem } from './commandPaletteTypes';

export const CommandPaletteSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="command-palette-section">
    <h3 className="command-palette-section__title">{title}</h3>
    <div className="command-palette-section__content">{children}</div>
  </section>
);

export const CommandPaletteNavRow: React.FC<{
  title: string;
  subtitle?: string;
  icon?: NavigationIconMetadata;
  starred?: boolean;
  selected?: boolean;
  onStar: () => void;
  onClick: () => void;
  index?: number;
}> = ({ title, subtitle, icon, starred, selected, onStar, onClick, index }) => (
  <div
    role="option"
    aria-selected={Boolean(selected)}
    data-command-index={typeof index === 'number' ? index : undefined}
    data-selected={selected ? 'true' : 'false'}
    className="command-palette-row"
    onClick={onClick}
  >
    <span className="command-palette-row__icon" aria-hidden="true">
      <FontAwesomeIcon icon={icon ?? 'fa-solid fa-circle'} />
    </span>
    <span className="command-palette-row__body">
      <span className="command-palette-row__title">{title}</span>
      {subtitle ? <span className="command-palette-row__subtitle">{subtitle}</span> : null}
    </span>
    <button
      type="button"
      data-skip-global-button="true"
      className="command-palette-row__favorite-action"
      data-starred={starred ? 'true' : 'false'}
      onClick={(event) => { event.stopPropagation(); onStar(); }}
      aria-label={starred ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      data-tooltip={starred ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
    >
      <FontAwesomeIcon icon={starred ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
    </button>
  </div>
);

const getDomainBadge = (domain: string): { label: string; icon: FontAwesomeIconClass } => {
  switch (domain) {
    case 'customer': return { label: 'مشتری', icon: 'fa-solid fa-user' };
    case 'partner': return { label: 'همکار', icon: 'fa-solid fa-user-tie' };
    case 'invoice': return { label: 'فروش', icon: 'fa-solid fa-file-invoice-dollar' };
    case 'repair': return { label: 'تعمیر', icon: 'fa-solid fa-screwdriver-wrench' };
    case 'installment': return { label: 'اقساط', icon: 'fa-solid fa-credit-card' };
    case 'product': return { label: 'کالا', icon: 'fa-solid fa-box' };
    case 'phone': return { label: 'گوشی', icon: 'fa-solid fa-mobile-screen-button' };
    case 'service': return { label: 'خدمت', icon: 'fa-solid fa-wand-magic-sparkles' };
    default: return { label: 'مورد', icon: 'fa-solid fa-circle' };
  }
};

export const CommandPaletteDataRow: React.FC<{
  item: DataSearchItem;
  selected?: boolean;
  onOpen: () => void;
  onQuick: (action: CommandPaletteDataQuickAction) => void;
  index?: number;
}> = ({ item, selected, onOpen, onQuick, index }) => {
  const badge = getDomainBadge(item.domain);
  const quickAction = item.domain === 'installment'
    ? { key: 'payNext' as const, label: 'قسط بعدی', icon: 'fa-solid fa-bolt' as const }
    : item.domain === 'repair'
      ? { key: 'receipt' as const, label: 'رسید', icon: 'fa-solid fa-receipt' as const }
      : item.domain === 'invoice'
        ? { key: 'print' as const, label: 'چاپ', icon: 'fa-solid fa-print' as const }
        : null;

  return (
    <div
      role="option"
      aria-selected={Boolean(selected)}
      data-command-index={typeof index === 'number' ? index : undefined}
      data-selected={selected ? 'true' : 'false'}
      className="command-palette-row command-palette-row--data"
      onClick={onOpen}
    >
      <span className="command-palette-row__icon" aria-hidden="true">
        <FontAwesomeIcon icon={badge.icon} />
      </span>

      <span className="command-palette-row__body">
        <span className="command-palette-row__heading">
          <span className="command-palette-row__title">
            {item.titleHL ? <span dangerouslySetInnerHTML={{ __html: item.titleHL }} /> : item.title || `#${item.id}`}
          </span>
          <span className="command-palette-row__domain">{badge.label}</span>
        </span>
        {item.subtitle ? <span className="command-palette-row__subtitle">{item.subtitle}</span> : null}
        {item.snippet ? (
          <span className="command-palette-row__snippet">
            <span>تطابق: </span>
            <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
          </span>
        ) : null}
        {item.matchSource ? (
          <span className="command-palette-row__source" data-tooltip={item.matchReason || item.matchSource}>
            <FontAwesomeIcon icon="fa-solid fa-ranking-star" />
            <span>{item.matchSource}</span>
          </span>
        ) : null}
      </span>

      <span className="command-palette-row__actions">
        {quickAction ? (
          <button
            type="button"
            data-skip-global-button="true"
            className="command-palette-row__quick-action"
            onClick={(event) => { event.stopPropagation(); onQuick(quickAction.key); }}
            data-tooltip={quickAction.label}
          >
            <FontAwesomeIcon icon={quickAction.icon} />
            <span>{quickAction.label}</span>
          </button>
        ) : null}
        <button
          type="button"
          data-skip-global-button="true"
          className="command-palette-row__icon-action"
          onClick={(event) => { event.stopPropagation(); onQuick('open'); }}
          aria-label="باز کردن"
          data-tooltip="باز کردن"
        >
          <FontAwesomeIcon icon="fa-solid fa-arrow-up-from-bracket" />
        </button>
      </span>
    </div>
  );
};
