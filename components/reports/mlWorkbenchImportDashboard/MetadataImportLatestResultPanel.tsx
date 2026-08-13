import React from 'react';
import type { ImportResultSummary } from './metadataImportDashboardTypes';
import { nf } from './metadataImportDashboardUtils';

type Props = {
  loading: boolean;
  summary?: ImportResultSummary;
};

function MetadataImportLatestResultPanel({ loading, summary }: Props) {
  if (loading || !summary?.forbiddenFieldCount) return null;
  return (
    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      هشدار: {nf.format(summary.forbiddenFieldCount)} فیلد ممنوع در تاریخچه ثبت شده و بهتر است جزئیات آخرین import بررسی شود.
    </p>
  );
}

export default React.memo(MetadataImportLatestResultPanel);
