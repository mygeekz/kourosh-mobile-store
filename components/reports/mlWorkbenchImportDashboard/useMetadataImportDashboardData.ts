import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../utils/apiFetch';
import type {
  AnnotationSavedViewId,
  AnnotationSavedViewsPayload,
  AnnotationSavedViewUsagePayload,
  ImportResultPayload,
  MetadataToShadowReadinessBridgePayload,
  OfflineMetricsComparisonPayload,
  ReviewAnnotationKind,
  ReviewAnnotationsPayload,
  ReviewAnnotationScope,
  ReviewAnnotationSeverity,
  TrendRegressionPayload,
} from './metadataImportDashboardTypes';

export function useMetadataImportDashboardData() {
  const [payload, setPayload] = useState<ImportResultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonPayload, setComparisonPayload] = useState<OfflineMetricsComparisonPayload | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [trendPayload, setTrendPayload] = useState<TrendRegressionPayload | null>(null);
  const [shadowReadinessPayload, setShadowReadinessPayload] = useState<MetadataToShadowReadinessBridgePayload | null>(null);
  const [shadowReadinessLoading, setShadowReadinessLoading] = useState(false);
  const [shadowReadinessError, setShadowReadinessError] = useState<string | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [annotationPayload, setAnnotationPayload] = useState<ReviewAnnotationsPayload | null>(null);
  const [annotationLoading, setAnnotationLoading] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [annotationSaving, setAnnotationSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteScope, setNoteScope] = useState<ReviewAnnotationScope>('metadata_result');
  const [noteKind, setNoteKind] = useState<ReviewAnnotationKind>('operator_note');
  const [noteSeverity, setNoteSeverity] = useState<ReviewAnnotationSeverity>('info');
  const [annotationSearchQuery, setAnnotationSearchQuery] = useState('');
  const [annotationFilterScope, setAnnotationFilterScope] = useState<ReviewAnnotationScope | ''>('');
  const [annotationFilterKind, setAnnotationFilterKind] = useState<ReviewAnnotationKind | ''>('');
  const [annotationFilterSeverity, setAnnotationFilterSeverity] = useState<ReviewAnnotationSeverity | ''>('');
  const [annotationFilterCandidate, setAnnotationFilterCandidate] = useState('');
  const [annotationFilterCreatedFrom, setAnnotationFilterCreatedFrom] = useState('');
  const [annotationFilterCreatedTo, setAnnotationFilterCreatedTo] = useState('');
  const [annotationSearchVersion, setAnnotationSearchVersion] = useState(0);
  const [savedViewsPayload, setSavedViewsPayload] = useState<AnnotationSavedViewsPayload | null>(null);
  const [savedViewsLoading, setSavedViewsLoading] = useState(false);
  const [savedViewsError, setSavedViewsError] = useState<string | null>(null);
  const [activeSavedViewId, setActiveSavedViewId] = useState<AnnotationSavedViewId | ''>('');
  const [savedViewUsagePayload, setSavedViewUsagePayload] = useState<AnnotationSavedViewUsagePayload | null>(null);
  const [savedViewUsageLoading, setSavedViewUsageLoading] = useState(false);
  const [savedViewUsageError, setSavedViewUsageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-result-dashboard?limit=8');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت داشبورد نتیجه import متادیتا');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت داشبورد نتیجه import متادیتا');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadComparison = async () => {
      setComparisonLoading(true);
      setComparisonError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison?limit=8');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت مقایسه metrics آفلاین');
        if (active) setComparisonPayload(json?.data || null);
      } catch (err) {
        if (active) setComparisonError(err instanceof Error ? err.message : 'خطا در دریافت مقایسه metrics آفلاین');
      } finally {
        if (active) setComparisonLoading(false);
      }
    };
    void loadComparison();
    return () => { active = false; };
  }, []);



  useEffect(() => {
    let active = true;
    const loadShadowReadiness = async () => {
      setShadowReadinessLoading(true);
      setShadowReadinessError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/shadow-readiness-bridge?limit=8');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت bridge آمادگی shadow metadata-only');
        if (active) setShadowReadinessPayload(json?.data || null);
      } catch (err) {
        if (active) setShadowReadinessError(err instanceof Error ? err.message : 'خطا در دریافت bridge آمادگی shadow metadata-only');
      } finally {
        if (active) setShadowReadinessLoading(false);
      }
    };
    void loadShadowReadiness();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTrend = async () => {
      setTrendLoading(true);
      setTrendError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/trend-regression-summary?limit=12');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت خلاصه روند و regression');
        if (active) setTrendPayload(json?.data || null);
      } catch (err) {
        if (active) setTrendError(err instanceof Error ? err.message : 'خطا در دریافت خلاصه روند و regression');
      } finally {
        if (active) setTrendLoading(false);
      }
    };
    void loadTrend();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAnnotations = async () => {
      setAnnotationLoading(true);
      setAnnotationError(null);
      try {
        const params = new URLSearchParams({ limit: '5' });
        if (annotationSearchQuery.trim()) params.set('query', annotationSearchQuery.trim());
        if (annotationFilterCandidate.trim()) params.set('candidatePackageId', annotationFilterCandidate.trim());
        if (annotationFilterScope) params.set('annotationScope', annotationFilterScope);
        if (annotationFilterKind) params.set('annotationKind', annotationFilterKind);
        if (annotationFilterSeverity) params.set('severity', annotationFilterSeverity);
        if (annotationFilterCreatedFrom) params.set('createdFrom', annotationFilterCreatedFrom);
        if (annotationFilterCreatedTo) params.set('createdTo', annotationFilterCreatedTo);
        const res = await apiFetch(`/api/brain/ml-workbench-import/metadata-results/review-annotations/search?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در جستجو و فیلتر یادداشت‌های اپراتور');
        if (active) setAnnotationPayload(json?.data || null);
      } catch (err) {
        if (active) setAnnotationError(err instanceof Error ? err.message : 'خطا در جستجو و فیلتر یادداشت‌های اپراتور');
      } finally {
        if (active) setAnnotationLoading(false);
      }
    };
    void loadAnnotations();
    return () => { active = false; };
  }, [annotationSearchVersion]);

  useEffect(() => {
    let active = true;
    const loadSavedViews = async () => {
      setSavedViewsLoading(true);
      setSavedViewsError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت presetهای فیلتر annotation');
        if (active) setSavedViewsPayload(json?.data || null);
      } catch (err) {
        if (active) setSavedViewsError(err instanceof Error ? err.message : 'خطا در دریافت presetهای فیلتر annotation');
      } finally {
        if (active) setSavedViewsLoading(false);
      }
    };
    void loadSavedViews();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSavedViewUsage = async () => {
      setSavedViewUsageLoading(true);
      setSavedViewUsageError(null);
      try {
        const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/usage-summary');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت خلاصه کاربرد presetها');
        if (active) setSavedViewUsagePayload(json?.data || null);
      } catch (err) {
        if (active) setSavedViewUsageError(err instanceof Error ? err.message : 'خطا در دریافت خلاصه کاربرد presetها');
      } finally {
        if (active) setSavedViewUsageLoading(false);
      }
    };
    void loadSavedViewUsage();
    return () => { active = false; };
  }, []);

  const clearAnnotationFilterInputs = () => {
    setAnnotationSearchQuery('');
    setAnnotationFilterCandidate('');
    setAnnotationFilterSeverity('');
    setAnnotationFilterScope('');
    setAnnotationFilterKind('');
    setAnnotationFilterCreatedFrom('');
    setAnnotationFilterCreatedTo('');
  };

  const handleApplyAnnotationSavedView = async (presetId: AnnotationSavedViewId | string) => {
    const cleanPresetId = String(presetId || '').trim() as AnnotationSavedViewId;
    if (!cleanPresetId) return;
    setAnnotationLoading(true);
    setAnnotationError(null);
    setActiveSavedViewId(cleanPresetId);
    try {
      const res = await apiFetch(`/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/${encodeURIComponent(cleanPresetId)}/apply?limit=8`);
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'اعمال preset یادداشت‌های اپراتور ناموفق بود');
      setAnnotationPayload(json?.data || null);
      clearAnnotationFilterInputs();
    } catch (err) {
      setAnnotationError(err instanceof Error ? err.message : 'اعمال preset یادداشت‌های اپراتور ناموفق بود');
    } finally {
      setAnnotationLoading(false);
    }
  };

  const handleSubmitAnnotationFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSavedViewId('');
    setAnnotationSearchVersion((value) => value + 1);
  };

  const handleResetAnnotationFilters = () => {
    clearAnnotationFilterInputs();
    setActiveSavedViewId('');
    setAnnotationSearchVersion((value) => value + 1);
  };

  const handleSaveAnnotation = async (event: React.FormEvent<HTMLFormElement>, noteTargetCandidateId: string) => {
    event.preventDefault();
    const cleanNote = noteText.trim();
    if (!cleanNote || !noteTargetCandidateId) return;
    setAnnotationSaving(true);
    setAnnotationError(null);
    try {
      const res = await apiFetch('/api/brain/ml-workbench-import/metadata-results/review-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidatePackageId: noteTargetCandidateId,
          annotationScope: noteScope,
          annotationKind: noteKind,
          severity: noteSeverity,
          noteText: cleanNote,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'ثبت یادداشت اپراتور ناموفق بود');
      setNoteText('');
      const refresh = await apiFetch('/api/brain/ml-workbench-import/metadata-results/review-annotations/search?limit=5');
      const refreshJson = await refresh.json().catch(() => null);
      if (refresh.ok && refreshJson?.success !== false) setAnnotationPayload(refreshJson?.data || null);
    } catch (err) {
      setAnnotationError(err instanceof Error ? err.message : 'ثبت یادداشت اپراتور ناموفق بود');
    } finally {
      setAnnotationSaving(false);
    }
  };

  return {
    payload,
    loading,
    error,
    comparisonPayload,
    comparisonLoading,
    comparisonError,
    trendPayload,
    trendLoading,
    trendError,
    shadowReadinessPayload,
    shadowReadinessLoading,
    shadowReadinessError,
    annotationPayload,
    annotationLoading,
    annotationError,
    annotationSaving,
    noteText,
    setNoteText,
    noteScope,
    setNoteScope,
    noteKind,
    setNoteKind,
    noteSeverity,
    setNoteSeverity,
    annotationSearchQuery,
    setAnnotationSearchQuery,
    annotationFilterScope,
    setAnnotationFilterScope,
    annotationFilterKind,
    setAnnotationFilterKind,
    annotationFilterSeverity,
    setAnnotationFilterSeverity,
    annotationFilterCandidate,
    setAnnotationFilterCandidate,
    annotationFilterCreatedFrom,
    setAnnotationFilterCreatedFrom,
    annotationFilterCreatedTo,
    setAnnotationFilterCreatedTo,
    savedViewsPayload,
    savedViewsLoading,
    savedViewsError,
    activeSavedViewId,
    savedViewUsagePayload,
    savedViewUsageLoading,
    savedViewUsageError,
    handleApplyAnnotationSavedView,
    handleSubmitAnnotationFilters,
    handleResetAnnotationFilters,
    handleSaveAnnotation,
  };
}
