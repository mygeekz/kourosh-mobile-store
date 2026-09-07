import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { REPORT_CENTERS, getVisibleCenterTabs } from '../app/reports/reportCenters';
import { useAuth } from '../contexts/AuthContext';

const PROFIT_LABELS = [
  'سود لوازم',
  'سود نقدی گوشی',
  'سود اقساطی گوشی',
  'سود فروش اعتباری',
];

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const visibleTabCount = useMemo(
    () => REPORT_CENTERS.reduce(
      (sum, center) => sum + getVisibleCenterTabs(center, currentUser?.roleName).length,
      0,
    ),
    [currentUser?.roleName],
  );

  return (
    <div className="space-y-4" data-ui-report-centers="8">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-primary">
              <span>۸ مرکز کاربردی</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{visibleTabCount.toLocaleString('fa-IR')} نمای تخصصی</span>
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white sm:text-xl">گزارش موردنیاز را از سؤال مدیریتی انتخاب کنید</h2>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              گزارش‌های مشابه در یک مرکز قرار گرفته‌اند؛ جزئیات هر مرکز از طریق تب‌های همان صفحه در دسترس است.
            </p>
          </div>

          <Link
            to="/reports/financial-overview"
            className="flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-[18px] border border-primary/25 bg-primary/5 px-4 text-sm font-black text-primary transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10"
          >
            <i className="fa-solid fa-chart-pie" aria-hidden="true" />
            مشاهده سود مدیر
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="چهار شاخص سود مدیر">
          {PROFIT_LABELS.map((label) => (
            <div key={label} className="min-h-[44px] rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-black leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="مراکز گزارش‌ها">
        {REPORT_CENTERS.map((center, index) => {
          const tabs = getVisibleCenterTabs(center, currentUser?.roleName);
          return (
            <Link
              key={center.id}
              to={center.path}
              className="group flex min-h-[230px] flex-col rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/75 dark:hover:border-primary/35"
              data-report-center={center.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-slate-400 dark:text-slate-500">مرکز {(index + 1).toLocaleString('fa-IR')}</span>
                <i className={`fa-solid ${center.icon} text-lg text-slate-500 transition group-hover:text-primary dark:text-slate-300`} aria-hidden="true" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-950 group-hover:text-primary dark:text-white">{center.title}</h3>
              <p className="mt-2 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">{center.managerQuestion}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{center.description}</p>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{tabs.length.toLocaleString('fa-IR')} تب مرتبط</span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-primary">
                  ورود
                  <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex items-start gap-3 text-xs leading-6 text-slate-600 dark:text-slate-300">
          <i className="fa-solid fa-link mt-1 shrink-0 text-slate-400" aria-hidden="true" />
          <p>آدرس‌های قبلی گزارش‌ها حفظ شده‌اند؛ لینک‌های ذخیره‌شده و دسترسی‌های قدیمی همچنان به همان داده و محاسبه می‌رسند.</p>
        </div>
      </section>
    </div>
  );
};

export default Reports;
