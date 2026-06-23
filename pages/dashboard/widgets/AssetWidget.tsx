import type { DashboardWidgetProps } from '../types';

export default function AssetWidget({ ctx, container }: DashboardWidgetProps) {
  const compact = container.width > 0 && container.width < 420;
  const stacked = container.width > 0 && container.width < 560;

  return (
    <div data-ui-dashboard-widget-kind="asset" className={[
      'premium-data-shell h-full p-4 text-slate-900 dark:text-slate-100',
      compact ? 'p-4' : 'p-5',
    ].join(' ')}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-violet-400/80 via-indigo-400/70 to-sky-400/70" />
      <div className="pointer-events-none absolute -top-10 left-8 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        <div className={['flex items-start gap-3', stacked ? 'flex-col' : 'justify-between'].join(' ')}>
          <div className="text-right">
            <div className="flex items-center justify-end gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                <i className="fa-solid fa-vault text-base" />
              </span>
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">دارایی کل کالاها</div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">ارزش تقریبی تمام اقلام قابل فروش در انبار و ویترین</div>
              </div>
            </div>
          </div>

          <div className={['premium-stat-card bg-slate-50/80 dark:bg-slate-900/80', stacked ? 'w-full' : 'min-w-[220px]'].join(' ')}>
            <div className="premium-stat-card__label">ارزش کل موجودی</div>
            <div className={[compact ? 'text-[1.7rem]' : 'text-[2rem]', 'premium-stat-card__value leading-none'].join(' ')}>
              {ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetValue)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            {
              label: 'ارزش گوشی‌ها',
              value: ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.phonesValue),
              icon: 'fa-solid fa-mobile-screen-button',
            },
            {
              label: 'ارزش محصولات',
              value: ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.productsValue),
              icon: 'fa-solid fa-box-open',
            },
            {
              label: 'تعداد اقلام فعال',
              value: ctx.assetLoading ? '—' : ctx.formatNumber(ctx.assetBreakdown.itemsCount),
              icon: 'fa-solid fa-layer-group',
            },
          ].map((item) => (
            <div key={item.label} className="premium-stat-card bg-white dark:bg-slate-950/70 px-3 py-3">
              <div className="flex items-center justify-between gap-2 premium-stat-card__label">
                <span>{item.label}</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                  <i className={item.icon + ' text-[12px]'} />
                </span>
              </div>
              <div className="mt-2 text-sm font-black leading-6 text-slate-900 dark:text-slate-100 break-words">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
