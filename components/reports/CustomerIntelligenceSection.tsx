import React from 'react';
import type { CustomerIntelligenceCard, MoneyFormatter, NumberFormatter, PercentFormatter, ShamsiFormatter } from './types/smartInsightContracts';

export type CustomerIntelligenceCardData = CustomerIntelligenceCard & {
  customerId?: string | number;
  customerName: string;
  phoneNumber?: string;
  segment?: string;
  segments?: string[];
  riskScore?: number;
  profitScore?: number;
  totalSpend?: number;
  estimatedProfit?: number;
  discountRate?: number;
  creditRate?: number;
  daysSinceLast?: number;
  lastPurchaseAt?: string;
  lastPurchaseLabel?: string;
  action?: string;
};

type CustomerIntelligenceSectionProps = {
  customers: CustomerIntelligenceCardData[];
  highRiskCount: number;
  vipCount: number;
  avgRiskLabel: string;
  money: MoneyFormatter;
  percent: PercentFormatter;
  shamsi: ShamsiFormatter;
  num: NumberFormatter;
};

function CustomerIntelligenceSection({
  customers,
  highRiskCount,
  vipCount,
  avgRiskLabel,
  money,
  percent,
  shamsi,
  num,
}: CustomerIntelligenceSectionProps) {
  if (!customers.length) return null;

  return (
    <section className="customer251-board customer261-board overflow-hidden rounded-[30px] border border-indigo-100 bg-white shadow-sm dark:border-indigo-500/25 dark:bg-slate-900/72">
      <div className="customer251-header customer261-header">
        <div className="customer251-header__copy customer261-header__copy">
          <div className="customer251-kicker customer261-kicker">
            <i className="fa-solid fa-users-viewfinder" />
            CUSTOMER INTELLIGENCE
          </div>
          <h2>شخصیت مشتری‌ها و رفتار پیشنهادی</h2>
          <p>مشتری‌ها بر اساس سودآوری، ریسک پرداخت، تخفیف‌گیری و آخرین خرید واقعی از بک‌اند دسته‌بندی شده‌اند.</p>
        </div>
        <div className="customer251-header__status customer261-header__status">
          <small>مشتری تحلیل‌شده</small>
          <strong>{customers.length.toLocaleString('fa-IR')}</strong>
        </div>
      </div>

      <div className="customer251-summary-grid customer261-summary-grid">
        <article className="customer251-summary-card customer261-summary-card">
          <span><i className="fa-solid fa-users" /></span>
          <small>کل مشتری تحلیل‌شده</small>
          <strong>{customers.length.toLocaleString('fa-IR')}</strong>
          <em>در بازه فعلی</em>
        </article>
        <article className="customer251-summary-card customer251-summary-card--risk customer261-summary-card">
          <span><i className="fa-solid fa-shield-halved" /></span>
          <small>مشتری پرریسک</small>
          <strong>{highRiskCount.toLocaleString('fa-IR')}</strong>
          <em>ریسک ۷۰٪ به بالا</em>
        </article>
        <article className="customer251-summary-card customer251-summary-card--good customer261-summary-card">
          <span><i className="fa-solid fa-crown" /></span>
          <small>سگمنت طلایی / سودآور</small>
          <strong>{vipCount.toLocaleString('fa-IR')}</strong>
          <em>ارزشمند برای حفظ و توسعه</em>
        </article>
        <article className="customer251-summary-card customer261-summary-card">
          <span><i className="fa-solid fa-gauge-high" /></span>
          <small>میانگین ریسک</small>
          <strong>{avgRiskLabel}</strong>
          <em>ریسک تجمعی این لیست</em>
        </article>
      </div>

      <div className="customer251-grid customer261-grid">
        {customers.slice(0, 6).map((customer) => {
          const segments = customer.segments?.length ? customer.segments : [customer.segment].filter(Boolean);
          const riskTone = num(customer.riskScore) >= 70 ? 'danger' : num(customer.riskScore) >= 40 ? 'watch' : 'safe';
          const lastPurchaseLabel = customer.lastPurchaseLabel || (
            num(customer.daysSinceLast) >= 999
              ? 'نامشخص'
              : num(customer.daysSinceLast) === 0
                ? 'امروز'
                : num(customer.daysSinceLast) === 1
                  ? 'دیروز'
                  : `${num(customer.daysSinceLast).toLocaleString('fa-IR')} روز قبل`
          );

          return (
            <article key={String(customer.customerId || customer.customerName)} className={`customer251-card customer251-card--${riskTone} customer261-card`}>
              <div className="customer251-card__head customer261-card__head">
                <div className="customer251-avatar customer261-avatar" aria-hidden="true">
                  <i className="fa-regular fa-user" />
                </div>
                <div className="customer251-card__identity customer261-card__identity">
                  <strong>{customer.customerName}</strong>
                  <div className="customer251-card__segments customer261-card__segments">
                    {segments.slice(0, 3).map((segment, index) => (
                      <span key={`${segment}-${index}`} className="customer251-segment-chip customer261-segment-chip">{segment}</span>
                    ))}
                  </div>
                </div>
                <div className={`customer251-risk-chip customer251-risk-chip--${riskTone} customer261-risk-chip`}>
                  <small>ریسک</small>
                  <strong>{percent(customer.riskScore)}</strong>
                </div>
              </div>

              <div className="customer251-metric-grid customer261-metric-grid">
                <div className="customer251-metric customer261-metric">
                  <i className="fa-solid fa-chart-line" />
                  <small>سودآوری</small>
                  <strong>{percent(customer.profitScore)}</strong>
                </div>
                <div className="customer251-metric customer261-metric">
                  <i className="fa-solid fa-basket-shopping" />
                  <small>خرید کل</small>
                  <strong>{money(customer.totalSpend)}</strong>
                </div>
                <div className="customer251-metric customer261-metric">
                  <i className="fa-solid fa-percent" />
                  <small>تخفیف</small>
                  <strong>{percent(customer.discountRate)}</strong>
                </div>
                <div className="customer251-metric customer251-metric--last customer261-metric customer261-metric--last">
                  <i className="fa-solid fa-clock-rotate-left" />
                  <small>آخرین خرید</small>
                  <strong>{lastPurchaseLabel}</strong>
                  {customer.lastPurchaseAt ? <em>{shamsi(customer.lastPurchaseAt)}</em> : null}
                </div>
              </div>

              <div className="customer251-action customer261-action">
                <span className="customer251-action__icon customer261-action__icon"><i className="fa-solid fa-wand-magic-sparkles" /></span>
                <div>
                  <strong>رفتار پیشنهادی</strong>
                  <p>{customer.action || 'پایش رفتار مشتری'}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default React.memo(CustomerIntelligenceSection);
