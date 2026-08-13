import type { DashboardWidgetProps } from '../types';
import DashboardMetric from '../DashboardMetric';
import DashboardWidgetHeader from '../DashboardWidgetHeader';

export default function AssetWidget({ ctx, container }: DashboardWidgetProps) {
  const compact = (container.width || 0) > 0 && (container.width || 0) < 520;

  return (
    <section data-ui-dashboard-widget-kind="asset" className="app-dashboard-widget app-dashboard-asset-widget">
      <div className="app-dashboard-widget__header">
        <DashboardWidgetHeader
          title="ارزش موجودی"
          subtitle="برآورد اقلام فعال انبار و ویترین"
          icon="fa-solid fa-vault"
          compact={compact}
        />
      </div>
      <div className="app-dashboard-widget__body app-dashboard-widget-stack">
        <div className="app-dashboard-asset-widget__total">
          <span>ارزش کل موجودی</span>
          <strong>{ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetValue)}</strong>
        </div>
        <div className="app-dashboard-metric-strip" data-columns={compact ? '1' : '3'}>
          <DashboardMetric compact label="ارزش گوشی‌ها" value={ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.phonesValue)} icon="fa-solid fa-mobile-screen-button" tone="sky" />
          <DashboardMetric compact label="ارزش محصولات" value={ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.productsValue)} icon="fa-solid fa-box-open" tone="violet" />
          <DashboardMetric compact label="اقلام فعال" value={ctx.assetLoading ? '—' : ctx.formatNumber(ctx.assetBreakdown.itemsCount)} icon="fa-solid fa-layer-group" tone="emerald" />
        </div>
      </div>
    </section>
  );
}
