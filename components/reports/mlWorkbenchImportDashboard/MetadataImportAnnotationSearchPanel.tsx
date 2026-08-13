import React from 'react';
import { SelectField, TextField } from '@/components/ui';
import type { ReviewAnnotationKind, ReviewAnnotationScope, ReviewAnnotationSeverity } from './metadataImportDashboardTypes';
import { nf } from './metadataImportDashboardUtils';

type Props = {
  annotationSearchQuery: string;
  setAnnotationSearchQuery: (value: string) => void;
  annotationFilterCandidate: string;
  setAnnotationFilterCandidate: (value: string) => void;
  annotationFilterSeverity: ReviewAnnotationSeverity | '';
  setAnnotationFilterSeverity: (value: ReviewAnnotationSeverity | '') => void;
  annotationFilterScope: ReviewAnnotationScope | '';
  setAnnotationFilterScope: (value: ReviewAnnotationScope | '') => void;
  annotationFilterKind: ReviewAnnotationKind | '';
  setAnnotationFilterKind: (value: ReviewAnnotationKind | '') => void;
  annotationFilterCreatedFrom: string;
  setAnnotationFilterCreatedFrom: (value: string) => void;
  annotationFilterCreatedTo: string;
  setAnnotationFilterCreatedTo: (value: string) => void;
  annotationFilterCount: number;
  annotationResultCount: number;
  activeSavedViewId: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

function MetadataImportAnnotationSearchPanel(props: Props) {
  return (
    <form className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60" onSubmit={props.onSubmit}>
      <div className="flex flex-col gap-1">
        <strong className="text-xs font-black text-slate-800 dark:text-white">Phase 11H · Annotation Search & Filter Refinement</strong>
        <span className="text-[11px] font-bold text-slate-500">Read-only metadata search by candidate, note text, signal key, scope, kind, severity and created-at bounds.</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <TextField controlOnly unstyled className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.annotationSearchQuery} onChange={(event) => props.setAnnotationSearchQuery(event.target.value.slice(0, 180))} placeholder="Search note / signal / candidate" />
        <TextField controlOnly unstyled className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.annotationFilterCandidate} onChange={(event) => props.setAnnotationFilterCandidate(event.target.value.slice(0, 160))} placeholder="Candidate package ID" />
        <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.annotationFilterSeverity} onChange={(event) => props.setAnnotationFilterSeverity(event.target.value as ReviewAnnotationSeverity | '')}>
          <option value="">All severities</option><option value="info">Info</option><option value="watch">Watch</option><option value="warning">Warning</option><option value="resolved">Resolved</option>
        </SelectField>
        <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.annotationFilterScope} onChange={(event) => props.setAnnotationFilterScope(event.target.value as ReviewAnnotationScope | '')}>
          <option value="">All scopes</option><option value="metadata_result">Metadata result</option><option value="trend_signal">Trend signal</option><option value="offline_metrics_comparison">Offline metrics</option><option value="dashboard">Dashboard</option>
        </SelectField>
        <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.annotationFilterKind} onChange={(event) => props.setAnnotationFilterKind(event.target.value as ReviewAnnotationKind | '')}>
          <option value="">All kinds</option><option value="operator_note">Operator note</option><option value="review_note">Review note</option><option value="risk_note">Risk note</option><option value="follow_up">Follow-up</option><option value="dismissed_signal">Dismissed signal</option>
        </SelectField>
        <div className="grid grid-cols-2 gap-2">
          <TextField controlOnly unstyled className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" type="date" value={props.annotationFilterCreatedFrom} onChange={(event) => props.setAnnotationFilterCreatedFrom(event.target.value)} aria-label="Created from" />
          <TextField controlOnly unstyled className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" type="date" value={props.annotationFilterCreatedTo} onChange={(event) => props.setAnnotationFilterCreatedTo(event.target.value)} aria-label="Created to" />
        </div>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span className="text-xs font-bold text-slate-500">Filters: {nf.format(props.annotationFilterCount)} · Results: {nf.format(props.annotationResultCount)} · {props.activeSavedViewId ? `Preset: ${props.activeSavedViewId}` : 'Read-only search'}</span>
        <div className="flex gap-2">
          <button type="button" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-200" onClick={props.onReset}>پاکسازی فیلتر</button>
          <button type="submit" className="rounded-2xl border border-sky-200 px-3 py-2 text-xs font-black text-sky-700 dark:border-sky-900/60 dark:text-sky-200"><i className="fa-solid fa-filter ml-1" /> اعمال فیلتر</button>
        </div>
      </div>
    </form>
  );
}

export default React.memo(MetadataImportAnnotationSearchPanel);
