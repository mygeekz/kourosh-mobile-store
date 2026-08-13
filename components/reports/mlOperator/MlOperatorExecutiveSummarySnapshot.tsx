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

type SummaryState = 'stable' | 'attention' | 'blocked';

type ExecutiveSummary = {
  state: SummaryState;
  visibleSources: number;
  readySources: number;
  emptySources: number;
  attentionSources: number;
  blockedSources: number;
  returnedItems: number;
  hashCoverage: number;
  idCoverage: number;
  readinessScore: number;
  strongestSource: MlOperatorRouteResult | null;
  weakestSource: MlOperatorRouteResult | null;
  latestSafeId: string | null;
  latestSafeHash: string | null;
};

const isBlockedSource = (source: MlOperatorRouteResult): boolean => source.state === 'error' || source.state === 'unauthorized' || source.state === 'unavailable';

const isAttentionSource = (source: MlOperatorRouteResult): boolean => source.state === 'empty' || !source.latestChecksum || !source.latestId;

const sourceScore = (source: MlOperatorRouteResult): number => {
  let score = 0;
  if (source.state === 'ready') score += 45;
  if (source.state === 'empty') score += 22;
  if (source.latestId) score += 15;
  if (source.latestChecksum) score += 20;
  score += Math.min(20, source.count * 4);
  if (isBlockedSource(source)) score -= 45;
  return Math.max(0, Math.min(100, score));
};

const buildExecutiveSummary = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): ExecutiveSummary => {
  const visibleKeys = new Set(visibleSourceKeys);
  const visibleSources = sources.filter((source) => visibleKeys.has(source.key));
  const readySources = visibleSources.filter((source) => source.state === 'ready').length;
  const emptySources = visibleSources.filter((source) => source.state === 'empty').length;
  const blockedSources = visibleSources.filter(isBlockedSource).length;
  const attentionSources = visibleSources.filter((source) => !isBlockedSource(source) && isAttentionSource(source)).length;
  const returnedItems = visibleSources.reduce((sum, source) => sum + source.count, 0);
  const hashCoverage = visibleSources.filter((source) => Boolean(source.latestChecksum)).length;
  const idCoverage = visibleSources.filter((source) => Boolean(source.latestId)).length;
  const scores = visibleSources.map((source) => ({ source, score: sourceScore(source) }));
  const readinessScore = visibleSources.length > 0 ? (scores.reduce((sum, item) => sum + item.score, 0) / visibleSources.length) : 0;
  const sortedByScore = [...scores].sort((left, right) => right.score - left.score || right.source.count - left.source.count);
  const latestSourceWithId = visibleSources.find((source) => source.latestId) ?? null;
  const latestSourceWithHash = visibleSources.find((source) => source.latestChecksum) ?? null;

  return {
    state: blockedSources > 0 ? 'blocked' : attentionSources > 0 || emptySources > 0 ? 'attention' : 'stable',
    visibleSources: visibleSources.length,
    readySources,
    emptySources,
    attentionSources,
    blockedSources,
    returnedItems,
    hashCoverage,
    idCoverage,
    readinessScore,
    strongestSource: sortedByScore[0]?.source ?? null,
    weakestSource: sortedByScore.at(-1)?.source ?? null,
    latestSafeId: latestSourceWithId?.latestId ?? null,
    latestSafeHash: latestSourceWithHash?.latestChecksum ?? null,
  };
};

const stateLabel = (state: SummaryState): string => {
  if (state === 'blocked') return 'نیازمند توجه فوری';
  if (state === 'attention') return 'قابل اتکا با مرور مدیریتی';
  return 'پایدار و خواندنی';
};

const stateClassName = (state: SummaryState): string => {
  if (state === 'blocked') return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/25 dark:text-rose-200 dark:ring-rose-900/70';
  if (state === 'attention') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/70';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70';
};

const executiveNarrative = (summary: ExecutiveSummary): string => {
  if (summary.visibleSources === 0) return 'با فیلتر فعلی هیچ منبعی برای خلاصه مدیریتی قابل مشاهده نیست.';
  if (summary.blockedSources > 0) return 'حداقل یک منبع خواندنی با خطا یا محدودیت دسترسی همراه است و قبل از اتکا به گزارش باید مرور شود.';
  if (summary.attentionSources > 0 || summary.emptySources > 0) return 'داده‌ها خواندنی هستند، اما بخشی از منابع خالی‌اند یا شناسه/هش امن کامل ندارند و بهتر است توسط مدیر مرور شوند.';
  return 'همه منابع قابل مشاهده در وضعیت خواندنی پایدار هستند و شناسه یا هش امن برای مرور مدیریتی ارائه می‌کنند.';
};

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
    <div className="text-lg font-black text-slate-950 dark:text-white">{value}</div>
    <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400 dark:text-slate-500">{helper}</div>
  </div>
);

const SourceSnapshot = ({ title, source }: { title: string; source: MlOperatorRouteResult | null }) => (
  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
    <div className="mb-2 text-[11px] font-black text-slate-400">{title}</div>
    {source ? (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-slate-950 dark:text-white">{routeLabels[source.key] || source.label}</span>
          <MlOperatorStatusChip state={source.state} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <MetricCard label="رکورد" value={toFaNumber(source.count)} helper="قابل مشاهده" />
          <MetricCard label="امتیاز" value={`${toFaNumber(sourceScore(source))}٪`} helper="محاسبه خواندنی" />
          <MetricCard label="هش امن" value={source.latestChecksum ? 'دارد' : 'ندارد'} helper="بدون نمایش مسیر" />
        </div>
        <div className="flex flex-wrap gap-2">
          <MlOperatorCopyButton value={source.latestId} label="کپی شناسه" compact />
          <MlOperatorCopyButton value={source.latestChecksum} label="کپی هش" compact />
        </div>
      </div>
    ) : (
      <div className="text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">منبعی با فیلتر فعلی در دسترس نیست.</div>
    )}
  </div>
);

export function MlOperatorExecutiveSummarySnapshot({
  sources,
  visibleSourceKeys,
  fetchedAt,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  fetchedAt: string | null;
}) {
  const summary = useMemo(() => buildExecutiveSummary(sources, visibleSourceKeys), [sources, visibleSourceKeys]);

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-executive-summary-anchor="read-only-executive-summary-snapshot"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-chart-pie" />
              خلاصه مدیریتی
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${stateClassName(summary.state)}`}>
              <i className="fa-solid fa-shield-halved" />
              {stateLabel(summary.state)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
              <i className="fa-solid fa-eye" />
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">نمای اجرایی وضعیت فراداده</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این خلاصه از منابع قابل مشاهده همین صفحه ساخته می‌شود و فقط وضعیت مدیریتی، پوشش شناسه، پوشش هش و تازگی دریافت را نشان می‌دهد؛ هیچ داده‌ای ذخیره یا به عملیات فروشگاه اعمال نمی‌شود.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-4 xl:min-w-[640px]">
          <MetricCard label="امتیاز آمادگی" value={`${toFaNumber(summary.readinessScore)}٪`} helper="بر اساس منابع visible" />
          <MetricCard label="منبع قابل مشاهده" value={toFaNumber(summary.visibleSources)} helper="پس از فیلتر فعلی" />
          <MetricCard label="رکورد خواندنی" value={toFaNumber(summary.returnedItems)} helper="بدون عملیات اجرایی" />
          <MetricCard label="نیازمند توجه" value={toFaNumber(summary.attentionSources + summary.blockedSources)} helper="برای مرور مدیریتی" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-layer-group ml-2 text-slate-400" />
          {toFaNumber(summary.readySources)} منبع آماده، {toFaNumber(summary.emptySources)} منبع خالی و {toFaNumber(summary.blockedSources)} منبع نیازمند توجه فوری در نمای فعلی دیده می‌شود.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-fingerprint ml-2 text-slate-400" />
          پوشش شناسه امن: {toFaNumber(summary.idCoverage)} از {toFaNumber(summary.visibleSources)} منبع؛ پوشش هش امن: {toFaNumber(summary.hashCoverage)} از {toFaNumber(summary.visibleSources)} منبع.
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-clock-rotate-left ml-2 text-slate-400" />
          زمان دریافت نمای مدیریتی: {fetchedAt ? new Date(fetchedAt).toLocaleString('fa-IR-u-ca-persian') : 'ثبت نشده'}.
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="text-[11px] font-black text-slate-400">برداشت مدیریتی</div>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{executiveNarrative(summary)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <MlOperatorCopyButton value={summary.latestSafeId} label="کپی شناسه امن" compact />
          <MlOperatorCopyButton value={summary.latestSafeHash} label="کپی هش امن" compact />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SourceSnapshot title="قوی‌ترین منبع قابل مشاهده" source={summary.strongestSource} />
        <SourceSnapshot title="ضعیف‌ترین منبع قابل مشاهده" source={summary.weakestSource} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
          <i className="fa-solid fa-ban ml-2" />
          بدون اجرای مدل
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
          <i className="fa-solid fa-lock ml-2" />
          بدون تغییر اطلاعات عملیاتی
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/60">
          <i className="fa-solid fa-database ml-2" />
          بدون ذخیره‌سازی جدید
        </div>
      </div>
    </section>
  );
}
