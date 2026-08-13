import React from 'react';
import { DataTableShell } from '@/components/ui';
import type { ImportResultRow } from './metadataImportDashboardTypes';
import { formatMetric, labelStatus, nf } from './metadataImportDashboardUtils';
import MetadataImportEmptyState from './MetadataImportEmptyState';

type Props = {
  rows: ImportResultRow[];
  loading: boolean;
  onSelectCandidate: (candidateId: string) => void;
};

function MetadataImportHistoryPanel({ rows, loading, onSelectCandidate }: Props) {
  if (!rows.length) return <MetadataImportEmptyState loading={loading} />;
  return (
    <DataTableShell
      className="mt-4"
      aria-label="Metadata import history"
      data-ui-ml-table="metadata-import-history"
    >
      <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2 font-black">رتبه</th>
            <th className="px-3 py-2 font-black">Candidate</th>
            <th className="px-3 py-2 font-black">Version</th>
            <th className="px-3 py-2 font-black">Import</th>
            <th className="px-3 py-2 font-black">Safety</th>
            <th className="px-3 py-2 font-black">Warn/Error</th>
            <th className="px-3 py-2 font-black">Score</th>
            <th className="px-3 py-2 font-black">جزئیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/50">
          {rows.map((row, index) => {
            const candidateId = row.candidatePackageId || '';
            return (
              <tr key={`${row.id || row.candidatePackageId || index}-${row.modelVersion || 'v'}`}>
                <td className="px-3 py-2 font-black text-slate-700 dark:text-slate-200">{nf.format(row.rank || index + 1)}</td>
                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{row.candidatePackageId || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{row.modelVersion || row.modelKey || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{labelStatus(row.metadataImportStatus || row.validationStatus)}</td>
                <td className="px-3 py-2 text-slate-500">{labelStatus(row.safetyPolicyStatus)}</td>
                <td className="px-3 py-2 text-slate-500">{nf.format(row.warningCount || 0)} / {nf.format(row.errorCount || 0)}</td>
                <td className="px-3 py-2 font-black text-slate-700 dark:text-slate-200">{formatMetric(row.comparisonScore, row.comparisonBasis)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 dark:border-slate-700 dark:text-slate-200"
                    disabled={!candidateId}
                    onClick={() => onSelectCandidate(candidateId)}
                  >
                    <i className="fa-solid fa-circle-info ml-1" /> مشاهده
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
  );
}

export default React.memo(MetadataImportHistoryPanel);
