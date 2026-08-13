import { formatExactNumberText } from '../../../utils/exactNumber';
import { useMemo } from 'react';
import { routeAccessMatrixByKey } from '../../../app/routes/routeAccessMatrix';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';

const toFaNumber = (value: number): string => formatExactNumberText(value);

const allowedRoleLabels: Record<string, string> = {
  Admin: 'مدیر کل',
  Manager: 'مدیر',
  Salesperson: 'فروشنده',
  Marketer: 'بازاریاب',
};

const sourceLabels: Record<MlOperatorOverviewRouteKey, string> = {
  comparisonSummaries: 'خلاصه مقایسه‌ها',
  importReceipts: 'رسیدهای ورود امن',
  receiptExports: 'خروجی رسیدها',
  exportPackages: 'بسته‌های خروجی',
  packageSnapshots: 'اسنپ‌شات‌های بسته',
};

type AssuranceLevel = 'locked' | 'review';

type AssuranceRow = {
  key: string;
  label: string;
  level: AssuranceLevel;
  value: string;
  helper: string;
};

const badgeClassName = (level: AssuranceLevel): string =>
  level === 'locked'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70'
    : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/70';

const badgeLabel = (level: AssuranceLevel): string => (level === 'locked' ? 'قفل خواندنی برقرار است' : 'نیازمند مرور مدیریتی');

const sameRoles = (roles: readonly string[], expected: readonly string[]): boolean => {
  if (roles.length !== expected.length) return false;
  return expected.every((role) => roles.includes(role));
};

const roleText = (roles: readonly string[]): string => roles.map((role) => allowedRoleLabels[role] || role).join('، ');

const buildVisibilityRows = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): AssuranceRow[] => {
  const matrixEntry = routeAccessMatrixByKey['reports-layout:ml-operator-overview'];
  const expectedRoles = ['Admin', 'Manager'] as const;
  const visibleKeySet = new Set(visibleSourceKeys);
  const visibleSources = sources.filter((source) => visibleKeySet.has(source.key));
  const rolesAreRestricted = Boolean(matrixEntry && sameRoles(matrixEntry.allowedRoles, expectedRoles));
  const featureFlagsAreRestricted = Boolean(matrixEntry?.featureFlags?.includes('smart_insights'));
  const sourceScopeIsVisibleOnly = visibleSources.length <= sources.length;
  const unsafeRoleIncluded = Boolean(matrixEntry?.allowedRoles?.some((role) => role === 'Salesperson' || role === 'Marketer'));

  return [
    {
      key: 'role-scope',
      label: 'دامنه نقش‌ها',
      level: rolesAreRestricted && !unsafeRoleIncluded ? 'locked' : 'review',
      value: matrixEntry ? roleText(matrixEntry.allowedRoles) : 'نامشخص',
      helper: 'این نما باید فقط برای مدیر کل و مدیر قابل مشاهده بماند و نقش فروش یا بازاریابی به آن اضافه نشود.',
    },
    {
      key: 'feature-scope',
      label: 'دامنه قابلیت',
      level: featureFlagsAreRestricted ? 'locked' : 'review',
      value: featureFlagsAreRestricted ? 'وابسته به قابلیت پایش هوشمند' : 'نیازمند بررسی قابلیت',
      helper: 'نمای اپراتور باید پشت قابلیت مدیریتی موجود باقی بماند و مسیر عمومی جدید نگیرد.',
    },
    {
      key: 'read-only-source-scope',
      label: 'دامنه منابع قابل مشاهده',
      level: sourceScopeIsVisibleOnly ? 'locked' : 'review',
      value: `${toFaNumber(visibleSources.length)} از ${toFaNumber(sources.length)} منبع`,
      helper: 'پنل دسترسی فقط همان منابعی را که بعد از فیلترهای فعلی قابل مشاهده‌اند بررسی می‌کند.',
    },
    {
      key: 'route-surface',
      label: 'سطح مسیرخوانی',
      level: 'locked',
      value: 'بدون مسیر جدید',
      helper: 'این بخش از همان صفحه و داده‌های بارگذاری‌شده استفاده می‌کند و مسیر بک‌اند یا مسیر صفحه تازه نمی‌سازد.',
    },
    {
      key: 'mutation-surface',
      label: 'سطح تغییرات عملیاتی',
      level: 'locked',
      value: 'بدون کنترل تغییر',
      helper: 'دکمه تأیید، فرم، ورودی، ذخیره‌سازی یا عملیات تغییر اطلاعات عملیاتی در این پنل وجود ندارد.',
    },
  ];
};

const visibleSourceText = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): string => {
  const visibleKeySet = new Set(visibleSourceKeys);
  const labels = sources.filter((source) => visibleKeySet.has(source.key)).map((source) => sourceLabels[source.key] || source.label);
  return labels.length > 0 ? labels.join('، ') : 'هیچ منبعی با فیلتر فعلی نمایش داده نمی‌شود';
};

export function MlOperatorAccessVisibilityAssurance({
  sources,
  visibleSourceKeys,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
}) {
  const rows = useMemo(() => buildVisibilityRows(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const lockedCount = rows.filter((row) => row.level === 'locked').length;
  const reviewCount = rows.length - lockedCount;

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-access-visibility-anchor="read-only-access-visibility-assurance"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-user-lock" />
              تضمین دسترسی و نمایش
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70">
              فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">مرور خواندنی دامنه دسترسی اپراتور</h2>
          <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
            این پنل تأیید می‌کند که نمای اپراتور در همان محدوده مدیریتی باقی مانده و نقش‌های غیرمجاز، مسیر تازه یا کنترل تغییر به آن اضافه نشده است.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-right">
          <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900/70">
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-200">{toFaNumber(lockedCount)}</div>
            <div className="mt-1 text-[11px] font-black text-emerald-700/80 dark:text-emerald-200/80">قفل برقرار</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-xl font-black text-slate-950 dark:text-white">{toFaNumber(reviewCount)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">نیازمند مرور</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:ring-slate-800">
        منابع قابل مشاهده با فیلتر فعلی: {visibleSourceText(sources, visibleSourceKeys)}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <article key={row.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-right dark:border-slate-800 dark:bg-slate-950/35">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">{row.label}</div>
                <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">{row.value}</div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${badgeClassName(row.level)}`}>
                {badgeLabel(row.level)}
              </span>
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{row.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
