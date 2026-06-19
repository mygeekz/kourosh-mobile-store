import React from 'react';
import type { PredictiveEnginePayload, SmartInsightPayload, MoneyFormatter, NumberFormatter, PercentFormatter, SeverityMetaMap, ShamsiFormatter } from './types/smartInsightContracts';
import { Link } from 'react-router-dom';

type PredictiveEngineSectionProps = {
  payload: SmartInsightPayload;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

function PredictiveEngineSection({
  payload,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
}: PredictiveEngineSectionProps) {
  if (!payload.predictiveEngine) return null;

  return (

      <section className="smart-predictive-v182" aria-label="پیش‌بینی مالی ۷ روز آینده">
        <div className="smart-predictive-v182__hero">
          <div className="smart-predictive-v182__confidence">
            <span className="smart-predictive-v182__confidence-icon"><i className="fa-solid fa-shield-halved" /></span>
            <div>
              <small>اعتماد پیش‌بینی</small>
              <strong>{num(payload.predictiveEngine.confidence).toLocaleString('fa-IR')}٪</strong>
              <em>{num(payload.predictiveEngine.confidence) >= 75 ? 'سطح بالا' : num(payload.predictiveEngine.confidence) >= 55 ? 'قابل اتکا' : 'نیازمند داده بیشتر'}</em>
            </div>
          </div>

          <div className="smart-predictive-v182__hero-copy">
            <span className="smart-predictive-v182__eyebrow">PREDICTIVE ENGINE <i className="fa-solid fa-wand-magic-sparkles" /></span>
            <h2>پیش‌بینی مالی ۷ روز آینده</h2>
            <p>داده‌های آینده‌نگر بر اساس روند فروش ۷ روزه، مقایسه با هفته قبل، نرخ مصرف کالا و وضعیت وصول اقساط محاسبه شده‌اند.</p>
          </div>

          <div className="smart-predictive-v182__hero-art" aria-hidden="true">
            <i className="fa-solid fa-chart-simple" />
            <span />
          </div>
        </div>

        <div className="smart-predictive-v182__kpis">
          <article className="smart-predictive-v182__kpi smart-predictive-v182__kpi--blue">
            <span><i className="fa-solid fa-credit-card" /></span>
            <small>فروش پیش‌بینی‌شده فردا</small>
            <strong>{money(payload.predictiveEngine.forecast?.tomorrowSales)}</strong>
            <em>{num(payload.predictiveEngine.forecast?.trendPct) >= 0 ? `↑ ${percent(Math.abs(num(payload.predictiveEngine.forecast?.trendPct)))} نسبت به روند` : `↓ ${percent(Math.abs(num(payload.predictiveEngine.forecast?.trendPct)))} نسبت به روند`}</em>
          </article>

          <article className="smart-predictive-v182__kpi smart-predictive-v182__kpi--indigo">
            <span><i className="fa-regular fa-calendar" /></span>
            <small>فروش ۷ روز آینده</small>
            <strong>{money(payload.predictiveEngine.forecast?.next7Sales)}</strong>
            <em>برآورد بازه آینده</em>
          </article>

          <article className="smart-predictive-v182__kpi smart-predictive-v182__kpi--green">
            <span><i className="fa-solid fa-arrow-trend-up" /></span>
            <small>روند نسبت به هفته قبل</small>
            <strong>{percent(payload.predictiveEngine.forecast?.trendPct)}</strong>
            <em>{num(payload.predictiveEngine.forecast?.trendPct) >= 0 ? 'رشد مثبت' : 'افت قابل بررسی'}</em>
          </article>

          <article className="smart-predictive-v182__kpi smart-predictive-v182__kpi--amber">
            <span><i className="fa-solid fa-money-bill-transfer" /></span>
            <small>فشار وصول</small>
            <strong>{money(payload.predictiveEngine.risks?.collection?.overdueAmount)}</strong>
            <em>{num(payload.predictiveEngine.risks?.collection?.overdueCount).toLocaleString('fa-IR')} سند معوق</em>
          </article>
        </div>

        <div className="smart-predictive-v182__body">
          <aside className="smart-predictive-v182__stock">
            <div className="smart-predictive-v182__panel-head">
              <div>
                <h3>کالاهای در خطر اتمام</h3>
                <p>{num(payload.predictiveEngine.risks?.stockout?.length).toLocaleString('fa-IR')} سیگنال موجودی</p>
              </div>
              <span><i className="fa-regular fa-bell" /></span>
            </div>

            <div className="smart-predictive-v182__stock-list">
              {(payload.predictiveEngine.risks?.stockout || []).slice(0, 5).map((r) => (
                <Link key={`${r.productId}-${r.productName}`} to={r.to || '/reports/analysis/suggestions'} className="smart-predictive-v182__stock-item">
                  <div className="smart-predictive-v182__stock-icon"><i className="fa-solid fa-box-open" /></div>
                  <div>
                    <h4>{r.productName}</h4>
                    <p>موجودی: {num(r.stockQuantity).toLocaleString('fa-IR')} · فروش ۱۴ روز: {num(r.soldQty14).toLocaleString('fa-IR')}</p>
                    {num(r.suggestedBuyQty) > 0 ? <strong>پیشنهاد خرید: {num(r.suggestedBuyQty).toLocaleString('fa-IR')} عدد</strong> : null}
                  </div>
                  <span>{r.daysToStockout == null ? 'نامشخص' : `${num(r.daysToStockout).toLocaleString('fa-IR')} روز`}</span>
                </Link>
              ))}
              {!(payload.predictiveEngine.risks?.stockout || []).length ? (
                <div className="smart-predictive-v182__empty">
                  <i className="fa-solid fa-circle-check" />
                  <strong>سیگنال اتمام موجودی دیده نشد</strong>
                  <p>در داده‌های فعلی، کالایی با خطر فوری اتمام موجودی شناسایی نشده است.</p>
                </div>
              ) : null}
            </div>
          </aside>

          <main className="smart-predictive-v182__alerts">
            <div className="smart-predictive-v182__panel-head">
              <div>
                <h3>هشدارهای آینده‌نگر</h3>
                <p>{num(payload.predictiveEngine.alerts?.length).toLocaleString('fa-IR')} هشدار فعال</p>
              </div>
              <span><i className="fa-regular fa-bell" /></span>
            </div>

            <div className="smart-predictive-v182__alert-grid">
              {(payload.predictiveEngine.alerts || []).length ? (payload.predictiveEngine.alerts || []).map((alert) => {
                const meta = severityMeta[(alert.severity as string) || 'medium'] || severityMeta.medium;
                const tone = String(alert.severity || 'medium');
                return (
                  <Link key={alert.id} to={alert.to || '#'} className={`smart-predictive-v182__alert smart-predictive-v182__alert--${tone}`}>
                    <span className="smart-predictive-v182__alert-icon"><i className={`fa-solid ${meta.icon || 'fa-triangle-exclamation'}`} /></span>
                    <div>
                      <h4>{alert.title}</h4>
                      {alert.summary ? <p>{alert.summary}</p> : null}
                      <em>{alert.actionLabel || 'بررسی جزئیات'} <i className="fa-solid fa-arrow-left" /></em>
                    </div>
                  </Link>
                );
              }) : (
                <div className="smart-predictive-v182__empty smart-predictive-v182__empty--wide">
                  <i className="fa-solid fa-circle-check" />
                  <strong>هشدار آینده‌نگر جدی دیده نشد</strong>
                  <p>در بازه فعلی، داده‌ها وضعیت پایدار و بدون هشدار فوری را نشان می‌دهند.</p>
                </div>
              )}
            </div>
          </main>
        </div>

        <footer className="smart-predictive-v182__footer">
          <span>آخرین بروزرسانی: {payload.generatedAt ? shamsi(payload.generatedAt) : '—'}</span>
          <span>{payload.predictiveEngine.method?.label || 'پیش‌بینی هر ۳۰ دقیقه با داده‌های جدید به‌روزرسانی می‌شود.'}</span>
          {payload.predictiveEngine.method?.warning ? <strong><i className="fa-solid fa-circle-info" /> {payload.predictiveEngine.method.warning}</strong> : null}
        </footer>
      </section>
  );
}

export default React.memo(PredictiveEngineSection);
