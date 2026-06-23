import React from 'react';
import { motion } from 'framer-motion';

import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import type { FontAwesomeIconClass, NavigationIconMetadata } from '../../types/iconMetadata';
import type { CommandPaletteDataQuickAction, DataSearchItem } from './commandPaletteTypes';

export const CommandPaletteSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-2">
    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400">{title}</div>
    <div className="px-2">{children}</div>
  </div>
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
  <motion.div
    layout
    data-command-index={typeof index === 'number' ? index : undefined}
    className={[
      'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
      selected
        ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white dark:text-slate-900 dark:border-white'
        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
    ].join(' ')}
    onClick={onClick}
  >
    <div
      className={[
        'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
        selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
      ].join(' ')}
    >
      <FontAwesomeIcon icon={icon ?? 'fa-solid fa-circle'} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}>{title}</div>
      {subtitle && (
        <div className={['text-xs truncate', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>{subtitle}</div>
      )}
    </div>
    <button
      type="button"
      className={[
        'w-9 h-9 rounded-2xl grid place-items-center transition',
        selected
          ? 'text-white/90 hover:bg-white/15'
          : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick={(e) => { e.stopPropagation(); onStar(); }}
      aria-label="علاقه‌مندی"
      title="علاقه‌مندی"
    >
      <FontAwesomeIcon icon={starred ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
    </button>
  </motion.div>
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
  const showPayNext = item.domain === 'installment';
  const showReceipt = item.domain === 'repair';
  const showPrint = item.domain === 'invoice';

  return (
    <motion.div
      layout
      data-command-index={typeof index === 'number' ? index : undefined}
      className={[
        'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
        selected
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white dark:text-slate-900 dark:border-white'
          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
      ].join(' ')}
      onClick={onOpen}
    >
      <div
        className={[
          'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
          selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
        ].join(' ')}
      >
        <FontAwesomeIcon icon={badge.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              'text-[11px] px-2 py-0.5 rounded-full border shrink-0',
              selected
                ? 'border-white/25 bg-white/10 text-white/90'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300',
            ].join(' ')}
          >
            {badge.label}
          </span>
          <div className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}>
            {item.titleHL ? <span dangerouslySetInnerHTML={{ __html: item.titleHL }} /> : item.title || `#${item.id}`}
          </div>
        </div>
        {item.subtitle ? (
          <div className={['text-xs truncate mt-0.5', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>
            {item.subtitle}
          </div>
        ) : null}
        {item.snippet ? (
          <div className={['text-xs line-clamp-2 leading-5 mt-1', selected ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'].join(' ')}>
            <span className={selected ? 'font-black text-white/75' : 'font-black text-slate-400 dark:text-slate-500'}>تطابق: </span>
            <span dangerouslySetInnerHTML={{ __html: item.snippet || '' }} />
          </div>
        ) : null}
        {item.matchSource ? (
          <div className={[
            'mt-1 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black',
            selected
              ? 'border-white/25 bg-white/10 text-white/90'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
          ].join(' ')} title={item.matchReason || item.matchSource}>
            <FontAwesomeIcon icon="fa-solid fa-ranking-star" />
            <span className="truncate">{item.matchSource}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {showPayNext && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-primary/20 bg-primary/5 text-primary-700 dark:text-primary-300 hover:bg-primary/10',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('payNext'); }}
            title="ثبت اطلاعات قسط بعدی"
          >
            <FontAwesomeIcon icon="fa-solid fa-bolt" className="ml-1" />
            قسط بعدی
          </button>
        )}
        {showReceipt && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('receipt'); }}
            title="رسید"
          >
            <FontAwesomeIcon icon="fa-solid fa-receipt" className="ml-1" />
            رسید
          </button>
        )}
        {showPrint && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('print'); }}
            title="چاپ"
          >
            <FontAwesomeIcon icon="fa-solid fa-print" className="ml-1" />
            چاپ
          </button>
        )}
        <button
          type="button"
          className={[
            'w-9 h-9 rounded-2xl grid place-items-center transition',
            selected
              ? 'text-white/90 hover:bg-white/15'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={(e) => { e.stopPropagation(); onQuick('open'); }}
          aria-label="باز کردن"
          title="باز کردن"
        >
          <FontAwesomeIcon icon="fa-solid fa-arrow-up-from-bracket" />
        </button>
      </div>
    </motion.div>
  );
};
