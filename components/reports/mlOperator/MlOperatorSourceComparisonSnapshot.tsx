import { formatExactNumberText } from '../../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import { useMemo } from 'react';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult, MlOperatorRouteState } from '../../../services/mlOperatorOverviewApi';
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

const stateWeight: Record<MlOperatorRouteState, number> = {
  ready: 5,
  empty: 4,
  unavailable: 2,
  unauthorized: 1,
  error: 0,
};

const formatDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const freshnessMinutes = (value: string): number | null => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const diff = Date.now() - timestamp;
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return (diff / 60000);
};

const formatFreshness = (minutes: number | null): string => {
  if (minutes === null) return 'نامشخص';
  if (minutes < 1) return 'کمتر از یک دقیقه';
  if (minutes < 60) return `${toFaNumber(minutes)} دقیقه`;
  const hours = (minutes / 60);
  if (hours < 24) return `${toFaNumber(hours)} ساعت`;
  return `${toFaNumber((hours / 24))} روز`;
};

const coverageScore = (source: MlOperatorRouteResult): number => {
  let score = stateWeight[source.state] * 16;
  if (source.count > 0) score += Math.min(12, source.count * 2);
  if (source.latestId) score += 4;
  if (source.latestChecksum) score += 4;
  if (source.summary) score += 4;
  return Math.min(100, score);
};

const attentionLabel = (source: MlOperatorRouteResult): string => {
  if (source.state === 'ready' && source.latestChecksum) return 'کامل و قابل تطبیق';
  if (source.state === 'ready') return 'داده دارد؛ هش تازه بررسی شود';
  if (source.state === 'empty') return 'پاسخ سالم اما بدون رکورد';
  if (source.state === 'unauthorized') return 'نیازمند بررسی سطح دسترسی';
  if (source.state === 'unavailable') return 'منبع در دسترس نیست';
  return source.message || 'نیازمند بررسی پاسخ سرویس';
};

type ComparisonRow = {
  source: MlOperatorRouteResult;
  label: string;
  score: number;
  freshness: number | null;
  attention: string;
  rank: number;
};

type SnapshotSummary = {
  readyCount: number;
  emptyCount: number;
  attentionCount: number;
  checksumCoverage: number;
  totalRows: number;
  totalRecords: number;
  strongestLabel: string;
  weakestLabel: string;
};

const buildRows = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): ComparisonRow[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  return sources
    .filter((source) => visibleKeys.has(source.key))
    .map((source) => {
      const score = coverageScore(source);
      return {
        source,
        label: routeLabels[source.key] || source.label,
        score,
        freshness: freshnessMinutes(source.fetchedAt),
        attention: attentionLabel(source),
        rank: stateWeight[source.state],
      };
    })
    .sort((left, right) => right.rank - left.rank || right.score - left.score || right.source.count - left.source.count || left.label.localeCompare(right.label, 'fa'));
};

const buildSummary = (rows: ComparisonRow[]): SnapshotSummary => {
  const readyCount = rows.filter((row) => row.source.state === 'ready').length;
  const emptyCount = rows.filter((row) => row.source.state === 'empty').length;
  const attentionCount = rows.filter((row) => !['ready', 'empty'].includes(row.source.state)).length;
  const checksumRows = rows.filter((row) => Boolean(row.source.latestChecksum)).length;
  const strongest = [...rows].sort((left, right) => right.score - left.score || right.source.count - left.source.count)[0];
  const weakest = [...rows].sort((left, right) => left.score - right.score || left.source.count - right.source.count)[0];

  return {
    readyCount,
    emptyCount,
    attentionCount,
    checksumCoverage: rows.length > 0 ? ((checksumRows / rows.length) * 100) : 0,
    totalRows: rows.length,
    totalRecords: rows.reduce((sum, row) => sum + row.source.count, 0),
    strongestLabel: strongest?.label || 'نامشخص',
    weakestLabel: weakest?.label || 'نامشخص',
  };
};

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
    <div className="text-lg font-black text-slate-950 dark:text-white">{value}</div>
    <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{helper}</div>
  </div>
);

export function MlOperatorSourceComparisonSnapshot({
  sources,
  visibleSourceKeys,
  fetchedAt,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  fetchedAt: string;
}) {
  const rows = useMemo(() => buildRows(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const summary = useMemo(() => buildSummary(rows), [rows]);

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-source-comparison-anchor="read-only-source-comparison-snapshot"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-code-compare" />
              اسنپ‌شات مقایسه منابع
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              <i className="fa-solid fa-lock" />
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">مقایسه مدیریتی منابع فراداده</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این نما منابع قابل مشاهده را کنار هم قرار می‌دهد تا وضعیت، پوشش هش، تعداد رکورد و تازگی دریافت در یک نگاه مدیریتی بررسی شود؛ هیچ فراخوانی، ذخیره‌سازی یا تغییر عملیاتی انجام نمی‌شود.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
          <MetricCard label="منبع قابل مشاهده" value={toFaNumber(summary.totalRows)} helper="بعد از اعمال فیلتر فعلی" />
          <MetricCard label="رکورد خواندنی" value={toFaNumber(summary.totalRecords)} helper="جمع داده‌های بارگذاری‌شده" />
          <MetricCard label="پوشش هش امن" value={`${toFaNumber(summary.checksumCoverage)}٪`} helper="برای تطبیق فراداده" />
          <MetricCard label="نیازمند توجه" value={toFaNumber(summary.attentionCount)} helper="بدون کنترل اجرایی" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <div className="text-xs font-black text-slate-400">قوی‌ترین منبع فعلی</div>
          <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{summary.strongestLabel}</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">بر اساس وضعیت، تعداد رکورد، شناسه و هش امن.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <div className="text-xs font-black text-slate-400">ضعیف‌ترین منبع فعلی</div>
          <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{summary.weakestLabel}</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">برای بررسی دستی وضعیت دسترسی، خالی بودن یا خطای پاسخ.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <div className="text-xs font-black text-slate-400">زمان ساخت نمای مقایسه</div>
          <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{formatDateTime(fetchedAt)}</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">از پاسخ فعلی ساخته شده و چیزی ذخیره نمی‌شود.</p>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            <i className="fa-solid fa-shield-halved ml-2 text-slate-400" />
            مرز ایمنی مقایسه
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            آماده: {toFaNumber(summary.readyCount)} · خالی: {toFaNumber(summary.emptyCount)} · نیازمند توجه: {toFaNumber(summary.attentionCount)}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-eye ml-2 text-slate-400" />
            مقایسه فقط از داده‌های همین صفحه ساخته شده است.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-copy ml-2 text-slate-400" />
            کپی فقط برای شناسه و هش امن هر منبع فعال است.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-ban ml-2 text-slate-400" />
            کنترل اجرایی، ذخیره‌سازی یا تغییر اطلاعات عملیاتی وجود ندارد.
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-12 gap-2 bg-slate-100 px-4 py-3 text-[11px] font-black text-slate-500 dark:bg-slate-950/55 dark:text-slate-400">
            <div className="col-span-12 md:col-span-3">منبع</div>
            <div className="col-span-6 md:col-span-2">وضعیت</div>
            <div className="col-span-6 md:col-span-2">امتیاز مقایسه</div>
            <div className="col-span-6 md:col-span-2">تازگی</div>
            <div className="col-span-6 md:col-span-1">رکورد</div>
            <div className="col-span-12 md:col-span-2">کپی امن</div>
          </div>

          <div className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/80">
            {rows.map((row) => (
              <article key={row.source.key} className="grid grid-cols-12 gap-3 px-4 py-4 text-right">
                <div className="col-span-12 min-w-0 md:col-span-3">
                  <div className="text-sm font-black text-slate-950 dark:text-white">{row.label}</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{row.attention}</p>
                </div>

                <div className="col-span-6 flex items-start md:col-span-2">
                  <MlOperatorStatusChip state={row.source.state} />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-slate-700 dark:bg-slate-200" style={{ width: `${row.score}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">{toFaNumber(row.score)}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-black text-slate-400">رتبه {toFaNumber(row.rank)}</div>
                </div>

                <div className="col-span-6 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400 md:col-span-2">
                  <div>{formatFreshness(row.freshness)}</div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(row.source.fetchedAt)}</div>
                </div>

                <div className="col-span-6 text-sm font-black text-slate-950 dark:text-white md:col-span-1">
                  {toFaNumber(row.source.count)}
                </div>

                <div className="col-span-12 flex flex-wrap gap-2 md:col-span-2">
                  <MlOperatorCopyButton value={row.source.latestId} label="کپی شناسه" compact />
                  <MlOperatorCopyButton value={row.source.latestChecksum} label="کپی هش" compact />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <IconGlyph tone="neutral" className="mx-auto h-11 w-11" aria-hidden="true"><i className="fa-solid fa-code-compare" /></IconGlyph>
          <div className="mt-3 text-sm font-black text-slate-900 dark:text-white">منبعی برای مقایسه پیدا نشد</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">با تغییر فیلترهای فعلی، اسنپ‌شات مقایسه خواندنی دوباره ساخته می‌شود.</p>
        </div>
      )}
    </section>
  );
}
