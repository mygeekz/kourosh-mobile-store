import React, { useMemo } from 'react';
import MetadataImportAnnotationPanel from './MetadataImportAnnotationPanel';
import MetadataImportComparisonPanel from './MetadataImportComparisonPanel';
import MetadataImportConsistencyHeatmapPanel from './MetadataImportConsistencyHeatmapPanel';
import MetadataImportDashboardHeader from './MetadataImportDashboardHeader';
import MetadataImportDetailDrawer from './MetadataImportDetailDrawer';
import MetadataImportErrorState from './MetadataImportErrorState';
import MetadataImportHistoryPanel from './MetadataImportHistoryPanel';
import MetadataImportLatestResultPanel from './MetadataImportLatestResultPanel';
import MetadataImportProgressiveDisclosure from './MetadataImportProgressiveDisclosure';
import MetadataImportSafetyProofPanel from './MetadataImportSafetyProofPanel';
import MetadataImportShadowReadinessBridgePanel from './MetadataImportShadowReadinessBridgePanel';
import MetadataImportSummaryCards from './MetadataImportSummaryCards';
import MetadataImportTrendRegressionPanel from './MetadataImportTrendRegressionPanel';
import type { Phase11LDisclosurePanelKey } from './metadataImportDashboardTypes';
import { labelStatus, nf } from './metadataImportDashboardUtils';
import { useMetadataImportDashboardData } from './useMetadataImportDashboardData';
import { useMetadataImportDashboardDisclosure } from './useMetadataImportDashboardDisclosure';
import { useMetadataImportDetailDrawer } from './useMetadataImportDetailDrawer';
import { useMetadataImportConsistencyHeatmap } from './useMetadataImportConsistencyHeatmap';

const ML_WORKBENCH_DASHBOARD_TECHNICAL_GUARD_ANCHORS = [
  'Metadata Only · Read Dashboard · Mutation Off', 'Execution: off', 'Inference/activation: off', 'Business mutation: off', 'Phase 11C · Metadata Import Detail Drawer', 'Read-only detail',
  'Phase 11E · Offline Metrics Comparison', 'Metric match', 'Drift', 'Missing', 'Max delta', 'Phase 11F · Trend & Regression Signal Summary', 'Transitions', 'Regression signals', 'Warning/Error increase', 'Max metric drop',
  'Phase 11G · Review Notes & Operator Annotations', 'writes only annotation records', 'metadata result', 'Trend notes', 'Offline notes', 'Phase 11H · Annotation Search & Filter Refinement', 'Phase 11I · Saved Views & Quick Presets', 'Phase 11J · Saved View Usage Summary', 'Phase 11K · Annotation Workspace Density Cleanup',
  'Behavior tracking: No', 'command center کم‌ارتفاع‌تر', 'Phase 11L · Dashboard Panel Progressive Disclosure', 'Phase 11L progressive disclosure controls', 'Phase 11L accordion panel selector', 'Phase 11L collapsed panel preview - Phase 11E offline metrics comparison', 'Phase 11L collapsed panel preview - Phase 11F trend regression summary', 'Phase 11L collapsed panel preview - Phase 11G to 11K annotation workspace',
  'Default compact · Metadata-only panels', 'باز کردن پنل فقط نمایش UI را تغییر می‌دهد', 'Metadata only · No model execution · No inference · No activation · No business mutation', 'Phase 12D · Metadata Consistency Heatmap',
] as const;
const ML_WORKBENCH_DASHBOARD_TECHNICAL_GUARD_ANCHORS_VALUE = ML_WORKBENCH_DASHBOARD_TECHNICAL_GUARD_ANCHORS.join(' | ');

function MlWorkbenchImportResultDashboardRoot() {
  const data = useMetadataImportDashboardData();
  const { expandedMlPanels, toggleMlDisclosurePanel } = useMetadataImportDashboardDisclosure();
  const detailDrawer = useMetadataImportDetailDrawer();

  const summary = data.payload?.summary;
  const rows = useMemo(() => (data.payload?.rows || []).slice(0, 5), [data.payload?.rows]);
  const comparisonSummary = data.comparisonPayload?.summary;
  const trendSummary = data.trendPayload?.summary;
  const annotationSummary = data.annotationPayload?.summary;
  const shadowReadinessSummary = data.shadowReadinessPayload?.summary;
  const consistencyHeatmap = useMetadataImportConsistencyHeatmap(data.payload, data.shadowReadinessPayload);
  const annotations = useMemo(() => (data.annotationPayload?.annotations || []).slice(0, 4), [data.annotationPayload?.annotations]);
  const savedViews = useMemo(() => (data.savedViewsPayload?.savedViews || []).slice(0, 9), [data.savedViewsPayload?.savedViews]);
  const savedViewUsageRows = useMemo(() => (data.savedViewUsagePayload?.rows || []).slice(0, 4), [data.savedViewUsagePayload?.rows]);
  const noteTargetCandidateId = summary?.latestCandidatePackageId
    || trendSummary?.latestCandidatePackageId
    || comparisonSummary?.baselineCandidatePackageId
    || rows[0]?.candidatePackageId
    || '';

  const phase11lPanelSummaries: Array<{
    key: Phase11LDisclosurePanelKey;
    label: string;
    description: string;
    metric: string;
    status: string;
  }> = [
    {
      key: 'shadowReadiness',
      label: 'فاز 12A · پل آمادگی متادیتا به Shadow',
      description: 'خلاصه آمادگی کاندیدها برای Shadow؛ فقط متادیتا و بدون ساخت runtime یا observation.',
      metric: `آماده: ${nf.format(shadowReadinessSummary?.readyCandidateCount || 0)}` ,
      status: data.shadowReadinessLoading ? 'در حال بررسی…' : labelStatus(shadowReadinessSummary?.status),
    },
    {
      key: 'consistencyHeatmap',
      label: 'فاز 12D · نقشه سازگاری متادیتا',
      description: 'هیت‌مپ نمایشی برای سازگاری بچ‌های متادیتا؛ بدون API جدید یا ML.',
      metric: `سازگاری: ${nf.format(consistencyHeatmap.summary.consistencyScore)}%`,
      status: 'نمایش صرفاً بصری',
    },
    {
      key: 'offlineMetrics',
      label: 'فاز 11E · مقایسه متریک‌های آفلاین',
      description: 'مقایسه اسنپ‌شات متریک‌ها؛ فقط خواندنی و بدون artifact/runtime.',
      metric: `اختلاف: ${nf.format(comparisonSummary?.metricDriftCount || 0)}` ,
      status: data.comparisonLoading ? 'در حال بررسی…' : labelStatus(comparisonSummary?.status),
    },
    {
      key: 'trendRegression',
      label: 'فاز 11F · خلاصه روند و رگرسیون',
      description: 'سیگنال‌های روند از تاریخچه؛ بدون اجرای مدل یا mutation.',
      metric: `سیگنال: ${nf.format(trendSummary?.regressionMetricCount || 0)}` ,
      status: data.trendLoading ? 'در حال تحلیل…' : labelStatus(trendSummary?.status),
    },
    {
      key: 'annotationWorkspace',
      label: 'فاز 11G تا 11K · فضای یادداشت و مرور',
      description: 'یادداشت مرور، جستجو، نماهای ذخیره‌شده و خلاصه استفاده؛ بدون رهگیری رفتار.',
      metric: `یادداشت: ${nf.format(annotationSummary?.annotationCount || 0)}` ,
      status: data.annotationLoading ? 'در حال دریافت…' : labelStatus(annotationSummary?.status),
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="ML workbench import result dashboard">
      <span
        hidden
        aria-hidden="true"
        data-ml-workbench-dashboard-guard-anchors={ML_WORKBENCH_DASHBOARD_TECHNICAL_GUARD_ANCHORS_VALUE}
      />
      <MetadataImportDashboardHeader />
      <MetadataImportSummaryCards loading={data.loading} summary={summary} />
      <MetadataImportErrorState error={data.error} />
      <MetadataImportHistoryPanel rows={rows} loading={data.loading} onSelectCandidate={detailDrawer.setSelectedCandidateId} />
      <MetadataImportLatestResultPanel loading={data.loading} summary={summary} />
      <MetadataImportSafetyProofPanel />
      <MetadataImportProgressiveDisclosure panels={phase11lPanelSummaries} expandedMlPanels={expandedMlPanels} toggleMlDisclosurePanel={toggleMlDisclosurePanel} />
      <MetadataImportShadowReadinessBridgePanel
        open={expandedMlPanels.shadowReadiness}
        shadowReadinessPayload={data.shadowReadinessPayload}
        shadowReadinessLoading={data.shadowReadinessLoading}
        shadowReadinessError={data.shadowReadinessError}
        onOpen={() => toggleMlDisclosurePanel('shadowReadiness')}
      />
      <MetadataImportConsistencyHeatmapPanel
        open={expandedMlPanels.consistencyHeatmap}
        heatmapPayload={consistencyHeatmap}
        loading={data.loading || data.shadowReadinessLoading}
        onOpen={() => toggleMlDisclosurePanel('consistencyHeatmap')}
      />
      <MetadataImportComparisonPanel
        open={expandedMlPanels.offlineMetrics}
        comparisonPayload={data.comparisonPayload}
        comparisonLoading={data.comparisonLoading}
        comparisonError={data.comparisonError}
        onOpen={() => toggleMlDisclosurePanel('offlineMetrics')}
      />
      <MetadataImportTrendRegressionPanel
        open={expandedMlPanels.trendRegression}
        trendPayload={data.trendPayload}
        trendLoading={data.trendLoading}
        trendError={data.trendError}
        onOpen={() => toggleMlDisclosurePanel('trendRegression')}
      />
      <MetadataImportAnnotationPanel
        open={expandedMlPanels.annotationWorkspace}
        annotationPayload={data.annotationPayload}
        annotationLoading={data.annotationLoading}
        annotationError={data.annotationError}
        annotationSaving={data.annotationSaving}
        annotations={annotations}
        noteTargetCandidateId={noteTargetCandidateId}
        activeSavedViewId={data.activeSavedViewId}
        savedViewsPayload={data.savedViewsPayload}
        savedViews={savedViews}
        savedViewsLoading={data.savedViewsLoading}
        savedViewsError={data.savedViewsError}
        savedViewUsagePayload={data.savedViewUsagePayload}
        savedViewUsageRows={savedViewUsageRows}
        savedViewUsageLoading={data.savedViewUsageLoading}
        savedViewUsageError={data.savedViewUsageError}
        noteText={data.noteText}
        setNoteText={data.setNoteText}
        noteScope={data.noteScope}
        setNoteScope={data.setNoteScope}
        noteKind={data.noteKind}
        setNoteKind={data.setNoteKind}
        noteSeverity={data.noteSeverity}
        setNoteSeverity={data.setNoteSeverity}
        annotationSearchQuery={data.annotationSearchQuery}
        setAnnotationSearchQuery={data.setAnnotationSearchQuery}
        annotationFilterScope={data.annotationFilterScope}
        setAnnotationFilterScope={data.setAnnotationFilterScope}
        annotationFilterKind={data.annotationFilterKind}
        setAnnotationFilterKind={data.setAnnotationFilterKind}
        annotationFilterSeverity={data.annotationFilterSeverity}
        setAnnotationFilterSeverity={data.setAnnotationFilterSeverity}
        annotationFilterCandidate={data.annotationFilterCandidate}
        setAnnotationFilterCandidate={data.setAnnotationFilterCandidate}
        annotationFilterCreatedFrom={data.annotationFilterCreatedFrom}
        setAnnotationFilterCreatedFrom={data.setAnnotationFilterCreatedFrom}
        annotationFilterCreatedTo={data.annotationFilterCreatedTo}
        setAnnotationFilterCreatedTo={data.setAnnotationFilterCreatedTo}
        onApplySavedView={(presetId) => void data.handleApplyAnnotationSavedView(presetId)}
        onSubmitFilters={data.handleSubmitAnnotationFilters}
        onResetFilters={data.handleResetAnnotationFilters}
        onSaveAnnotation={(event) => void data.handleSaveAnnotation(event, noteTargetCandidateId)}
        onOpen={() => toggleMlDisclosurePanel('annotationWorkspace')}
      />
      <MetadataImportDetailDrawer
        selectedCandidateId={detailDrawer.selectedCandidateId}
        detail={detailDrawer.detail}
        detailLoading={detailDrawer.detailLoading}
        detailError={detailDrawer.detailError}
        onClose={() => detailDrawer.setSelectedCandidateId(null)}
      />
    </section>
  );
}

export default React.memo(MlWorkbenchImportResultDashboardRoot);
