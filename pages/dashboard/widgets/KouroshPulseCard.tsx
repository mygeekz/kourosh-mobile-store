import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../utils/apiFetch';
import DashboardMetric from '../DashboardMetric';
import DashboardWidgetHeader from '../DashboardWidgetHeader';

type Severity = 'low' | 'medium' | 'high';

type PulseAlert = {
  id: string;
  type: 'inventory' | 'sales' | 'installments' | 'customers';
  severity: Severity;
  title: string;
  reason: string;
  count: number;
  relatedModule: 'inventory' | 'sales' | 'installments' | 'customers';
  href?: string;
};

type PulsePayload = {
  displayName: string;
  subtitle: string;
  analysisState: 'alerts' | 'stable' | 'insufficient';
  summary: { totalAlerts: number; highestSeverity: Severity | null };
  alerts: PulseAlert[];
  signals: Array<{ id: string; status: 'alert' | 'stable' | 'insufficient' }>;
  inventoryObservation: {
    status: 'attention' | 'stable' | 'insufficient';
    summary: {
      observedItems: number;
      totalStockedUnits: number;
      lowStockItems: number;
      agingItems: number;
      recentlySoldProducts: number;
    };
    dataCoverage: {
      inventoryAvailable: boolean;
      datedInventoryCoveragePct: number;
      recentSalesHistoryAvailable: boolean;
    };
    items: Array<{
      id: string;
      title: string;
      stockQuantity: number;
      ageDays: number | null;
      severity: 'medium' | 'high';
      reason: string;
      href: '/products' | '/mobile-phones';
    }>;
  };
  inventoryMlAdvisory?: {
    status: 'available' | 'abstained';
    reason: string;
    metrics: { sampleCount: number; accuracy: number; recall: number } | null;
    items: Array<{
      productId: string;
      productName: string;
      probability: number;
      severity: 'low' | 'medium' | 'high';
      suggestedReviewQuantity: number;
      reason: string;
    }>;
  };
};

const moduleIcon: Record<PulseAlert['relatedModule'], string> = {
  inventory: 'fa-solid fa-boxes-stacked',
  sales: 'fa-solid fa-chart-line',
  installments: 'fa-solid fa-calendar-check',
  customers: 'fa-solid fa-user-group',
};

const severityTone: Record<Severity, 'sky' | 'amber' | 'rose'> = {
  high: 'rose',
  medium: 'amber',
  low: 'sky',
};

const severityLabel: Record<Severity, string> = {
  high: 'زیاد',
  medium: 'متوسط',
  low: 'کم',
};

type Props = { enabled: boolean };

export default function KouroshPulseCard({ enabled }: Props) {
  const [data, setData] = useState<PulsePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/intelligence/kourosh-pulse/dashboard-alerts');
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success || !body?.data) {
        throw new Error(body?.message || 'دریافت اعلان‌ها ناموفق بود.');
      }
      setData(body.data as PulsePayload);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'امکان دریافت اعلان‌ها وجود ندارد.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleAlerts = (data?.alerts || []).slice(0, 5);
  const insufficientCount = data?.signals.filter((signal) => signal.status === 'insufficient').length || 0;
  const inventory = data?.inventoryObservation;
  const inventoryAttentionCount = inventory
    ? inventory.summary.lowStockItems + inventory.summary.agingItems
    : 0;
  const state = loading ? 'loading' : error ? 'error' : data?.analysisState || 'insufficient';

  return (
    <section
      dir="rtl"
      data-kourosh-pulse-card="true"
      data-kourosh-pulse-state={state}
      className="app-dashboard-surface app-dashboard-pulse"
      aria-label="نبض کوروش"
    >
      <div className="app-dashboard-surface__header">
        <DashboardWidgetHeader
          title="نبض کوروش"
          subtitle="اعلان‌های هوشمند فروشگاه • فقط خواندنی"
          icon="fa-solid fa-wave-square"
          action={data ? (
            <span className="app-dashboard-status" data-tone={data.analysisState === 'alerts' ? 'rose' : 'emerald'}>
              {data.analysisState === 'alerts'
                ? `${data.summary.totalAlerts.toLocaleString('fa-IR')} هشدار`
                : 'پایدار'}
            </span>
          ) : null}
        />
      </div>

      <div className="app-dashboard-surface__body app-dashboard-widget-stack">
        {loading ? (
          <div className="app-dashboard-loading" data-kourosh-pulse-loading="true">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>در حال دریافت نبض فروشگاه…</span>
          </div>
        ) : error ? (
          <div className="app-dashboard-empty" data-kourosh-pulse-error="true">
            <span className="app-dashboard-empty__icon"><i className="fa-solid fa-circle-exclamation" /></span>
            <strong>دریافت نبض کوروش انجام نشد</strong>
            <span>{error}</span>
            <button type="button" data-skip-global-button="true" className="app-dashboard-text-button" onClick={() => void load()}>
              تلاش دوباره
            </button>
          </div>
        ) : data ? (
          <>
            <div className="app-dashboard-metric-strip" data-columns="3" data-kourosh-pulse-summary="true">
              <DashboardMetric
                compact
                label="هشدارهای فعال"
                value={data.summary.totalAlerts.toLocaleString('fa-IR')}
                icon="fa-solid fa-triangle-exclamation"
                tone={data.summary.totalAlerts > 0 ? 'rose' : 'emerald'}
              />
              <DashboardMetric
                compact
                label="موجودی نیازمند توجه"
                value={inventory ? inventoryAttentionCount.toLocaleString('fa-IR') : '—'}
                icon="fa-solid fa-boxes-stacked"
                tone={inventoryAttentionCount > 0 ? 'amber' : 'emerald'}
              />
              <DashboardMetric
                compact
                label="پوشش تاریخ موجودی"
                value={inventory ? `${inventory.dataCoverage.datedInventoryCoveragePct.toLocaleString('fa-IR')}٪` : '—'}
                icon="fa-solid fa-chart-simple"
                tone="sky"
              />
            </div>

            {data.analysisState === 'alerts' && visibleAlerts.length > 0 ? (
              <div className="app-dashboard-list" data-kourosh-pulse-alerts="true">
                {visibleAlerts.map((alert) => {
                  const row = (
                    <>
                      <span className="app-dashboard-list-row__icon" data-tone={severityTone[alert.severity]}>
                        <i className={moduleIcon[alert.relatedModule]} />
                      </span>
                      <span className="app-dashboard-list-row__content">
                        <span className="app-dashboard-list-row__title">{alert.title}</span>
                        <span className="app-dashboard-list-row__description">{alert.reason}</span>
                      </span>
                      <span className="app-dashboard-status" data-tone={severityTone[alert.severity]}>
                        {severityLabel[alert.severity]}
                      </span>
                    </>
                  );
                  return alert.href ? (
                    <Link key={alert.id} to={alert.href} className="app-dashboard-list-row app-dashboard-list-row--link">
                      {row}
                    </Link>
                  ) : (
                    <div key={alert.id} className="app-dashboard-list-row">{row}</div>
                  );
                })}
              </div>
            ) : data.analysisState === 'stable' ? (
              <div className="app-dashboard-state" data-tone="emerald" data-kourosh-pulse-empty="stable">
                <span className="app-dashboard-state__icon"><i className="fa-solid fa-check" /></span>
                <span><strong>وضعیت فعلی پایدار است</strong><small>فعلاً اعلان مهمی برای بررسی وجود ندارد.</small></span>
              </div>
            ) : (
              <div className="app-dashboard-state" data-kourosh-pulse-empty="insufficient">
                <span className="app-dashboard-state__icon"><i className="fa-solid fa-chart-simple" /></span>
                <span><strong>داده کافی برای تحلیل هوشمند وجود ندارد</strong><small>بعد از ثبت فروش و موجودی بیشتر، نبض کوروش اعلان‌های دقیق‌تری نمایش می‌دهد.</small></span>
              </div>
            )}

            {inventory ? (
              <details className="app-dashboard-disclosure" data-kourosh-pulse-inventory-observation={inventory.status}>
                <summary>
                  <span className="app-dashboard-disclosure__identity">
                    <i className="fa-solid fa-boxes-stacked" />
                    <span><strong>مشاهده جزئیات موجودی</strong><small>موارد مهم بدون اقدام خودکار</small></span>
                  </span>
                  <span className="app-dashboard-disclosure__status">
                    <span className="app-dashboard-status" data-tone={inventory.status === 'attention' ? 'amber' : inventory.status === 'stable' ? 'emerald' : 'neutral'}>
                      {inventory.status === 'attention' ? 'نیازمند توجه' : inventory.status === 'stable' ? 'پایدار' : 'داده ناکافی'}
                    </span>
                    <i className="fa-solid fa-chevron-down" />
                  </span>
                </summary>
                <div className="app-dashboard-disclosure__body">
                  {inventory.status === 'insufficient' ? (
                    <div className="app-dashboard-empty app-dashboard-empty--compact">داده کافی برای مشاهده موجودی ثبت نشده است.</div>
                  ) : inventory.items.length > 0 ? (
                    <div className="app-dashboard-list app-dashboard-list--compact">
                      {inventory.items.slice(0, 3).map((item) => (
                        <Link key={item.id} to={item.href} className="app-dashboard-list-row app-dashboard-list-row--link">
                          <span className="app-dashboard-list-row__content">
                            <span className="app-dashboard-list-row__title">{item.title}</span>
                            <span className="app-dashboard-list-row__description">{item.reason}</span>
                          </span>
                          <span className="app-dashboard-status" data-tone={item.severity === 'high' ? 'rose' : 'amber'}>
                            {item.stockQuantity.toLocaleString('fa-IR')} عدد
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="app-dashboard-state" data-tone="emerald">مورد مهمی برای موجودی دیده نشد.</div>
                  )}
                </div>
              </details>
            ) : null}

            {data.inventoryMlAdvisory ? (
              <details className="app-dashboard-disclosure" data-kourosh-pulse-ml-advisory={data.inventoryMlAdvisory.status}>
                <summary>
                  <span className="app-dashboard-disclosure__identity">
                    <i className="fa-solid fa-brain" />
                    <span><strong>مشاور ML موجودی</strong><small>پیشنهاد خواندنی، بدون ثبت تغییر</small></span>
                  </span>
                  <span className="app-dashboard-disclosure__status"><i className="fa-solid fa-chevron-down" /></span>
                </summary>
                <div className="app-dashboard-disclosure__body">
                  {data.inventoryMlAdvisory.status === 'available' ? (
                    <div className="app-dashboard-list app-dashboard-list--compact">
                      {data.inventoryMlAdvisory.items
                        .filter((item) => item.severity !== 'low')
                        .slice(0, 3)
                        .map((item) => (
                          <Link key={item.productId} to="/products" className="app-dashboard-list-row app-dashboard-list-row--link">
                            <span className="app-dashboard-list-row__content">
                              <span className="app-dashboard-list-row__title">{item.productName}</span>
                              <span className="app-dashboard-list-row__description">{item.reason}</span>
                            </span>
                            <span className="app-dashboard-list-row__aside">
                              <strong>{(item.probability * 100).toLocaleString('fa-IR', { maximumFractionDigits: 0 })}٪</strong>
                              <span>بررسی خرید {item.suggestedReviewQuantity.toLocaleString('fa-IR')}</span>
                            </span>
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <p className="app-dashboard-caption">{data.inventoryMlAdvisory.reason}</p>
                  )}
                </div>
              </details>
            ) : null}

            {data.analysisState === 'alerts' && insufficientCount > 0 ? (
              <p className="app-dashboard-caption" data-kourosh-pulse-partial-data="true">
                داده کافی برای تحلیل {insufficientCount.toLocaleString('fa-IR')} سیگنال وجود ندارد.
              </p>
            ) : null}
          </>
        ) : (
          <div className="app-dashboard-state" data-kourosh-pulse-empty="unauthenticated">
            <span className="app-dashboard-state__icon"><i className="fa-solid fa-lock" /></span>
            <span><strong>نبض کوروش در دسترس نیست</strong><small>برای مشاهده تحلیل فروشگاه وارد حساب کاربری شوید.</small></span>
          </div>
        )}
      </div>
    </section>
  );
}
