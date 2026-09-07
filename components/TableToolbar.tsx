import React from 'react';
import ResponsiveFilterBar from './ui/ResponsiveFilterBar';
import AppSearchField from './ui/AppSearchField';

type Props = {
  title?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  secondaryRow?: React.ReactNode;
  sticky?: boolean;
};

const TableToolbar: React.FC<Props> = ({
  title,
  search,
  onSearchChange,
  searchPlaceholder = 'جستجو…',
  actions,
  secondaryRow,
  sticky,
}) => {
  return (
    <div
      className={[
        'w-full',
        sticky ? 'sticky top-0 z-10 -mx-3 bg-bg/90 px-3 pb-3 pt-2 backdrop-blur md:-mx-6 md:px-6' : '',
      ].join(' ')}
    >
      <div className="ux-toolbar-surface ux-toolbar-surface--premium">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between" dir="rtl">
          <div className="order-2 min-w-0 flex-1 xl:order-2" dir="ltr">
            <ResponsiveFilterBar
              className="pt-0"
              search={onSearchChange ? (
                <AppSearchField
                  value={search ?? ''}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  ariaLabel={searchPlaceholder}
                  size="lg"
                  clearable={Boolean(search)}
                />
              ) : undefined}
              actions={actions ? <div className="ux-toolbar-actions flex flex-wrap items-center justify-start gap-2">{actions}</div> : undefined}
              secondaryRow={secondaryRow}
            />
          </div>

          <div className="order-1 min-w-0 xl:order-1 xl:shrink-0" dir="rtl">
            {title ? (
              <div className="flex items-center justify-end gap-2 text-right">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-list-check" /></span>
                <div className="min-w-0 text-right">
                  <div className="break-words text-sm font-semibold text-slate-900 dark:text-slate-50 md:text-base">{title}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableToolbar;
