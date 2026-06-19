import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageShell from '../components/ui/PageShell';

/**
 * هاب فروش
 * - اگر از صفحات دیگر با state.prefillItem به /sales آمده باشیم،
 *   به صورت خودکار به فروش نقدی هدایت می‌شود تا رفتار قبلی حفظ شود.
 */
type SalesAction = {
  title: string;
  subtitle: string;
  icon: string;
  to: string;
  tone: 'cash' | 'credit' | 'installment' | 'expense' | 'invoice';
  featured?: boolean;
};

const toneMap: Record<
  SalesAction['tone'],
  {
    icon: string;
    soft: string;
    accent: string;
    cta: string;
  }
> = {
  cash: {
    icon: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
    soft: 'from-emerald-50/80 via-white to-white dark:from-emerald-950/15 dark:via-slate-950 dark:to-slate-950',
    accent: 'bg-emerald-500',
    cta: 'text-emerald-700 border-emerald-100 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
  },
  credit: {
    icon: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300',
    soft: 'from-blue-50/80 via-white to-white dark:from-blue-950/15 dark:via-slate-950 dark:to-slate-950',
    accent: 'bg-blue-500',
    cta: 'text-blue-700 border-blue-100 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300',
  },
  installment: {
    icon: 'border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300',
    soft: 'from-cyan-50/80 via-white to-white dark:from-cyan-950/15 dark:via-slate-950 dark:to-slate-950',
    accent: 'bg-cyan-500',
    cta: 'text-cyan-700 border-cyan-100 bg-cyan-50 group-hover:bg-cyan-600 group-hover:text-white dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300',
  },
  expense: {
    icon: 'border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300',
    soft: 'from-orange-50/80 via-white to-white dark:from-orange-950/15 dark:via-slate-950 dark:to-slate-950',
    accent: 'bg-orange-500',
    cta: 'text-orange-700 border-orange-100 bg-orange-50 group-hover:bg-orange-600 group-hover:text-white dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300',
  },
  invoice: {
    icon: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300',
    soft: 'from-violet-50/80 via-white to-white dark:from-violet-950/15 dark:via-slate-950 dark:to-slate-950',
    accent: 'bg-violet-500',
    cta: 'text-violet-700 border-violet-100 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300',
  },
};

const salesActions: SalesAction[] = [
  {
    title: 'فروش نقدی',
    subtitle: 'ثبت سریع فروش و صدور فاکتور نقدی',
    icon: 'fa-solid fa-wallet',
    to: '/sales/cash',
    tone: 'cash',
    featured: true,
  },
  {
    title: 'فروش اعتباری',
    subtitle: 'ثبت فروش اعتباری و ایجاد حساب مشتری',
    icon: 'fa-solid fa-user-check',
    to: '/sales/cash?mode=credit',
    tone: 'credit',
  },
  {
    title: 'فروش اقساطی',
    subtitle: 'ثبت قرارداد اقساط و پیگیری پرداخت‌ها',
    icon: 'fa-solid fa-calendar-check',
    to: '/installment-sales',
    tone: 'installment',
  },
  {
    title: 'ثبت هزینه',
    subtitle: 'ثبت هزینه‌های فروشگاه و کنترل سود و زیان',
    icon: 'fa-solid fa-file-invoice-dollar',
    to: '/sales/expenses',
    tone: 'expense',
  },
  {
    title: 'فاکتورها',
    subtitle: 'مشاهده، جست‌وجو و مدیریت فاکتورهای فروش',
    icon: 'fa-solid fa-file-lines',
    to: '/invoices',
    tone: 'invoice',
  },
];

const SalesActionCard: React.FC<{ action: SalesAction }> = ({ action }) => {
  const tone = toneMap[action.tone];

  return (
    <Link
      to={action.to}
      className={[
        'group relative flex min-h-[190px] flex-col overflow-hidden rounded-[26px] border border-slate-200/85 bg-gradient-to-br px-5 py-5 text-right shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] transition-all duration-200 hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-[0_24px_54px_-38px_rgba(15,23,42,0.42)] dark:border-slate-800/85',
        tone.soft,
        action.featured ? 'ring-1 ring-emerald-100/80 dark:ring-emerald-900/40' : '',
      ].join(' ')}
    >
      <span className={['absolute inset-x-6 top-0 h-1.5 rounded-b-full', tone.accent].join(' ')} />

      <div className="flex items-start justify-between gap-4">
        <span className={['grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[16px] border text-[18px] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.32)]', tone.icon].join(' ')}>
          <i className={action.icon} />
        </span>
        {action.featured ? (
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
            پرکاربرد
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-[1.25rem] font-black tracking-tight text-slate-950 dark:text-slate-50">{action.title}</h3>
        <p className="mt-2 max-w-[15rem] text-[13px] font-medium leading-6 text-slate-500 dark:text-slate-400">{action.subtitle}</p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500">ورود به بخش</span>
        <span className={['grid h-8 w-8 place-items-center rounded-full border transition-all duration-200 group-hover:-translate-x-0.5', tone.cta].join(' ')}>
          <i className="fa-solid fa-arrow-left text-sm" />
        </span>
      </div>
    </Link>
  );
};

const SalesHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  useEffect(() => {
    if (location?.state?.prefillItem) {
      navigate('/sales/cash', { state: location.state, replace: true });
    }
  }, [location?.state, navigate]);

  return (
    <PageShell
      title="فروش"
      description="ثبت اطلاعات و مدیریت فروش"
      icon={<i className="fa-solid fa-cart-shopping" />}
      hideAutoHeader
    >
      <div className="sales-hub-foundation mx-auto max-w-7xl px-3 sm:px-4" dir="rtl" data-ui-sales-page="hub">
        <section className="pt-2 md:pt-4">
          <div className="flex flex-col gap-2 text-right md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/82 dark:text-slate-400">
                <i className="fa-solid fa-cart-shopping text-blue-500" />
                <span>مرکز عملیات فروش</span>
              </div>
              <h1 className="mt-3 text-[1.85rem] font-black tracking-tight text-slate-950 dark:text-slate-50 md:text-[2.25rem]">فروش</h1>
              <p className="mt-2 max-w-2xl text-[14px] font-medium leading-7 text-slate-500 dark:text-slate-400">
                ثبت سریع فروش نقدی، اعتباری، اقساطی، هزینه‌ها و مدیریت فاکتورهای فروش در یک نمای خلوت و کاربردی.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-200/85 bg-white shadow-[0_24px_56px_-44px_rgba(15,23,42,0.34)] dark:border-slate-800/90 dark:bg-slate-950/82">
          <div className="grid min-h-[152px] grid-cols-1 items-center gap-5 px-5 py-6 md:grid-cols-[116px_minmax(0,1fr)] md:px-8 lg:px-10">
            <div className="flex justify-center md:justify-start">
              <div className="relative grid h-[82px] w-[82px] place-items-center rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 text-blue-600 shadow-[0_24px_52px_-36px_rgba(59,130,246,0.44)] dark:border-blue-900/60 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-slate-950/20 dark:text-blue-300">
                <span className="absolute inset-x-5 bottom-3 h-4 rounded-full bg-blue-200/40 blur-xl dark:bg-blue-500/10" />
                <i className="fa-solid fa-cart-shopping relative text-[31px]" />
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">
                مدیریت ساده و سریع فروش
              </h2>
              <p className="mt-3 max-w-3xl text-[14px] font-medium leading-7 text-slate-500 dark:text-slate-400">
                مسیرهای اصلی فروشگاه در همین صفحه آماده‌اند؛ بدون جدول‌های اضافه، بدون گزارش‌های مزاحم و بدون شلوغی عملیاتی.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6" aria-label="عملیات اصلی فروش">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="text-right">
              <h2 className="text-[1.2rem] font-black tracking-tight text-slate-950 dark:text-slate-50">عملیات اصلی</h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                پنج مسیر اصلی فروش برای ثبت و پیگیری سریع عملیات روزانه.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" data-ui-sales-hub-grid="true">
            {salesActions.map((action) => (
              <SalesActionCard key={action.title} action={action} />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
};

export default SalesHub;
