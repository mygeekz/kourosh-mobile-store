import React from 'react';
import type { RealProfitRiskInvoice, RealProfitQualityTone, MoneyFormatter, NumberFormatter, PercentFormatter } from './types/smartInsightContracts';
import { Link } from 'react-router-dom';

type RealProfitEngineSectionProps = {
  profitSummary: ProfitSummaryLike | null;
  profitQualityTone: RealProfitQualityTone;
  profitRealizedShare: number;
  profitRiskShare: number;
  profitRiskyInvoices: RealProfitRiskInvoice[];
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
};

function RealProfitEngineSection({
  profitSummary,
  profitQualityTone,
  profitRealizedShare,
  profitRiskShare,
  profitRiskyInvoices,
  money,
  percent,
  num,
}: RealProfitEngineSectionProps) {
  if (!profitSummary || !(num(profitSummary.grossSales) > 0 || num(profitSummary.realProfit) !== 0)) return null;

  return (

        <section className="profit241-board overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-sm dark:border-emerald-500/25 dark:bg-slate-900/72">
          <div className="profit241-header">
            <div className="profit241-header__copy">
              <div className="profit241-kicker">
                <i className="fa-solid fa-sack-dollar" />
                REAL PROFIT ENGINE
              </div>
              <h2>موتور سود واقعی لحظه‌ای</h2>
              <p>سود واقعی بعد از قیمت خرید، تخفیف فاکتور و ریسک وصول محاسبه می‌شود؛ این عدد با فروش اسمی فرق دارد و باید مبنای تصمیم مدیریتی باشد.</p>
            </div>
            <div className={`profit241-quality-card profit241-quality-card--${profitQualityTone}`}>
              <small>کیفیت سود</small>
              <strong>{percent(profitSummary.qualityScore)}</strong>
              <span>{profitQualityTone === 'good' ? 'پایدار' : profitQualityTone === 'watch' ? 'نیازمند پایش' : 'پرریسک'}</span>
            </div>
          </div>

          <div className="profit241-kpi-grid">
            <article className="profit241-kpi profit241-kpi--good">
              <div className="profit241-kpi__icon"><i className="fa-solid fa-sack-dollar" /></div>
              <small>سود واقعی</small>
              <strong>{money(profitSummary.realProfit)}</strong>
              <span>مبنای تصمیم‌گیری نهایی</span>
            </article>
            <article className="profit241-kpi">
              <div className="profit241-kpi__icon"><i className="fa-solid fa-credit-card" /></div>
              <small>سود شناسایی‌شده</small>
              <strong>{money(profitSummary.recognizedProfit)}</strong>
              <span>{percent(profitRealizedShare)} از سود کل</span>
            </article>
            <article className="profit241-kpi profit241-kpi--risk">
              <div className="profit241-kpi__icon"><i className="fa-solid fa-triangle-exclamation" /></div>
              <small>سود در خطر</small>
              <strong>{money(profitSummary.profitAtRisk)}</strong>
              <span>{percent(profitRiskShare)} در معرض ریسک وصول</span>
            </article>
            <article className="profit241-kpi">
              <div className="profit241-kpi__icon"><i className="fa-solid fa-percent" /></div>
              <small>حاشیه سود</small>
              <strong>{percent(profitSummary.marginPct)}</strong>
              <span>نسبت سود به فروش مؤثر</span>
            </article>
          </div>

          <div className="profit241-content">
            <section className="profit241-panel profit241-panel--main">
              <div className="profit241-panel__head">
                <div>
                  <h3>فاکتورهای حساس سود</h3>
                  <p>این فاکتورها بیشترین اثر را بر کاهش کیفیت سود دارند و باید سریع‌تر بررسی شوند.</p>
                </div>
                <span className="profit241-panel__count">{profitRiskyInvoices.length.toLocaleString('fa-IR')} مورد</span>
              </div>

              {profitRiskyInvoices.length ? (
                <div className="profit241-risk-grid">
                  {profitRiskyInvoices.slice(0, 4).map((r) => (
                    <Link key={String(r.orderId)} to={r.to || '/invoices'} className="profit241-risk-card">
                      <div className="profit241-risk-card__top">
                        <div className="min-w-0">
                          <strong>{r.customerName || `فاکتور ${num(r.orderId).toLocaleString('fa-IR')}`}</strong>
                          <small>{r.label || 'پایش سود'} · {r.transactionDate || '—'}</small>
                        </div>
                        <span className={`profit241-risk-chip ${num(r.riskScore) >= 70 ? 'profit241-risk-chip--danger' : num(r.riskScore) >= 40 ? 'profit241-risk-chip--watch' : 'profit241-risk-chip--safe'}`}>
                          <i className="fa-solid fa-shield-halved" />
                          ریسک {percent(r.riskScore)}
                        </span>
                      </div>
                      <div className="profit241-risk-card__stats">
                        <div><small>فروش</small><strong>{money(r.grandTotal)}</strong></div>
                        <div><small>سود</small><strong>{money(r.realProfit)}</strong></div>
                        <div><small>در خطر</small><strong>{money(r.profitAtRisk)}</strong></div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="profit241-empty">
                  <i className="fa-solid fa-circle-check" />
                  <div>
                    <strong>فاکتور پرریسکی برای این بازه ثبت نشده است.</strong>
                    <p>با تغییر بازه یا ثبت تراکنش‌های جدید، موارد حساس اینجا نمایش داده می‌شوند.</p>
                  </div>
                </div>
              )}
            </section>

            <aside className="profit241-panel profit241-panel--side">
              <div className="profit241-panel__head">
                <div>
                  <h3>خوانش مدیریتی کیفیت سود</h3>
                  <p>این خلاصه کمک می‌کند سریع بفهمی کدام بخش سود نقد شده و کدام بخش نیازمند پیگیری است.</p>
                </div>
              </div>
              <div className="profit241-insight-list">
                <div className="profit241-insight-item">
                  <span className="profit241-insight-item__icon"><i className="fa-solid fa-chart-line" /></span>
                  <div>
                    <strong>کیفیت سود</strong>
                    <small>{profitQualityTone === 'good' ? 'کیفیت سود در وضعیت پایدار است.' : profitQualityTone === 'watch' ? 'بخشی از سود هنوز نیازمند پایش است.' : 'ریسک وصول یا تخفیف، کیفیت سود را پایین آورده است.'}</small>
                  </div>
                </div>
                <div className="profit241-insight-item">
                  <span className="profit241-insight-item__icon"><i className="fa-solid fa-money-bill-trend-up" /></span>
                  <div>
                    <strong>سهم سود وصول‌شده</strong>
                    <small>{percent(profitRealizedShare)} از سود واقعی در این بازه شناسایی یا وصول شده است.</small>
                  </div>
                </div>
                <div className="profit241-insight-item">
                  <span className="profit241-insight-item__icon"><i className="fa-solid fa-receipt" /></span>
                  <div>
                    <strong>نقطه تمرکز بعدی</strong>
                    <small>{profitRiskyInvoices[0]?.customerName ? `ابتدا فاکتور ${profitRiskyInvoices[0].customerName} را بررسی کن.` : 'فعلاً مورد بحرانی جدیدی دیده نمی‌شود.'}</small>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
  );
}

export default React.memo(RealProfitEngineSection);
