import { useEffect, useRef } from 'react';
import moment from 'jalali-moment';
import { exportToExcel } from '../../../utils/exporters';
import type { SmartInsightLike, SmartInsightTypeLabels, SeverityMetaMap } from '../types/smartInsightContracts';

type UseSmartInsightExportArgs = {
  filtered: SmartInsightLike[];
  typeLabels: SmartInsightTypeLabels;
  severityMeta: SeverityMetaMap;
  registerReportExports: (exports: { excel?: () => void }) => void;
};

export default function useSmartInsightExport({
  filtered,
  typeLabels,
  severityMeta,
  registerReportExports,
}: UseSmartInsightExportArgs) {
  const exportRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    exportRef.current = () => {
      const rows = filtered.map((item) => ({
        category: item.category,
        type: typeLabels[item.type] || item.type,
        severity: severityMeta[item.severity || 'medium']?.label || item.severity,
        title: item.title,
        summary: item.summary,
        score: item.score,
        confidence: `${Math.round(item.confidence || 0)}٪`,
        reasons: (item.reasons || []).join(' | '),
        metrics: (item.metrics || []).map((metric) => `${metric.label}: ${metric.value}`).join(' | '),
        actions: (item.actions || []).map((action) => action.label).join(' | '),
      }));

      exportToExcel(`smart-insight-center-V9-${moment().format('YYYYMMDD-HHmm')}`, rows, [
        { header: 'دسته', key: 'category' },
        { header: 'نوع Insight', key: 'type' },
        { header: 'اهمیت', key: 'severity' },
        { header: 'عنوان', key: 'title' },
        { header: 'خلاصه', key: 'summary' },
        { header: 'امتیاز', key: 'score' },
        { header: 'اعتماد', key: 'confidence' },
        { header: 'دلایل', key: 'reasons' },
        { header: 'شاخص‌ها', key: 'metrics' },
        { header: 'اقدام پیشنهادی', key: 'actions' },
      ], 'Smart Insights');
    };
  }, [filtered, severityMeta, typeLabels]);

  useEffect(() => {
    registerReportExports({ excel: () => exportRef.current?.() });
    return () => registerReportExports({});
  }, [registerReportExports]);
}
