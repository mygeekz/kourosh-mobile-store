import { formatExactNumberText } from '../../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import { useMemo } from 'react';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';
import { MlOperatorStatusChip } from './MlOperatorCards';
import { MlOperatorCopyButton } from './MlOperatorCopyButton';

const toFaNumber = (value: number): string => formatExactNumberText(value);

const routeLabels: Record<MlOperatorOverviewRouteKey, string> = {
  comparisonSummaries: 'خلاصه مقایسه‌ها',
  importReceipts: 'رسیدهای ورود امن',
  receiptExports: 'خروجی رسیدها',
  exportPackages: 'بسته‌های خروجی',
  packageSnapshots: 'اسنپ‌شات‌های بسته',
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const firstNumber = (...values: unknown[]): number => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (Array.isArray(value)) return value.length;
  }
  return 0;
};

const safeItemId = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.id, item.summaryId, item.summaryKey, item.receiptId, item.exportId, item.packageId, item.snapshotId, item.correlationId, item.requestId);
};

const safeItemHash = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.checksum, item.contentHash, item.receiptHash, item.importPayloadHash, item.exportPayloadHash, item.packageHash, item.snapshotHash, item.hash);
};

const itemStatus = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.status, item.state, item.comparisonStatus, item.exportStatus, item.packageStatus, item.snapshotStatus);
};

const warningCount = (item: unknown): number => {
  if (!isRecord(item)) return 0;
  return firstNumber(item.warningCount, item.warnings, item.warningList, item.validationWarnings);
};

const errorCount = (item: unknown): number => {
  if (!isRecord(item)) return 0;
  return firstNumber(item.errorCount, item.errors, item.errorList, item.validationErrors);
};

const statusNeedsAttention = (status: string | null): boolean => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return !['ready', 'ok', 'success', 'completed', 'complete', 'valid', 'passed', 'exported', 'created', 'active'].some((safeStatus) => normalized.includes(safeStatus));
};

type AttentionRowKind = 'source' | 'item';

type AttentionRow = {
  key: string;
  kind: AttentionRowKind;
  source: MlOperatorRouteResult;
  label: string;
  title: string;
  reason: string;
  priority: number;
  priorityLabel: string;
  safeId: string | null;
  safeHash: string | null;
  item: unknown;
  itemIndex: number;
  warnings: number;
  errors: number;
  status: string | null;
};

type QueueSummary = {
  totalRows: number;
  sourceRows: number;
  itemRows: number;
  criticalRows: number;
  highRows: number;
  mediumRows: number;
};

const priorityLabel = (priority: number): string => {
  if (priority >= 90) return 'فوری';
  if (priority >= 72) return 'بالا';
  if (priority >= 50) return 'متوسط';
  return 'کم';
};

const sourcePriority = (source: MlOperatorRouteResult): number => {
  if (source.state === 'error') return 96;
  if (source.state === 'unauthorized') return 92;
  if (source.state === 'unavailable') return 86;
  if (source.state === 'empty') return 58;
  if (!source.latestChecksum) return 52;
  return 0;
};

const sourceReason = (source: MlOperatorRouteResult): string => {
  if (source.state === 'error') return source.message || 'پاسخ منبع با خطا همراه است و باید بررسی شود.';
  if (source.state === 'unauthorized') return 'دسترسی خواندنی این منبع نیازمند بررسی مدیریتی است.';
  if (source.state === 'unavailable') return 'منبع خواندنی در حال حاضر در دسترس نیست.';
  if (source.state === 'empty') return 'پاسخ معتبر است اما رکوردی برای بازرسی برنگشته است.';
  if (!source.latestChecksum) return 'منبع داده دارد اما هش امن آخرین رکورد در خلاصه موجود نیست.';
  return 'بدون مورد برجسته';
};

const itemPriority = (item: unknown): number => {
  const errors = errorCount(item);
  const warnings = warningCount(item);
  const status = itemStatus(item);
  if (errors > 0) return 88;
  if (warnings > 0) return 72;
  if (statusNeedsAttention(status)) return 64;
  if (!safeItemHash(item)) return 44;
  return 0;
};

const itemReason = (item: unknown): string => {
  const errors = errorCount(item);
  const warnings = warningCount(item);
  const status = itemStatus(item);
  if (errors > 0) return `${toFaNumber(errors)} خطا در فراداده این ردیف گزارش شده است.`;
  if (warnings > 0) return `${toFaNumber(warnings)} هشدار برای بررسی مدیریتی وجود دارد.`;
  if (statusNeedsAttention(status)) return `وضعیت ردیف نیازمند توجه است: ${status}`;
  if (!safeItemHash(item)) return 'هش امن برای تطبیق این ردیف در فراداده خلاصه پیدا نشد.';
  return 'بدون مورد برجسته';
};

const buildQueueRows = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): AttentionRow[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  const rows: AttentionRow[] = [];

  for (const source of sources) {
    if (!visibleKeys.has(source.key)) continue;
    const label = routeLabels[source.key] || source.label;
    const sourceScore = sourcePriority(source);

    if (sourceScore > 0) {
      rows.push({
        key: `${source.key}-source`,
        kind: 'source',
        source,
        label,
        title: 'بررسی وضعیت منبع',
        reason: sourceReason(source),
        priority: sourceScore,
        priorityLabel: priorityLabel(sourceScore),
        safeId: source.latestId,
        safeHash: source.latestChecksum,
        item: source.summary ?? { state: source.state, count: source.count, latestId: source.latestId, latestChecksum: source.latestChecksum },
        itemIndex: -1,
        warnings: 0,
        errors: source.state === 'error' ? 1 : 0,
        status: source.state,
      });
    }

    source.items.forEach((item, index) => {
      const score = itemPriority(item);
      if (score <= 0) return;
      rows.push({
        key: `${source.key}-item-${index}`,
        kind: 'item',
        source,
        label,
        title: `ردیف ${toFaNumber(index + 1)}`,
        reason: itemReason(item),
        priority: score,
        priorityLabel: priorityLabel(score),
        safeId: safeItemId(item) || source.latestId,
        safeHash: safeItemHash(item) || source.latestChecksum,
        item,
        itemIndex: index,
        warnings: warningCount(item),
        errors: errorCount(item),
        status: itemStatus(item),
      });
    });
  }

  return rows.sort((left, right) => right.priority - left.priority || right.errors - left.errors || right.warnings - left.warnings || left.label.localeCompare(right.label, 'fa')).slice(0, 12);
};

const buildSummary = (rows: AttentionRow[]): QueueSummary => ({
  totalRows: rows.length,
  sourceRows: rows.filter((row) => row.kind === 'source').length,
  itemRows: rows.filter((row) => row.kind === 'item').length,
  criticalRows: rows.filter((row) => row.priority >= 90).length,
  highRows: rows.filter((row) => row.priority >= 72 && row.priority < 90).length,
  mediumRows: rows.filter((row) => row.priority >= 50 && row.priority < 72).length,
});

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
    <div className="text-lg font-black text-slate-950 dark:text-white">{value}</div>
    <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{helper}</div>
  </div>
);

export function MlOperatorRiskAttentionQueue({
  sources,
  visibleSourceKeys,
  onOpenDetail,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  onOpenDetail?: (source: MlOperatorRouteResult, item: unknown, index: number) => void;
}) {
  const queueRows = useMemo(() => buildQueueRows(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const summary = useMemo(() => buildSummary(queueRows), [queueRows]);

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-risk-attention-anchor="read-only-risk-attention-queue"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-list-check" />
              صف توجه مدیریتی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/60">
              <i className="fa-solid fa-eye" />
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">اولویت بررسی منابع و ردیف‌ها</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این صف از فراداده‌های همین نمای فعلی ساخته می‌شود و فقط موارد نیازمند توجه را برای بررسی مدیریتی مرتب می‌کند؛ هیچ تصمیم، اجرا یا تغییر عملیاتی انجام نمی‌شود.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-3 xl:min-w-[520px]">
          <MetricCard label="کل موارد" value={toFaNumber(summary.totalRows)} helper="از منابع قابل نمایش فعلی" />
          <MetricCard label="سطح فوری" value={toFaNumber(summary.criticalRows)} helper="خطا یا دسترسی نیازمند بررسی" />
          <MetricCard label="سطح بالا" value={toFaNumber(summary.highRows)} helper="هشدار یا وضعیت نامطمئن" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-layer-group ml-2 text-slate-400" />
          {toFaNumber(summary.sourceRows)} مورد از سطح منبع و {toFaNumber(summary.itemRows)} مورد از سطح ردیف شناسایی شده است.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-filter ml-2 text-slate-400" />
          صف با جستجو و فیلترهای فعال هماهنگ است و فقط بخش‌های قابل مشاهده را بررسی می‌کند.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-lock ml-2 text-slate-400" />
          کپی فقط برای شناسه و هش امن فعال است؛ مسیر داخلی یا داده خام نمایش داده نمی‌شود.
        </div>
      </div>

      {queueRows.length > 0 ? (
        <div className="mt-4 space-y-2">
          {queueRows.map((row) => (
            <article key={row.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                      <i className="fa-solid fa-flag" />
                      {row.priorityLabel}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                      {row.kind === 'source' ? 'منبع' : 'ردیف'}
                    </span>
                    <MlOperatorStatusChip state={row.source.state} />
                  </div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">{row.label} — {row.title}</h3>
                  <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{row.reason}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="text-[10px] font-black text-slate-400">اولویت</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{toFaNumber(row.priority)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="text-[10px] font-black text-slate-400">هشدار</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{toFaNumber(row.warnings)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="text-[10px] font-black text-slate-400">خطا</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{toFaNumber(row.errors)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <MlOperatorCopyButton value={row.safeId} label="کپی شناسه" compact />
                  <MlOperatorCopyButton value={row.safeHash} label="کپی هش" compact />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(row.source, row.item, row.itemIndex)}
                  className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                >
                  <i className="fa-solid fa-eye" />
                  مشاهده جزئیات خواندنی
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <IconGlyph tone="neutral" className="mx-auto h-11 w-11" aria-hidden="true"><i className="fa-solid fa-circle-check" /></IconGlyph>
          <div className="mt-3 text-sm font-black text-slate-900 dark:text-white">موردی برای توجه فوری پیدا نشد</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">با تغییر فیلترها یا دریافت فراداده جدید، این صف دوباره از همان داده‌های خواندنی ساخته می‌شود.</p>
        </div>
      )}
    </section>
  );
}
