import React from 'react';

import Button from '../Button';
import { AppSearchField } from '../ui';
import ReportControlDock from './ReportControlDock';
import ReportFilterField from './ReportFilterField';

type Props = {
  search: string;
  onSearch: (value: string) => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  right?: React.ReactNode;
  preview?: string;
  searchLabel?: string;
  secondaryRow?: React.ReactNode;
};

/**
 * Compatibility adapter for older report pages.
 * It now delegates layout, fields and actions to the shared report contracts.
 */
export default function ModernTableTools({
  search,
  onSearch,
  onExportCsv,
  onPrint,
  right,
  preview,
  searchLabel = 'جستجو و فیلتر',
  secondaryRow,
}: Props) {
  const actions = onExportCsv || onPrint ? (
    <>
      {onExportCsv ? (
        <Button
          type="button"
          onClick={onExportCsv}
          variant="secondary"
          size="sm"
          leftIcon={<i className="fa-solid fa-file-csv" />}
        >
          خروجی CSV
        </Button>
      ) : null}
      {onPrint ? (
        <Button
          type="button"
          onClick={onPrint}
          variant="secondary"
          size="sm"
          leftIcon={<i className="fa-solid fa-print" />}
        >
          چاپ
        </Button>
      ) : null}
    </>
  ) : undefined;

  return (
    <ReportControlDock
      embedded
      ariaLabel={searchLabel}
      search={(
        <ReportFilterField
          label={searchLabel}
          icon={<i className="fa-solid fa-magnifying-glass" />}
          grow
          minWidthClassName="basis-full min-w-0"
        >
          <AppSearchField
            value={search}
            onChange={onSearch}
            placeholder={preview ?? 'جستجو...'}
            ariaLabel="جستجو در گزارش"
            size="md"
          />
        </ReportFilterField>
      )}
      filters={right}
      actions={actions}
      secondaryRow={secondaryRow}
    />
  );
}
