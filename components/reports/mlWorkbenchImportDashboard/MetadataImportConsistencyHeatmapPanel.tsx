import React from 'react';
import type { MetadataConsistencyHeatmapPayload } from './metadataImportConsistencyHeatmapTypes';
import { getMetadataConsistencyCellClass, getMetadataConsistencySeverityLabel } from './metadataImportConsistencyHeatmapUtils';
import { nf } from './metadataImportDashboardUtils';
const METADATA_CONSISTENCY_HEATMAP_TECHNICAL_GUARD_ANCHORS = [
  'Metadata Consistency Heatmap',
  'UI-only visualization',
  'فقط مشاهده · بدون تغییر خودکار اطلاعات فروشگاه',
] as const;

const METADATA_CONSISTENCY_HEATMAP_TECHNICAL_GUARD_ANCHORS_VALUE =
  METADATA_CONSISTENCY_HEATMAP_TECHNICAL_GUARD_ANCHORS.join(' | ');


type Props = {
  open: boolean;
  heatmapPayload: MetadataConsistencyHeatmapPayload;
  loading: boolean;
  onOpen: () => void;
};

function MetadataImportConsistencyHeatmapPanel({ open, heatmapPayload, loading, onOpen }: Props) {
  const summary = heatmapPayload.summary;
  const batches = heatmapPayload.batches.slice(0, 6);
  const fieldKeys = Object.keys(heatmapPayload.fieldLabels) as Array<keyof typeof heatmapPayload.fieldLabels>;

  if (!open) {
    return (
      <button
        type="button"
        className="mlwb-v212-preview mt-4"
        aria-label="پیش‌نمایش نقشه سازگاری داده‌ها"
        aria-expanded={false}
        data-ml-consistency-heatmap-guard-anchors={METADATA_CONSISTENCY_HEATMAP_TECHNICAL_GUARD_ANCHORS_VALUE}
        onClick={onOpen}
      >
        <span className="mlwb-v212-preview__eyebrow text-cyan-500">سازگاری داده‌های تحلیلی</span>
        <strong className="mlwb-v212-preview__title">نقشه سازگاری داده‌ها</strong>
        <span className="mlwb-v212-preview__desc">با باز کردن این بخش، میزان سازگاری مجموعه‌های اطلاعاتی به‌صورت بصری نمایش داده می‌شود.</span>
        <span className="mlwb-v212-preview__meta">
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-table-cells-large" /> فقط نمایش بصری</em>
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-shield-halved" /> فقط مشاهده</em>
        </span>
      </button>
    );
  }

  return (
    <div
      className="mlwb-v212-shell mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
      aria-label="نقشه سازگاری داده‌ها"
      data-ml-consistency-heatmap-guard-anchors={METADATA_CONSISTENCY_HEATMAP_TECHNICAL_GUARD_ANCHORS_VALUE}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] text-cyan-500">نقشه سازگاری داده‌ها</span>
          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">بررسی سازگاری بین مجموعه‌های اطلاعاتی</h4>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">این نقشه بر اساس اطلاعات موجود، شباهت و اختلاف بین مجموعه‌های داده را برای بررسی سریع نمایش می‌دهد.</p>
        </div>
        <div className="mlwb-v212-kicker">{loading ? 'در حال آماده‌سازی…' : `سازگاری: ${nf.format(summary.consistencyScore)}%`}</div>
      </div>

      <div className="mlwb-v212-mini-grid mt-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">تعداد بچ‌ها</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary.batchCount)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">تعداد فیلدها</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary.fieldCount)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">ناسازگار</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary.inconsistentCellCount)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">ناموجود</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary.missingCellCount)}</strong></article>
      </div>

      {batches.length ? (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60" aria-label="شبکه سازگاری داده‌ها">
          <div className="min-w-[780px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: `180px repeat(${batches.length}, minmax(92px, 1fr))` }}>
              <div className="px-2 py-1 text-[11px] font-black tracking-[0.12em] text-slate-400">فیلد</div>
              {batches.map((batch) => (
                <div key={`batch-header-${batch}`} className="truncate px-2 py-1 text-[11px] font-black text-slate-500 dark:text-slate-300" title={batch}>{batch}</div>
              ))}
              {fieldKeys.map((fieldKey) => (
                <React.Fragment key={`field-row-${fieldKey}`}>
                  <div className="rounded-xl bg-slate-50 px-2 py-2 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{heatmapPayload.fieldLabels[fieldKey]}</div>
                  {batches.map((batch) => {
                    const cell = heatmapPayload.cells.find((item) => item.candidatePackageId === batch && item.fieldKey === fieldKey);
                    const severity = cell?.severity || 'missing';
                    return (
                      <div
                        key={`${batch}-${fieldKey}`}
                        className={`min-h-[42px] rounded-xl border px-2 py-1.5 text-[11px] font-black ${getMetadataConsistencyCellClass(severity)}`}
                        title={`${heatmapPayload.fieldLabels[fieldKey]} · ${batch} · ${cell?.normalizedValue || '—'}`}
                      >
                        <span className="block truncate">{getMetadataConsistencySeverityLabel(severity)}</span>
                        <small className="mt-0.5 block truncate font-bold opacity-75">{cell?.normalizedValue || '—'}</small>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : !loading ? (
        <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">هنوز تعداد کافی از بچ‌ها برای رسم هیت‌مپ سازگاری وجود ندارد.</p>
      ) : null}

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5" aria-label="گروه‌های اطلاعاتی">
        {heatmapPayload.clusters.map((cluster) => (
          <article key={cluster.id} className={`rounded-2xl border p-3 text-xs ${getMetadataConsistencyCellClass(cluster.severity)}`}>
            <strong className="block font-black">{cluster.label}</strong>
            <p className="mt-1 font-bold opacity-80">{cluster.description}</p>
            <p className="mt-2 font-black">موجود: {nf.format((cluster.presentRatio * 100))}% · پایدار: {nf.format((cluster.stabilityRatio * 100))}%</p>
          </article>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
        فقط مشاهده · نمایش بصری سازگاری اطلاعات · بدون تغییر خودکار اطلاعات فروشگاه
      </div>
    </div>
  );
}

export default React.memo(MetadataImportConsistencyHeatmapPanel);
