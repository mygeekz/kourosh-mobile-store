import FinancialStatusBadge from '@/components/FinancialStatusBadge';
import { IconGlyph } from '@/components/ui';
import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerDetailHeaderSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    formatCurrencyText,
    formatPartnerLedgerCurrency,
    openEditModal,
    openPartnerQrLinkModal,
    openTelegramReport,
    partnerRiskFactors,
    partnerTelegramLinked,
    partnerTelegramLinkedAt,
    partnerTypeLabel,
    profile,
    readStoredCurrencyUnit,
    scrollToLedger,
    setIsMessageModalOpen,
    setPrefillChannels,
    setPrefillMessageText,
    soldPhonesProductSettlementBalance,
    tgQrLoading,
    totalCredits,
    totalDebits,
  } = ctx;

  const riskScore = Number(partnerRiskFactors?.score || 0);
  const riskPercent = Math.max(0, Math.min(100, riskScore * 10));
  const riskToneClass = riskScore >= 9
    ? 'text-rose-600 dark:text-rose-300'
    : riskScore >= 6
      ? 'text-amber-600 dark:text-amber-300'
      : riskScore >= 3
        ? 'text-orange-600 dark:text-orange-300'
        : 'text-emerald-600 dark:text-emerald-300';
  const riskRingClass = riskScore >= 9
    ? 'text-rose-500'
    : riskScore >= 6
      ? 'text-amber-400'
      : riskScore >= 3
        ? 'text-orange-400'
        : 'text-emerald-500';
  const riskIconShell = riskScore >= 9
    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200'
    : riskScore >= 6
      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200'
      : riskScore >= 3
        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-200'
        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200';

  const balanceLabel = profile.currentBalance > 0
    ? 'بدهی به همکار'
    : profile.currentBalance < 0
      ? 'طلب از همکار'
      : 'تسویه';
  const balanceTone = profile.currentBalance > 0
    ? 'warning'
    : profile.currentBalance < 0
      ? 'success'
      : 'success';
  const partnerTelegramSecureLinked = Boolean(String((profile as any).telegram_user_id || '').trim());
  const partnerTelegramLegacyDelivery = partnerTelegramLinked && !partnerTelegramSecureLinked;

  return (
    <div className="detail-hero-card__head" data-ui-people-surface="partner-header-overview" data-ui-partner-header="customer-parity-v137">
      <div className="customer-detail-hero__top customer-overview-hero-top flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <IconGlyph tone="accent" className="detail-hero-card__icon h-12 w-12 shrink-0 text-2xl" aria-hidden="true">
            <i className="fa-solid fa-user-tie" />
          </IconGlyph>

          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <i className="fa-solid fa-address-card text-[10px]" />
              پرونده همکار
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{profile.partnerName}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">نمای کامل همکار برای پیگیری ارتباطات، گردش حساب، خریدها و وضعیت همکاری.</p>

              <div className="customer-hero-chip-row mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 font-semibold text-violet-700 shadow-sm dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-200">
                  <i className="fa-solid fa-store text-[10px]" />
                  {partnerTypeLabel}
                </span>
                <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <i className="fa-solid fa-phone text-[10px] text-slate-400" />
                  <span dir="ltr">{profile.phoneNumber || 'بدون شماره'}</span>
                </span>
                <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${
                  riskScore >= 9
                    ? 'border-rose-100 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'
                    : riskScore >= 6
                      ? 'border-amber-100 bg-amber-50/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200'
                      : riskScore >= 3
                        ? 'border-orange-100 bg-orange-50/90 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200'
                        : 'border-emerald-100 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                }`}>
                  <i className="fa-solid fa-shield-halved text-[10px]" />
                  ریسک: {partnerRiskFactors?.label || 'نامشخص'} · {riskScore.toLocaleString('fa-IR')} از ۱۰
                </span>
                <FinancialStatusBadge label={balanceLabel} tone={balanceTone} icon="fa-solid fa-wallet" size="sm" />
                <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${partnerTelegramSecureLinked
                  ? 'border-sky-100 bg-sky-50/90 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200'
                  : partnerTelegramLegacyDelivery
                    ? 'border-amber-100 bg-amber-50/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-rose-100 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'}`}>
                  <i className={`fa-brands fa-telegram ${partnerTelegramSecureLinked ? '' : 'opacity-80'}`} />
                  {partnerTelegramSecureLinked ? 'تلگرام متصل امن' : partnerTelegramLegacyDelivery ? 'تلگرام قدیمی؛ فقط ارسال' : 'تلگرام لینک امن نشده'}
                </span>
                {partnerTelegramLinkedAt ? (
                  <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <i className="fa-regular fa-clock text-[10px] text-slate-400" />
                    آخرین اتصال: {partnerTelegramLinkedAt}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="customer-detail-actions customer-overview-actions flex flex-wrap items-center gap-2 lg:max-w-[48%] lg:justify-end" aria-label="عملیات سریع همکار">
          <Button
            onClick={() => {
              setPrefillMessageText('');
              setPrefillChannels(undefined);
              setIsMessageModalOpen(true);
            }}
            variant="success"
            size="sm"
            className="people-action-btn people-action-btn-tight people-action-btn-primary !px-3.5 !text-[11px]"
            title="ارسال پیامک/تلگرام"
            leftIcon={<i className="fa-solid fa-paper-plane" />}
          >
            ارسال پیام
          </Button>
          <Button
            onClick={openTelegramReport}
            variant="primary"
            size="sm"
            className="people-action-btn people-action-btn-tight people-action-btn-secondary !px-3.5 !text-[11px]"
            title="ارسال گزارش کامل همکار در تلگرام"
            leftIcon={<i className="fa-brands fa-telegram" />}
          >
            ارسال گزارش
          </Button>
          <Button
            onClick={openEditModal}
            variant="primary"
            size="sm"
            className="people-action-btn people-action-btn-tight people-action-btn-primary !px-3.5 !text-[11px]"
            leftIcon={<i className="fas fa-edit" />}
          >
            ویرایش پروفایل
          </Button>
          <Button
            type="button"
            onClick={openPartnerQrLinkModal}
            disabled={tgQrLoading}
            variant="secondary"
            size="sm"
            className="people-action-btn people-action-btn-tight people-action-btn-secondary !px-3.5 !text-[11px]"
            title="نمایش QR، کپی لینک و مدیریت اتصال تلگرام"
            leftIcon={<i className="fa-solid fa-link" />}
          >
            اتصال تلگرام
          </Button>
        </div>
      </div>

      <section className="customer-overview-dashboard mt-4 space-y-4" aria-label="داشبورد حساب و ریسک همکار">
        <div className="customer-overview-dashboard-grid grid gap-4 lg:grid-cols-[1fr_1.25fr_1fr]">
          <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">وضعیت حساب همکار</div>
                <div className={`mt-3 break-words text-[24px] font-black leading-8 ${
                  profile.currentBalance > 0
                    ? 'text-amber-600 dark:text-amber-300'
                    : profile.currentBalance < 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-900 dark:text-slate-50'
                }`}>
                  {formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}
                </div>
                <p className="mt-2 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                  {profile.currentBalance > 0
                    ? 'فروشگاه به این همکار بدهکار است و باید زمان‌بندی تسویه کنترل شود.'
                    : profile.currentBalance < 0
                      ? 'همکار به فروشگاه بدهکار است و باید در خرید یا تسویه بعدی لحاظ شود.'
                      : 'حساب همکار تسویه است و مانده فعالی ندارد.'}
                </p>
              </div>
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${
                profile.currentBalance > 0
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/35 dark:text-amber-200'
                  : profile.currentBalance < 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
              }`}>
                <i className="fa-solid fa-wallet text-[20px]" />
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
              {partnerRiskFactors?.recommendation || 'قبل از خرید یا تسویه جدید، دفتر حساب و سرمایه در انتظار بازگشت بررسی شود.'}
            </div>
            <button
              type="button"
              onClick={scrollToLedger}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-[12px] font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              مشاهده دفتر حساب
              <i className="fa-solid fa-book-open" />
            </button>
          </div>

          <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">شاخص‌های مالی کلیدی</div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">نمای فشرده از گردش مالی و تعهدات باز این همکار.</p>
              </div>
              <IconGlyph tone="neutral" className="h-6 w-6" aria-hidden="true"><i className="fa-solid fa-chart-simple" /></IconGlyph>
            </div>

            <div className="grid gap-0 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800 sm:grid-cols-2">
              {[
                {
                  label: 'پرداختی شما',
                  value: formatCurrencyText(Number(totalCredits || 0), readStoredCurrencyUnit()),
                  icon: 'fa-solid fa-arrow-up',
                  tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/30',
                },
                {
                  label: 'دریافتی شما',
                  value: formatCurrencyText(Number(totalDebits || 0), readStoredCurrencyUnit()),
                  icon: 'fa-solid fa-arrow-down',
                  tone: 'text-blue-600 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/30',
                },
                {
                  label: 'سرمایه در انتظار بازگشت',
                  value: formatCurrencyText(Math.max(0, Number(soldPhonesProductSettlementBalance || 0)), readStoredCurrencyUnit()),
                  icon: 'fa-regular fa-clock',
                  tone: 'text-orange-600 bg-orange-50 dark:text-orange-200 dark:bg-orange-950/30',
                },
                {
                  label: 'پرونده فروش باز',
                  value: `${Number(partnerRiskFactors?.openSaleFiles || 0).toLocaleString('fa-IR')} مورد`,
                  icon: 'fa-solid fa-folder-open',
                  tone: 'text-violet-600 bg-violet-50 dark:text-violet-200 dark:bg-violet-950/30',
                },
              ].map((item, index) => (
                <div key={item.label} className={`customer-overview-metric-cell min-h-[122px] p-4 ${index % 2 === 0 ? 'sm:border-l' : ''} ${index < 2 ? 'border-b' : ''} border-slate-200 dark:border-slate-800`}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-3 break-words text-[18px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                    </div>
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                      <i className={item.icon} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">سطح ریسک همکاری</div>
                <div className={`mt-2 text-[24px] font-black ${riskToneClass}`}>
                  {partnerRiskFactors?.label || 'نامشخص'}
                </div>
              </div>
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${riskIconShell}`}>
                <i className="fa-solid fa-shield-halved" />
              </span>
            </div>

            <div className="relative mx-auto mt-3 max-w-full" style={{ width: 144, height: 144, minWidth: 144, maxWidth: '100%' }}>
              <svg viewBox="0 0 160 160" className="-rotate-90" style={{ width: '144px', height: '144px', display: 'block' }} role="img" aria-label="نمودار دایره‌ای ریسک همکاری">
                <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-200 dark:text-slate-800" strokeLinecap="round" />
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${riskPercent * 3.895} 389.5`}
                  className={`${riskRingClass} transition-all duration-500`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-[30px] font-black leading-none text-slate-950 dark:text-slate-50">{riskScore.toLocaleString('fa-IR')}</div>
                <div className="mt-2 text-[11px] font-black text-slate-500 dark:text-slate-400">از ۱۰</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              امتیاز فعلی: {riskScore.toLocaleString('fa-IR')} از ۱۰
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PartnerDetailHeaderSection;
