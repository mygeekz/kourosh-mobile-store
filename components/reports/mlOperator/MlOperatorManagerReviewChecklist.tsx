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

const statusNeedsReview = (status: string | null): boolean => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return !['ready', 'ok', 'success', 'completed', 'complete', 'valid', 'passed', 'exported', 'created', 'active'].some((safeStatus) => normalized.includes(safeStatus));
};

type ReviewState = 'ready' | 'attention' | 'blocked';

type ReviewChecklistItem = {
  key: string;
  source: MlOperatorRouteResult;
  item: unknown;
  itemIndex: number;
  title: string;
  description: string;
  evidence: string;
  state: ReviewState;
  safeId: string | null;
  safeHash: string | null;
  warnings: number;
  errors: number;
};

type ChecklistSummary = {
  totalItems: number;
  readyItems: number;
  attentionItems: number;
  blockedItems: number;
  visibleSources: number;
  inspectedRows: number;
};

const reviewStateLabel = (state: ReviewState): string => {
  if (state === 'blocked') return 'نیازمند اقدام مدیریتی';
  if (state === 'attention') return 'نیازمند بررسی';
  return 'آماده مرور';
};

const reviewStateClassName = (state: ReviewState): string => {
  if (state === 'blocked') return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/25 dark:text-rose-200 dark:ring-rose-900/70';
  if (state === 'attention') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/70';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70';
};

const sourceReviewState = (source: MlOperatorRouteResult): ReviewState => {
  if (source.state === 'error' || source.state === 'unauthorized' || source.state === 'unavailable') return 'blocked';
  if (source.state === 'empty' || !source.latestChecksum) return 'attention';
  return 'ready';
};

const sourceReviewDescription = (source: MlOperatorRouteResult): string => {
  if (source.state === 'error') return source.message || 'منبع با خطا پاسخ داده و باید قبل از اتکا به گزارش بررسی شود.';
  if (source.state === 'unauthorized') return 'دسترسی خواندنی منبع باید توسط مدیر یا سرپرست بررسی شود.';
  if (source.state === 'unavailable') return 'منبع خواندنی فعلاً در دسترس نیست و مرور مدیریتی باید با احتیاط انجام شود.';
  if (source.state === 'empty') return 'منبع پاسخ معتبر دارد اما داده‌ای برای مرور مدیریتی برنگشته است.';
  if (!source.latestChecksum) return 'منبع داده دارد اما هش امن آخرین رکورد در خلاصه قابل مشاهده نیست.';
  return 'منبع داده خواندنی، شناسه امن و هش قابل تطبیق دارد.';
};

const itemReviewState = (item: unknown): ReviewState => {
  if (errorCount(item) > 0) return 'blocked';
  if (warningCount(item) > 0 || statusNeedsReview(itemStatus(item)) || !safeItemHash(item)) return 'attention';
  return 'ready';
};

const itemReviewDescription = (item: unknown): string => {
  const errors = errorCount(item);
  const warnings = warningCount(item);
  const status = itemStatus(item);
  if (errors > 0) return `${toFaNumber(errors)} خطا در فراداده این ردیف ثبت شده است.`;
  if (warnings > 0) return `${toFaNumber(warnings)} هشدار برای مرور مدیریتی وجود دارد.`;
  if (statusNeedsReview(status)) return `وضعیت ردیف برای مرور مدیریتی نیازمند توجه است: ${status}`;
  if (!safeItemHash(item)) return 'هش امن برای تطبیق این ردیف در فراداده موجود نیست.';
  return 'ردیف از نظر هش، وضعیت و شمارش خطا/هشدار برای مرور خواندنی آماده است.';
};

const buildChecklistItems = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): ReviewChecklistItem[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  const items: ReviewChecklistItem[] = [];

  for (const source of sources) {
    if (!visibleKeys.has(source.key)) continue;
    const label = routeLabels[source.key] || source.label;
    const state = sourceReviewState(source);

    items.push({
      key: `${source.key}-source-review`,
      source,
      item: source.summary ?? { state: source.state, count: source.count, latestId: source.latestId, latestChecksum: source.latestChecksum },
      itemIndex: -1,
      title: `${label} — کنترل منبع`,
      description: sourceReviewDescription(source),
      evidence: `${toFaNumber(source.count)} رکورد قابل مشاهده از این منبع در نمای فعلی وجود دارد.`,
      state,
      safeId: source.latestId,
      safeHash: source.latestChecksum,
      warnings: source.state === 'empty' ? 1 : 0,
      errors: state === 'blocked' ? 1 : 0,
    });

    source.items.slice(0, 3).forEach((item, index) => {
      const rowState = itemReviewState(item);
      items.push({
        key: `${source.key}-row-review-${index}`,
        source,
        item,
        itemIndex: index,
        title: `${label} — ردیف ${toFaNumber(index + 1)}`,
        description: itemReviewDescription(item),
        evidence: 'این ردیف از همان فراداده لودشده برای دراور جزئیات خواندنی بررسی شده است.',
        state: rowState,
        safeId: safeItemId(item) || source.latestId,
        safeHash: safeItemHash(item) || source.latestChecksum,
        warnings: warningCount(item),
        errors: errorCount(item),
      });
    });
  }

  return items.sort((left, right) => {
    const priority = { blocked: 3, attention: 2, ready: 1 } satisfies Record<ReviewState, number>;
    return priority[right.state] - priority[left.state] || right.errors - left.errors || right.warnings - left.warnings || left.title.localeCompare(right.title, 'fa');
  });
};

const buildSummary = (items: ReviewChecklistItem[], visibleSources: number): ChecklistSummary => ({
  totalItems: items.length,
  readyItems: items.filter((item) => item.state === 'ready').length,
  attentionItems: items.filter((item) => item.state === 'attention').length,
  blockedItems: items.filter((item) => item.state === 'blocked').length,
  visibleSources,
  inspectedRows: items.filter((item) => item.itemIndex >= 0).length,
});

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
    <div className="text-lg font-black text-slate-950 dark:text-white">{value}</div>
    <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{helper}</div>
  </div>
);

export function MlOperatorManagerReviewChecklist({
  sources,
  visibleSourceKeys,
  onOpenDetail,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  onOpenDetail?: (source: MlOperatorRouteResult, item: unknown, index: number) => void;
}) {
  const checklistItems = useMemo(() => buildChecklistItems(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const summary = useMemo(() => buildSummary(checklistItems, visibleSourceKeys.length), [checklistItems, visibleSourceKeys.length]);

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-manager-review-anchor="read-only-manager-review-checklist"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-clipboard-list" />
              چک‌لیست بررسی مدیریتی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
              <i className="fa-solid fa-eye" />
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">مرور مدیریتی قبل از اتکا به فراداده</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این چک‌لیست از همان منابع و ردیف‌های قابل مشاهده ساخته می‌شود و فقط وضعیت مرور را نشان می‌دهد؛ موردی ذخیره، ارسال یا به عملیات فروشگاه اعمال نمی‌شود.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-4 xl:min-w-[640px]">
          <MetricCard label="موارد مرور" value={toFaNumber(summary.totalItems)} helper="از منابع قابل نمایش" />
          <MetricCard label="آماده مرور" value={toFaNumber(summary.readyItems)} helper="بدون خطای برجسته" />
          <MetricCard label="نیازمند بررسی" value={toFaNumber(summary.attentionItems)} helper="هشدار یا نبود هش" />
          <MetricCard label="اقدام مدیریتی" value={toFaNumber(summary.blockedItems)} helper="خطا یا دسترسی نامعتبر" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-filter ml-2 text-slate-400" />
          چک‌لیست با جستجو و فیلترهای فعال هماهنگ است و {toFaNumber(summary.visibleSources)} منبع قابل نمایش را مرور می‌کند.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-table-list ml-2 text-slate-400" />
          {toFaNumber(summary.inspectedRows)} ردیف نمونه از فراداده همین صفحه در مرور مدیریتی بررسی شده است.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-lock ml-2 text-slate-400" />
          کپی فقط برای شناسه و هش امن فعال است؛ این پنل هیچ کنترل تغییر یا ثبت ندارد.
        </div>
      </div>

      {checklistItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {checklistItems.slice(0, 14).map((item) => (
            <article key={item.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${reviewStateClassName(item.state)}`}>
                      <i className="fa-solid fa-clipboard-check" />
                      {reviewStateLabel(item.state)}
                    </span>
                    <MlOperatorStatusChip state={item.source.state} />
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                      {item.itemIndex >= 0 ? 'ردیف فراداده' : 'کنترل منبع'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{item.evidence}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[320px]">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="text-[10px] font-black text-slate-400">هشدار</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{toFaNumber(item.warnings)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="text-[10px] font-black text-slate-400">خطا</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{toFaNumber(item.errors)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <MlOperatorCopyButton value={item.safeId} label="کپی شناسه" compact />
                  <MlOperatorCopyButton value={item.safeHash} label="کپی هش" compact />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(item.source, item.item, item.itemIndex)}
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
          <IconGlyph tone="neutral" className="mx-auto h-11 w-11" aria-hidden="true"><i className="fa-solid fa-clipboard-check" /></IconGlyph>
          <div className="mt-3 text-sm font-black text-slate-900 dark:text-white">موردی برای مرور مدیریتی وجود ندارد</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">با تغییر فیلترها یا دریافت فراداده جدید، چک‌لیست دوباره از همان داده‌های خواندنی ساخته می‌شود.</p>
        </div>
      )}
    </section>
  );
}
