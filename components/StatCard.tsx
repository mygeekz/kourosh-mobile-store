import React from 'react';

type Accent = 'indigo' | 'emerald' | 'blue' | 'purple' | 'amber' | 'teal' | 'rose' | 'cyan';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: string;                 // مثل: "fa-solid fa-box-open"
  trendText?: string;
  hint?: string;
  variant?: 'fancy' | 'plain';
  accent?: Accent;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;           // ← اگر true باشد: گرادیان زنده + شِیمِر فعال می‌شود

  // props قدیمی برای plain
  iconBgColor?: string;
  iconTextColor?: string;
}

const GRADIENTS: Record<Accent, string> = {
  indigo:  'from-indigo-600 to-purple-600',
  emerald: 'from-emerald-600 to-teal-600',
  blue:    'from-sky-600 to-indigo-600',
  purple:  'from-fuchsia-600 to-purple-600',
  amber:   'from-amber-600 to-orange-600',
  teal:    'from-teal-600 to-cyan-600',
  rose:    'from-rose-600 to-pink-600',
  cyan:    'from-cyan-600 to-blue-600',
};

const SIZES = {
  sm: { wrap: 'p-4 sm:p-5 min-h-[120px]', title: 'text-[13px] sm:text-sm', meta: 'text-[9px] sm:text-xs', value: 'text-2xl sm:text-[16px]', iconBox: 'w-11 h-11 sm:w-12 sm:h-12', icon: 'text-lg sm:text-xl' },
  md: { wrap: 'p-5 sm:p-6 min-h-[132px]', title: 'text-sm sm:text-[15px]',  meta: 'text-xs sm:text-[9px]', value: 'text-[18px] sm:text-3xl',   iconBox: 'w-12 h-12 sm:w-14 sm:h-14', icon: 'text-xl sm:text-2xl' },
  lg: { wrap: 'p-6 sm:p-7 min-h-[144px]', title: 'text-sm sm:text-base',    meta: 'text-xs sm:text-sm',   value: 'text-[15px] sm:text-[12px]', iconBox: 'w-12 h-12 sm:w-14 sm:h-14', icon: 'text-xl sm:text-2xl' },
} as const;

const TOP_PAD: Record<'sm'|'md'|'lg', string> = {
  sm: 'pt-8',
  md: 'pt-10',
  lg: 'pt-10',
};

const ICON_POS = 'absolute top-3 left-3 sm:top-4 sm:left-4';

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trendText,
  hint,
  variant = 'plain',
  accent = 'indigo',
  size = 'sm',
  className = '',
  animated = false,            // ← پیش‌فرض: خاموش
  iconBgColor = 'bg-gray-100 dark:bg-gray-900/40',
  iconTextColor = 'text-gray-700 dark:text-gray-200',
}) => {
  const sz = SIZES[size];

  if (variant === 'fancy') {
    const gradient = GRADIENTS[accent] || GRADIENTS.indigo;

    return (
      <div
        data-ui-surface="stat-card"
        data-ui-card="true"
        data-ui-card-kind="stat"
        data-ui-card-variant="fancy"
        className={[
          'relative overflow-hidden rounded-2xl app-stat-card',
          sz.wrap,
          'bg-gradient-to-br',
          gradient,
          'text-white shadow-lg h-full',
          className,
          animated ? 'animate-gradient' : '', // ← گرادیان زنده
        ].join(' ')}
      >
        {/* شِیمِر عبوری (فقط وقتی animated=true) */}
        {animated && (
          <div
            className="pointer-events-none absolute -inset-2 opacity-50 animate-shine"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.25) 50%, rgba(255,255,255,0) 100%)',
              transform: 'skewX(-20deg)',
            }}
          />
        )}

        {/* تزئین‌های لطیف */}
        <div className="pointer-events-none absolute -left-10 -top-10 w-28 h-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-14 -bottom-14 w-40 h-40 rounded-full bg-white/10" />

        {/* آیکن: بالا-چپ */}
        <div className={`${ICON_POS} ${sz.iconBox} rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center`}>
          <i className={`${icon} ${sz.icon}`} />
        </div>

        {/* محتوا: وسط کارت + فاصله از بالا تا به آیکن نخورد */}
        <div className={`h-full flex flex-col justify-center items-end text-right ${TOP_PAD[size]} min-w-0`}>
          {trendText && <div className={`${sz.meta} opacity-90`}>{trendText}</div>}
          <h4 className={`${sz.title} font-semibold opacity-95 mt-0.5 truncate`}>{title}</h4>
          <div className={`${sz.value} font-extrabold tracking-tight mt-2 whitespace-nowrap overflow-hidden text-ellipsis`}>
            {value}
          </div>
          {hint && <div className={`${sz.meta} opacity-95 mt-2 truncate`}>{hint}</div>}
        </div>
      </div>
    );
  }

  // نسخه ساده (plain)
  return (
    <div data-ui-surface="stat-card" data-ui-card="true" data-ui-card-kind="stat" data-ui-card-variant="plain" className={`summary-card summary-card--plain premium-stat-card app-stat-card bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] ${sz.wrap} h-full ${className}`}>
      <div className="summary-card__glow" aria-hidden="true" />
      {/* آیکن: بالا-چپ */}
      <div className={`${ICON_POS} ${sz.iconBox} summary-card__icon premium-stat-card__icon ${iconBgColor} ${iconTextColor} flex items-center justify-center`}>
        <i className={`${icon} ${sz.icon}`} />
      </div>

      {/* محتوا: وسط کارت + فاصله‌ی بالا */}
      <div className={`h-full flex flex-col justify-center items-end text-right ${TOP_PAD[size]} min-w-0`}>
        {trendText && <div className={`${SIZES[size].meta} text-slate-500 dark:text-gray-400`}>{trendText}</div>}
        <h4 className={`${SIZES[size].title} font-semibold text-slate-800 dark:text-gray-200 mt-0.5 truncate`}>{title}</h4>
        <div className={`${SIZES[size].value} font-extrabold text-slate-950 dark:text-gray-100 tracking-tight mt-2 whitespace-nowrap overflow-hidden text-ellipsis`}>
          {value}
        </div>
        {hint && <div className={`${SIZES[size].meta} text-slate-500 dark:text-gray-400 mt-2 truncate`}>{hint}</div>}
      </div>
    </div>
  );
};

export default StatCard;
