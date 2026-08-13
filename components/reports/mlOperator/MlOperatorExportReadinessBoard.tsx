import { formatExactNumberText } from '../../../utils/exactNumber';
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

const exportReadinessKeys = new Set<MlOperatorOverviewRouteKey>(['receiptExports', 'exportPackages', 'packageSnapshots']);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const safeItemId = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.id, item.exportId, item.receiptId, item.packageId, item.snapshotId, item.summaryId, item.summaryKey);
};

const safeItemHash = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.checksum, item.hash, item.contentHash, item.receiptHash, item.exportPayloadHash, item.packageHash, item.snapshotHash);
};

const itemStatus = (item: unknown): string | null => {
  if (!isRecord(item)) return null;
  return firstString(item.status, item.state, item.exportStatus, item.packageStatus, item.snapshotStatus);
};

const lowerStatus = (value: string | null): string => (value || '').trim().toLowerCase();

const statusLooksReady = (value: string | null): boolean => {
  const normalized = lowerStatus(value);
  if (!normalized) return false;
  return ['ready', 'ok', 'success', 'completed', 'complete', 'valid', 'passed', 'exported', 'created', 'sealed', 'available'].some((marker) => normalized.includes(marker));
};

const statusNeedsAttention = (value: string | null): boolean => {
  const normalized = lowerStatus(value);
  if (!normalized) return false;
  return ['error', 'failed', 'invalid', 'missing', 'blocked', 'rejected', 'warning', 'expired'].some((marker) => normalized.includes(marker));
};

const warningCount = (item: unknown): number => {
  if (!isRecord(item)) return 0;
  const warnings = item.warnings ?? item.warningList ?? item.warningMetadata;
  if (Array.isArray(warnings)) return warnings.length;
  if (typeof item.warningCount === 'number') return item.warningCount;
  return 0;
};

const errorCount = (item: unknown): number => {
  if (!isRecord(item)) return 0;
  const errors = item.errors ?? item.errorList ?? item.errorMetadata;
  if (Array.isArray(errors)) return errors.length;
  if (typeof item.errorCount === 'number') return item.errorCount;
  return 0;
};

type ReadinessLevel = 'ready' | 'attention' | 'blocked';

type ExportReadinessRow = {
  key: string;
  source: MlOperatorRouteResult;
  item: unknown;
  itemIndex: number;
  label: string;
  title: string;
  description: string;
  level: ReadinessLevel;
  score: number;
  safeId: string | null;
  safeHash: string | null;
  status: string | null;
  warnings: number;
  errors: number;
};

const readinessLevelLabel = (level: ReadinessLevel): string => {
  if (level === 'blocked') return 'نیازمند توقف مرور';
  if (level === 'attention') return 'نیازمند بررسی';
  return 'آماده مرور';
};

const readinessLevelClassName = (level: ReadinessLevel): string => {
  if (level === 'blocked') return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/25 dark:text-rose-200 dark:ring-rose-900/70';
  if (level === 'attention') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/70';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70';
};

const sourceLevel = (source: MlOperatorRouteResult): ReadinessLevel => {
  if (source.state === 'error' || source.state === 'unauthorized' || source.state === 'unavailable') return 'blocked';
  if (source.state === 'empty' || !source.latestChecksum || !source.latestId) return 'attention';
  return 'ready';
};

const itemLevel = (item: unknown): ReadinessLevel => {
  if (errorCount(item) > 0 || statusNeedsAttention(itemStatus(item))) return 'blocked';
  if (warningCount(item) > 0 || !safeItemHash(item) || !safeItemId(item) || !statusLooksReady(itemStatus(item))) return 'attention';
  return 'ready';
};

const sourceScore = (source: MlOperatorRouteResult): number => {
  if (sourceLevel(source) === 'blocked') return source.state === 'unauthorized' ? 38 : 30;
  if (sourceLevel(source) === 'attention') return source.state === 'empty' ? 64 : 72;
  return Math.min(100, 86 + Math.min(source.count, 5) * 2 + (source.latestChecksum ? 4 : 0));
};

const itemScore = (item: unknown): number => {
  const level = itemLevel(item);
  if (level === 'blocked') return Math.max(10, 36 - errorCount(item) * 6);
  if (level === 'attention') return Math.max(48, 74 - warningCount(item) * 4);
  return 94;
};

const sourceDescription = (source: MlOperatorRouteResult): string => {
  if (source.state === 'ready') return 'منبع خروجی/بسته داده خواندنی دارد و برای مرور مدیریتی آماده است.';
  if (source.state === 'empty') return 'منبع پاسخ معتبر دارد اما رکورد خروجی یا بسته‌ای برای مرور برنگشته است.';
  if (source.state === 'unauthorized') return 'دسترسی خواندنی این منبع باید پیش از مرور مدیریتی بررسی شود.';
  if (source.state === 'unavailable') return 'این منبع خواندنی فعلاً در دسترس نیست و در برد آمادگی قابل اتکا نیست.';
  return source.message || 'این منبع با خطا پاسخ داده و برای مرور خروجی آماده نیست.';
};

const itemDescription = (item: unknown): string => {
  const errors = errorCount(item);
  const warnings = warningCount(item);
  const status = itemStatus(item);
  if (errors > 0) return `${toFaNumber(errors)} خطا در فراداده این ردیف ثبت شده است.`;
  if (warnings > 0) return `${toFaNumber(warnings)} هشدار برای بررسی مدیریتی وجود دارد.`;
  if (!safeItemHash(item)) return 'هش امن این ردیف برای تطبیق در برد آمادگی موجود نیست.';
  if (!safeItemId(item)) return 'شناسه امن این ردیف برای پیگیری خواندنی موجود نیست.';
  if (!statusLooksReady(status)) return status ? `وضعیت ردیف برای آمادگی نیازمند مرور است: ${status}` : 'وضعیت خواندنی ردیف در فراداده مشخص نیست.';
  return 'شناسه، هش و وضعیت خواندنی این ردیف برای مرور مدیریتی آماده است.';
};

const buildExportReadinessRows = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): ExportReadinessRow[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  const rows: ExportReadinessRow[] = [];

  for (const source of sources) {
    if (!visibleKeys.has(source.key) || !exportReadinessKeys.has(source.key)) continue;
    const label = routeLabels[source.key] || source.label;
    const level = sourceLevel(source);

    rows.push({
      key: `${source.key}-source-readiness`,
      source,
      item: source.summary ?? { state: source.state, count: source.count, latestId: source.latestId, latestChecksum: source.latestChecksum },
      itemIndex: -1,
      label,
      title: `${label} — آمادگی منبع`,
      description: sourceDescription(source),
      level,
      score: sourceScore(source),
      safeId: source.latestId,
      safeHash: source.latestChecksum,
      status: source.state,
      warnings: source.state === 'empty' ? 1 : 0,
      errors: level === 'blocked' ? 1 : 0,
    });

    source.items.slice(0, 4).forEach((item, index) => {
      const rowLevel = itemLevel(item);
      rows.push({
        key: `${source.key}-item-readiness-${index}`,
        source,
        item,
        itemIndex: index,
        label,
        title: `${label} — ردیف ${toFaNumber(index + 1)}`,
        description: itemDescription(item),
        level: rowLevel,
        score: itemScore(item),
        safeId: safeItemId(item) || source.latestId,
        safeHash: safeItemHash(item) || source.latestChecksum,
        status: itemStatus(item) || source.state,
        warnings: warningCount(item),
        errors: errorCount(item),
      });
    });
  }

  const priority = { blocked: 3, attention: 2, ready: 1 } satisfies Record<ReadinessLevel, number>;
  return rows.sort((left, right) => priority[right.level] - priority[left.level] || right.score - left.score || left.title.localeCompare(right.title, 'fa'));
};

const readinessSummary = (rows: ExportReadinessRow[]) => {
  const readyRows = rows.filter((row) => row.level === 'ready').length;
  const attentionRows = rows.filter((row) => row.level === 'attention').length;
  const blockedRows = rows.filter((row) => row.level === 'blocked').length;
  const safeHashRows = rows.filter((row) => Boolean(row.safeHash)).length;
  const averageScore = rows.length > 0 ? (rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
  return { readyRows, attentionRows, blockedRows, safeHashRows, averageScore };
};

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
    <div className="text-lg font-black text-slate-950 dark:text-white">{value}</div>
    <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{helper}</div>
  </div>
);

export function MlOperatorExportReadinessBoard({
  sources,
  visibleSourceKeys,
  onOpenDetail,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  onOpenDetail?: (source: MlOperatorRouteResult, item: unknown, index: number) => void;
}) {
  const readinessRows = useMemo(() => buildExportReadinessRows(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const summary = useMemo(() => readinessSummary(readinessRows), [readinessRows]);

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-export-readiness-anchor="read-only-export-readiness-board"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-clipboard-check" />
              برد آمادگی خروجی‌ها
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
              <i className="fa-solid fa-eye" />
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">مرور مدیریتی آمادگی خروجی و بسته‌ها</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این برد فقط از فراداده لودشده خروجی رسیدها، بسته‌های خروجی و اسنپ‌شات‌ها ساخته می‌شود و هیچ ثبت، ارسال یا تغییر عملیاتی انجام نمی‌دهد.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-5 xl:min-w-[780px]">
          <MetricCard label="میانگین آمادگی" value={toFaNumber(summary.averageScore)} helper="محاسبه خواندنی" />
          <MetricCard label="آماده مرور" value={toFaNumber(summary.readyRows)} helper="شناسه و هش معتبر" />
          <MetricCard label="نیازمند بررسی" value={toFaNumber(summary.attentionRows)} helper="ابهام یا نبود هش" />
          <MetricCard label="توقف مرور" value={toFaNumber(summary.blockedRows)} helper="خطا یا وضعیت نامعتبر" />
          <MetricCard label="پوشش هش امن" value={`${toFaNumber(summary.safeHashRows)} / ${toFaNumber(readinessRows.length)}`} helper="بدون کپی حساس" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-filter ml-2 text-slate-400" />
          برد با جستجو و فیلترهای فعال هماهنگ است و فقط منابع قابل نمایش را بررسی می‌کند.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-shield-halved ml-2 text-slate-400" />
          فقط شناسه و هش امن قابل کپی است؛ مسیر داخلی یا داده خام نمایش داده نمی‌شود.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-ban ml-2 text-slate-400" />
          کنترل اجرایی، ذخیره‌سازی، تأیید عملیاتی یا تغییر اطلاعات فروشگاه در این برد وجود ندارد.
        </div>
      </div>

      {readinessRows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-12 gap-2 bg-slate-100 px-4 py-3 text-[11px] font-black text-slate-500 dark:bg-slate-950/55 dark:text-slate-400">
            <div className="col-span-12 md:col-span-3">مورد</div>
            <div className="col-span-6 md:col-span-2">وضعیت منبع</div>
            <div className="col-span-6 md:col-span-2">آمادگی</div>
            <div className="col-span-6 md:col-span-1">امتیاز</div>
            <div className="col-span-6 md:col-span-2">فراداده امن</div>
            <div className="col-span-12 md:col-span-2">جزئیات</div>
          </div>

          <div className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/80">
            {readinessRows.map((row) => (
              <article key={row.key} className="grid grid-cols-12 gap-3 px-4 py-4 text-right">
                <div className="col-span-12 min-w-0 md:col-span-3">
                  <div className="text-sm font-black text-slate-950 dark:text-white">{row.title}</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{row.description}</p>
                  <div className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">وضعیت خواندنی: {row.status || 'نامشخص'}</div>
                </div>

                <div className="col-span-6 flex items-start md:col-span-2">
                  <MlOperatorStatusChip state={row.source.state} />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${readinessLevelClassName(row.level)}`}>
                    <i className="fa-solid fa-circle-check" />
                    {readinessLevelLabel(row.level)}
                  </span>
                  <div className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    هشدار: {toFaNumber(row.warnings)} · خطا: {toFaNumber(row.errors)}
                  </div>
                </div>

                <div className="col-span-6 md:col-span-1">
                  <div className="text-sm font-black text-slate-950 dark:text-white">{toFaNumber(row.score)}</div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-slate-700 dark:bg-slate-200" style={{ width: `${row.score}%` }} />
                  </div>
                </div>

                <div className="col-span-6 space-y-2 md:col-span-2">
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-2 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:ring-slate-800">
                    <span className="font-black text-slate-700 dark:text-slate-200">شناسه:</span> <span className="break-all">{row.safeId || 'ثبت نشده'}</span>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-2 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:ring-slate-800">
                    <span className="font-black text-slate-700 dark:text-slate-200">هش:</span> <span className="break-all">{row.safeHash || 'ثبت نشده'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MlOperatorCopyButton value={row.safeId} label="کپی شناسه" compact />
                    <MlOperatorCopyButton value={row.safeHash} label="کپی هش" compact />
                  </div>
                </div>

                <div className="col-span-12 flex items-start md:col-span-2">
                  {onOpenDetail ? (
                    <button
                      type="button"
                      onClick={() => onOpenDetail(row.source, row.item, row.itemIndex)}
                      className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
                    >
                      <i className="fa-solid fa-eye" />
                      بررسی جزئیات
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">جزئیات غیرفعال</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950/35 dark:text-slate-400">
          منبع خروجی یا بسته قابل مشاهده‌ای برای ساخت برد آمادگی وجود ندارد.
        </div>
      )}
    </section>
  );
}
