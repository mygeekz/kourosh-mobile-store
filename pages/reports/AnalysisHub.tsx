// pages/reports/AnalysisHub.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationMessage } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Notification from '../../components/Notification';
import ModernReportShell from '../../components/reports/ModernReportShell';

type Item = {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  count: number;
  accent?: string; // tailwind gradient
};

const ITEMS: Item[] = [
  {
    id: 'profitability',
    title: 'سودآوری کالاها',
    description: 'سود ناخالص، حاشیه سود و کالاهای برتر/ضعیف را با جزئیات ببینید.',
    icon: 'fa-solid fa-sack-dollar',
    path: '/reports/analysis/profitability',
    count: 4,
    accent: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'inventory',
    title: 'سلامت موجودی',
    description: 'کالاهای داغ/عادی/راکد بر اساس سرعت فروش و موجودی فعلی.',
    icon: 'fa-solid fa-boxes-stacked',
    path: '/reports/analysis/inventory',
    count: 3,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'suggestions',
    title: 'پیشنهادهای هوشمند خرید',
    description: 'کالاهای رو به اتمام + تعداد پیشنهادی برای خرید با اولویت‌بندی.',
    icon: 'fa-solid fa-lightbulb',
    path: '/reports/analysis/suggestions',
    count: 2,
    accent: 'from-rose-500 to-orange-500',
  },
  {
    id: 'phone-sales',
    title: 'گزارش فروش نقدی موبایل',
    description: 'خرید/فروش/سود گوشی‌های موبایل در فروش‌های عادی (نقدی و اعتباری).',
    icon: 'fa-solid fa-cash-register',
    path: '/reports/phone-sales',
    count: 1,
    accent: 'from-sky-500 to-blue-600',
  },
  {
    id: 'phone-installment-sales',
    title: 'گزارش فروش اقساطی موبایل',
    description: 'گزارش مالی فروش اقساطی موبایل به همراه سود کل هر معامله.',
    icon: 'fa-solid fa-file-invoice-dollar',
    path: '/reports/phone-installment-sales',
    count: 1,
    accent: 'from-fuchsia-500 to-purple-600',
  },
];

function Card({ item }: { item: Item }) {
  return (
    <Link
      to={item.path}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/30"
    >
      <div className={`pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${item.accent ?? 'from-primary-500 to-primary-700'} opacity-15 blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.accent ?? 'from-primary-500 to-primary-700'} text-white shadow-sm`}>
                <i className={item.icon} />
              </div>
              <div className="min-w-0 text-[15px] font-extrabold leading-6 text-slate-900 dark:text-slate-100 truncate">
                {item.title}
              </div>
            </div>
            <div className="shrink-0 rounded-full border border-slate-200/70 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {item.count.toLocaleString('fa-IR')} گزارش
            </div>
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {item.description}
          </div>
        </div>
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm transition group-hover:scale-[1.03] dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
          <i className="fa-solid fa-arrow-left" />
        </div>
      </div>
    </Link>
  );
}

const AnalysisHub: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
    }
  }, [currentUser, navigate]);

  const items = useMemo(() => ITEMS, []);

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="مرکز تحلیل مدیریتی"
        subtitle="دریل‌داون‌های تصمیم‌ساز برای سود، انبار و فروش. اینجا گزارش مادر نیست؛ مسیر تحلیل عمیق و اقدام عملی است."
        icon="fa-solid fa-brain"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id} item={it} />
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <div className="font-bold text-slate-800 dark:text-slate-100">مرز این بخش</div>
            <div className="mt-1 leading-7">
              این صفحه برای تحلیل است، نه صورت‌مالی رسمی. گزارش‌های مادر مثل نمای کلی مالی و ممیزی اختلاف در مسیر گزارش‌های اصلی باقی می‌مانند تا drill-down با گزارش سطح بالا قاطی نشود.
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { title: 'نمای کلی مالی', to: '/reports/financial-overview', icon: 'fa-chart-pie' },
              { title: 'فروش و سود', to: '/reports/sales-summary', icon: 'fa-chart-line' },
              { title: 'ممیزی اختلاف', to: '/reports/financial-audit', icon: 'fa-clipboard-check' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-right text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <i className={`fa-solid ${item.icon}`} />
                  <span>{item.title}</span>
                </div>
                <div className="mt-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">بازگشت به گزارش مادر</div>
              </Link>
            ))}
          </div>
        </div>
      </ModernReportShell>
    </div>
  );
};

export default AnalysisHub;
