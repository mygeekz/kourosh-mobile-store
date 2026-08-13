import { useEffect, useState } from 'react';
import { apiFetch } from '../../../utils/apiFetch';
import type { ImportResultDetailPayload } from './metadataImportDashboardTypes';

export function useMetadataImportDetailDrawer() {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<ImportResultDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCandidateId) {
      setDetailPayload(null);
      setDetailError(null);
      return;
    }

    let active = true;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await apiFetch(`/api/brain/ml-workbench-import/metadata-result-dashboard/detail/${encodeURIComponent(selectedCandidateId)}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت جزئیات import متادیتا');
        if (active) setDetailPayload(json?.data || null);
      } catch (err) {
        if (active) setDetailError(err instanceof Error ? err.message : 'خطا در دریافت جزئیات import متادیتا');
      } finally {
        if (active) setDetailLoading(false);
      }
    };

    void loadDetail();
    return () => { active = false; };
  }, [selectedCandidateId]);

  return {
    selectedCandidateId,
    setSelectedCandidateId,
    detail: detailPayload?.detail || null,
    detailLoading,
    detailError,
  };
}
