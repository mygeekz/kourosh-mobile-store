import React from 'react';

import Button from '../Button';
import AppSearchField from './AppSearchField';
import { ManagementFilterSurface } from './ManagementDirectory';
import SelectField from './SelectField';

export type ManagementDirectoryToolbarOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type ManagementDirectoryToolbarFilter = {
  key: string;
  value: string;
  ariaLabel: string;
  iconClassName?: string;
  options: readonly ManagementDirectoryToolbarOption[];
  onValueChange: (value: string) => void;
};

export type ManagementDirectoryToolbarNotice = {
  text: React.ReactNode;
  icon?: string;
};

export type ManagementDirectoryToolbarProps = {
  ariaLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filters: readonly ManagementDirectoryToolbarFilter[];
  resetDisabled: boolean;
  onReset: () => void;
  resetLabel?: string;
  notice?: ManagementDirectoryToolbarNotice | null;
  columns?: 2 | 3 | 4 | 5;
};

const getGridClass = (columns: 2 | 3 | 4 | 5) => {
  if (columns === 2) return 'lg:grid-cols-2';
  if (columns === 3) return 'lg:grid-cols-3';
  if (columns === 4) return 'xl:grid-cols-4';
  return 'lg:grid-cols-3 xl:grid-cols-5';
};

const ManagementDirectoryToolbar: React.FC<ManagementDirectoryToolbarProps> = ({
  ariaLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
  resetDisabled,
  onReset,
  resetLabel = 'پاکسازی فیلترها',
  notice,
  columns = 5,
}) => (
  <ManagementFilterSurface
    aria-label={ariaLabel}
    data-ui-management-directory-toolbar="shared"
    className="min-w-0"
  >
    <div className="grid min-w-0 gap-2.5">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <AppSearchField
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            ariaLabel={searchAriaLabel}
            size="sm"
            clearable
            className="min-w-0"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ux-filter-button w-full shrink-0 sm:w-auto sm:min-w-32"
          disabled={resetDisabled}
          onClick={onReset}
          leftIcon={<i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />}
        >
          {resetLabel}
        </Button>
      </div>

      {filters.length ? (
        <div className={`grid min-w-0 gap-2 sm:grid-cols-2 ${getGridClass(columns)}`}>
          {filters.map((filter) => (
            <SelectField
              key={filter.key}
              value={filter.value}
              onValueChange={(value) => filter.onValueChange(value)}
              ariaLabel={filter.ariaLabel}
              size="sm"
              wrapperClassName="min-w-0 w-full"
              icon={false}
              showChevron={false}
              options={filter.options}
            />
          ))}
        </div>
      ) : null}
    </div>

    {notice ? (
      <div className="mt-2.5 flex min-w-0 items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/75 px-3 py-2 text-[10px] font-bold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100 sm:text-[11px]">
        <i className={`fa-solid ${notice.icon || 'fa-circle-info'} mt-1 shrink-0`} aria-hidden="true" />
        <span className="min-w-0">{notice.text}</span>
      </div>
    ) : null}
  </ManagementFilterSurface>
);

export default ManagementDirectoryToolbar;
