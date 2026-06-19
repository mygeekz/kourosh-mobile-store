import React, { useMemo } from 'react';
import Button from '../Button';
import AppSearchField from '../ui/AppSearchField';

type Props = {
  search: string;
  onSearch: (v: string) => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  right?: React.ReactNode;
  preview?: string;
};

export default function ModernTableTools({ search, onSearch, onExportCsv, onPrint, right, preview }: Props) {
  const hasActions = useMemo(() => !!onExportCsv || !!onPrint, [onExportCsv, onPrint]);

  return (
    <div className="ux-toolbar-surface ux-toolbar-surface--premium ux-report-tools" data-ui-report-toolbar="true">
      <div className="ux-report-tools__row" data-ui-report-toolbar-row="true">
        <div className="ux-report-tools__search-wrap" data-ui-report-toolbar-search="true">
          <div className="ux-report-tools__label">
            <span className="ux-toolbar-dot" />
            <span>جستجو و فیلتر</span>
          </div>
          <AppSearchField
            value={search}
            onChange={onSearch}
            placeholder={preview ?? 'جستجو...'}
            ariaLabel="جستجو در گزارش"
            size="sm"
          />
        </div>

        <div className="ux-report-tools__actions" data-ui-report-toolbar-actions="true">
          {right}
          {hasActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {onExportCsv ? (
                <Button onClick={onExportCsv} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-file-csv" />} className="rounded-2xl">
                  خروجی CSV
                </Button>
              ) : null}
              {onPrint ? (
                <Button onClick={onPrint} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-print" />} className="rounded-2xl">
                  چاپ
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
