import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const toneClass: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
};

const stepToneClass: Record<string, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
  'needs-review': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
  'missing-data': 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200',
};

const stepIcon: Record<string, string> = {
  ready: 'fa-solid fa-circle-check',
  'needs-review': 'fa-solid fa-triangle-exclamation',
  'missing-data': 'fa-solid fa-circle-info',
};

const PartnerSettlementReviewFlowSection: React.FC<Props> = ({ ctx }) => {
  const {
    formatCurrencyText,
    formatIsoToShamsi,
    partnerBusinessReadModel,
    readStoredCurrencyUnit,
    setSoldPhoneSettlementFilter,
  } = ctx;

  const reviewFlow = partnerBusinessReadModel?.reviewFlow;
  if (!reviewFlow) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatMoney = (value: number | null | undefined) => (
    value == null ? 'نیازمند تکمیل اطلاعات' : formatCurrencyText(Number(value || 0), currencyUnit)
  );
  const showOpenRows = () => {
    if (typeof setSoldPhoneSettlementFilter === 'function') setSoldPhoneSettlementFilter('open');
    const target = document.getElementById('partner-phone-capital-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="partner-detail-section-shell partner-settlement-review-flow mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6" data-partner-settlement-review-flow="true">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-clipboard-check text-slate-400" />
            جریان مرور تسویه مدیریتی
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">مرور قبل از ثبت، بدون اجرای خودکار</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
            این جریان فقط وضعیت ردیف‌های قابل مرور، چک‌لیست مدیر و نقص‌های اطلاعاتی را نشان می‌دهد. ثبت تسویه همچنان فقط با اقدام دستی مدیر در کنترل‌های موجود انجام می‌شود.
          </p>
        </div>
        <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[reviewFlow.tone] || toneClass.neutral}`}>
          <i className="fa-solid fa-lock" />
          {reviewFlow.statusLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های کاندید مرور</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{reviewFlow.candidateCount.toLocaleString('fa-IR')}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">فقط ردیف‌هایی که مانده محصول‌محور دارند.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ قابل مرور</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatMoney(reviewFlow.candidateAmount)}</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">مبلغ فقط از مانده‌های موجود خوانده می‌شود.</p>
        </article>
        <article className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">قفل اجرای خودکار</div>
          <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">غیرفعال</div>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این بخش هیچ دفتر، موجودی یا حسابداری را تغییر نمی‌دهد.</p>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">چک‌لیست تایید مدیر</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">هر مورد فقط وضعیت را نشان می‌دهد و قابل ذخیره‌سازی نیست.</p>
            </div>
            <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">فقط مرور</span>
          </div>
          <div className="mt-4 space-y-2">
            {reviewFlow.steps.map((step: any) => (
              <article key={step.label} className={`rounded-2xl border p-3 ${stepToneClass[step.status] || stepToneClass['needs-review']}`}>
                <div className="flex items-start gap-3">
                  <i className={`${stepIcon[step.status] || stepIcon['needs-review']} mt-1`} />
                  <div className="min-w-0">
                    <div className="text-sm font-black">{step.label}</div>
                    <p className="mt-1 text-xs font-semibold leading-6 opacity-90">{step.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={showOpenRows} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
              <i className="fa-solid fa-filter" />
              نمایش ردیف‌های باز
            </button>
            <a href="#partner-ledger-section" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
              <i className="fa-solid fa-book-open" />
              مرور دفتر حساب
            </a>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">ردیف‌های قابل مرور</h4>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">برای هر ردیف، مبلغ از مانده ثبت‌شده خوانده می‌شود و عددی حدس زده نمی‌شود.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {reviewFlow.candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                ردیف آماده مرور برای تسویه محصول‌محور وجود ندارد.
              </div>
            ) : reviewFlow.candidates.map((candidate: any) => (
              <article key={candidate.id || candidate.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">{candidate.label}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {candidate.identifier ? <span>شناسه: {candidate.identifier}</span> : <span>شناسه کالا ناقص</span>}
                      <span>{candidate.soldAt ? formatIsoToShamsi(candidate.soldAt) : 'تاریخ فروش نامشخص'}</span>
                      <span>{candidate.sourceLabel || 'منبع فروش نیازمند بررسی'}</span>
                    </div>
                  </div>
                  <div className="text-left sm:min-w-[160px]">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مانده قابل مرور</div>
                    <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatMoney(candidate.balance)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">مبنای قیمت: {formatMoney(candidate.settlementPurchasePrice)}</span>
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">پرداخت ثبت‌شده: {formatMoney(candidate.paidAmount)}</span>
                  <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">{candidate.hasSource ? 'منبع قابل تشخیص' : 'نیازمند تکمیل منبع'}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">قواعد اجرای غیرخودکار</h4>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {reviewFlow.actionHints.map((hint: string) => (
            <div key={hint} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <i className="fa-solid fa-shield-halved ml-1 text-slate-400" />
              {hint}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerSettlementReviewFlowSection;
