import React from 'react';

import Button from '../Button';
import AppSearchField from '../ui/AppSearchField';
import { SelectField, Surface } from '@/components/ui';

export type PeopleDirectoryToolbarOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type PeopleDirectoryToolbarFilter = {
  key: string;
  value: string;
  ariaLabel: string;
  iconClassName?: string;
  options: readonly PeopleDirectoryToolbarOption[];
  onValueChange: (value: string) => void;
};

type PeopleDirectoryToolbarNotice = {
  text: React.ReactNode;
  icon?: string;
};

type PeopleDirectoryToolbarProps = {
  ariaLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filters: readonly PeopleDirectoryToolbarFilter[];
  resetDisabled: boolean;
  onReset: () => void;
  notice?: PeopleDirectoryToolbarNotice | null;
};

const PeopleDirectoryToolbar: React.FC<PeopleDirectoryToolbarProps> = ({
  ariaLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
  resetDisabled,
  onReset,
  notice,
}) => (
  <Surface
    surface="glass"
    variant="panel"
    scheme="adaptive"
    wrapContent={false}
    aria-label={ariaLabel}
    data-ui-people-toolbar="shared"
    data-ui-people-filters="true"
    className="min-w-0 rounded-[20px] p-2.5 sm:p-3"
  >
    <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-stretch">
      <div className="min-w-0 lg:min-w-[300px] lg:flex-[1.45]">
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

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-[2.55]">
        {filters.map((filter) => (
          <SelectField
            key={filter.key}
            value={filter.value}
            onValueChange={(value) => filter.onValueChange(value)}
            ariaLabel={filter.ariaLabel}
            size="sm"
            wrapperClassName="min-w-0 flex-1 basis-[148px]"
            iconClassName={filter.iconClassName || 'fa-solid fa-filter'}
            options={filter.options}
          />
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full shrink-0 sm:w-auto sm:min-w-[112px] sm:self-stretch"
          disabled={resetDisabled}
          onClick={onReset}
          leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}
        >
          پاکسازی
        </Button>
      </div>
    </div>

    {notice ? (
      <div className="mt-2.5 flex min-w-0 items-start gap-2 rounded-[14px] border border-amber-200/80 bg-amber-50/75 px-3 py-2 text-[10px] font-bold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100 sm:text-[11px]">
        <i className={`fa-solid ${notice.icon || 'fa-circle-info'} mt-1 shrink-0`} aria-hidden="true" />
        <span className="min-w-0">{notice.text}</span>
      </div>
    ) : null}
  </Surface>
);

export default PeopleDirectoryToolbar;
