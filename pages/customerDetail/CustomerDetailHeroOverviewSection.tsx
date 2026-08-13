import { IconGlyph, inferIconGlyphTone } from '@/components/ui';
import React from 'react';
import type {
  CustomerManagerAction,
  CustomerManagerNote,
  CustomerManagerSummary,
  CustomerProfileStat,
  CustomerQuickAction,
} from '../viewBoundaryTypes';

type Props = {
  ctx: Record<string, any> & {
    managerActionSummary: CustomerManagerSummary[];
    managerActionCards: CustomerManagerAction[];
    managerNotes: CustomerManagerNote[];
    profileOverviewStats: CustomerProfileStat[];
    quickActions: CustomerQuickAction[];
    normalizeTags: (value: unknown) => string[];
  };
};

const CustomerDetailHeroOverviewSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    FinancialStatusBadge,
    balance,
    credit,
    customerTelegramLinked,
    customerTelegramLinkedAt,
    customerTrustHistory,
    customerTrustHistoryLoading,
    customerTrustLoading,
    customerTrustProfile,
    formatCurrencyText,
    formatIsoToShamsi,
    formatLedgerCurrency,
    id,
    isSavingTags,
    ledger,
    managerActionCards,
    managerActionSummary,
    managerNotes,
    managerNotesLoading,
    normalizeTags,
    note,
    openEditModal,
    openQrLinkModal,
    openTelegramReport,
    profile,
    profileOverviewStats,
    purchaseHistory,
    quickActions,
    readStoredCurrencyUnit,
    scrollToLedger,
    setIsMessageModalOpen,
    setPrefillChannels,
    setPrefillMessageText,
    setTagInput,
    t,
    tagInput,
    tgIsSending,
    tgQrLoading,
    trustScore,
    trustTone,
    updateTags,
    value,
  } = ctx;
  const customerTelegramSecureLinked = Boolean(String((profile as any).telegram_user_id || '').trim());
  const customerTelegramLegacyDelivery = customerTelegramLinked && !customerTelegramSecureLinked;

  return (
    <>
<div className="detail-hero-card__head">
          <div className="customer-detail-hero__top customer-overview-hero-top flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <IconGlyph tone="accent" className="detail-hero-card__icon h-12 w-12 text-2xl" aria-hidden="true">
                <i className="fa-solid fa-user" />
              </IconGlyph>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <i className="fa-solid fa-address-card text-[10px]" />
                  پرونده مشتری
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{profile.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">نمای کامل مشتری برای پیگیری ارتباطات، گردش حساب و سوابق خرید و تعاملات.</p>
                <div className="customer-hero-chip-row mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-solid fa-phone text-[10px] text-slate-400" /><span dir="ltr">{profile.phoneNumber || 'بدون شماره'}</span></span>
                  <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1.5 font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200"><i className="fa-solid fa-bag-shopping text-[10px]" />{purchaseHistory.length.toLocaleString('fa-IR')} خرید ثبت‌شده</span>
                  <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${trustTone.shell}`}><i className={`${trustTone.icon} text-[10px]`} />امتیاز اعتماد: {customerTrustLoading ? '...' : customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}</span>
                  <FinancialStatusBadge label={profile.currentBalance > 0 ? 'بدهکار' : profile.currentBalance < 0 ? 'بستانکار' : 'تسویه'} tone={profile.currentBalance > 0 ? 'danger' : profile.currentBalance < 0 ? 'success' : 'success'} icon="fa-solid fa-wallet" size="sm" />
                  <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${customerTelegramSecureLinked ? 'border-sky-100 bg-sky-50/90 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200' : customerTelegramLegacyDelivery ? 'border-amber-100 bg-amber-50/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200' : 'border-rose-100 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'}`}><i className={`fa-brands fa-telegram ${customerTelegramSecureLinked ? '' : 'opacity-80'}`} />{customerTelegramSecureLinked ? 'تلگرام متصل امن' : customerTelegramLegacyDelivery ? 'تلگرام قدیمی؛ فقط ارسال' : 'تلگرام لینک امن نشده'}</span>
                  {customerTelegramLinkedAt && <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-regular fa-clock text-[10px] text-slate-400" />آخرین اتصال: {customerTelegramLinkedAt}</span>}
                </div>
                </div>
              </div>
            </div>

            <div className="customer-detail-actions customer-overview-actions flex flex-wrap items-center gap-2 lg:max-w-[48%] lg:justify-end">
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
                title="ارسال گزارش کامل مشتری در تلگرام"
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
                onClick={openQrLinkModal}
                disabled={tgIsSending || tgQrLoading}
                variant="secondary"
                size="sm"
                className="people-action-btn people-action-btn-tight people-action-btn-secondary !px-3.5 !text-[11px]"
                title="نمایش QR، کپی لینک، باز کردن مستقیم و ساخت QR تازه"
                leftIcon={<i className="fa-solid fa-link" />}
              >
                اتصال تلگرام
              </Button>
            </div>
          </div>

          <section className="customer-overview-dashboard mt-4 space-y-4" aria-label="داشبورد اعتبار و حساب مشتری">
            <div className="customer-overview-dashboard-grid grid gap-4 lg:grid-cols-[1fr_1.25fr_1fr]">
              <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">وضعیت حساب مشتری</div>
                    <div className={`mt-3 text-[24px] font-black leading-8 ${
                      profile.currentBalance > 0 ? 'text-rose-600 dark:text-rose-300'
                        : profile.currentBalance < 0 ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-slate-900 dark:text-slate-50'
                    }`}>
                      {formatLedgerCurrency(profile.currentBalance, 'balance')}
                    </div>
                    <p className="mt-2 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                      {profile.currentBalance > 0 ? 'حساب مشتری بدهکار است و نیاز به پیگیری دریافت دارد.' : profile.currentBalance < 0 ? 'مشتری بستانکار است و باید در فروش یا تسویه بعدی لحاظ شود.' : 'حساب مشتری تسویه است و بدهی فعالی ندارد.'}
                    </p>
                  </div>
                  <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${
                    profile.currentBalance > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-200'
                      : profile.currentBalance < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                  }`}>
                    <i className="fa-solid fa-wallet text-[20px]" />
                  </span>
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  {profile.currentBalance > 0 ? 'پیشنهاد: قبل از فروش اعتباری جدید، دفتر حساب و تعهدات فعال بررسی شود.' : 'وضعیت حساب فعلی مانع مستقیم برای فروش جدید ایجاد نمی‌کند.'}
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
                    <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">شاخص‌های اثرگذار بر اعتبار</div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">خلاصه داده‌هایی که مستقیم روی تصمیم اعتباری اثر می‌گذارند.</p>
                  </div>
                  <IconGlyph tone="neutral" className="h-6 w-6" aria-hidden="true"><i className="fa-solid fa-chart-simple" /></IconGlyph>
                </div>
                <div className="grid gap-0 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800 sm:grid-cols-2">
                  {[
                    {
                      label: 'سقف اعتبار پیشنهادی',
                      value: customerTrustProfile ? formatCurrencyText(customerTrustProfile.suggestedCreditLimit, readStoredCurrencyUnit()) : '—',
                      icon: 'fa-regular fa-credit-card',
                      tone: 'text-blue-600 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/30',
                    },
                    {
                      label: 'ظرفیت باقی‌مانده',
                      value: customerTrustProfile ? formatCurrencyText(customerTrustProfile.remainingSuggestedCredit, readStoredCurrencyUnit()) : '—',
                      icon: 'fa-solid fa-wallet',
                      tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/30',
                    },
                    {
                      label: 'دیرکرد / معوق',
                      value: customerTrustProfile ? `${(customerTrustProfile.latePaymentCount + customerTrustProfile.overdueUnpaidCount).toLocaleString('fa-IR')} مورد` : '—',
                      icon: 'fa-regular fa-clock',
                      tone: 'text-rose-600 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/30',
                    },
                    {
                      label: 'چک برگشتی',
                      value: customerTrustProfile ? `${customerTrustProfile.returnedCheckCount.toLocaleString('fa-IR')} مورد` : '—',
                      icon: 'fa-solid fa-stamp',
                      tone: 'text-rose-600 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/30',
                    },
                  ].map((item, index) => (
                    <div key={item.label} className={`customer-overview-metric-cell min-h-[122px] p-4 ${index % 2 === 0 ? 'sm:border-l' : ''} ${index < 2 ? 'border-b' : ''} border-slate-200 dark:border-slate-800`}>
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                          <div className="mt-3 text-[18px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
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
                    <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">سطح ریسک اعتباری</div>
                    <div className={`mt-2 text-[24px] font-black ${
                      trustScore >= 68 ? 'text-emerald-600 dark:text-emerald-300'
                        : trustScore >= 50 ? 'text-amber-600 dark:text-amber-300'
                          : 'text-rose-600 dark:text-rose-300'
                    }`}>
                      {customerTrustLoading ? 'در حال محاسبه...' : customerTrustProfile ? customerTrustProfile.tierLabel : 'نامشخص'}
                    </div>
                  </div>
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    trustScore >= 68 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : trustScore >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200'
                  }`}>
                    <i className={trustTone.icon} />
                  </span>
                </div>

                <div className="relative mx-auto mt-3 max-w-full" style={{ width: 170, height: 170, minWidth: 170, maxWidth: '100%' }}>
                  <svg viewBox="0 0 160 160" className="-rotate-90" style={{ width: '170px', height: '170px', display: 'block' }} role="img" aria-label="نمودار دایره‌ای امتیاز اعتماد مشتری">
                    <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-200 dark:text-slate-800" strokeLinecap="round" />
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={`${customerTrustProfile ? Math.max(0, Math.min(100, trustScore)) * 3.895 : 0} 389.5`}
                      className={trustScore >= 68 ? 'text-emerald-500 transition-all duration-500' : trustScore >= 50 ? 'text-amber-400 transition-all duration-500' : 'text-rose-500 transition-all duration-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-[38px] font-black leading-none text-slate-950 dark:text-slate-50">
                      {customerTrustLoading ? '...' : customerTrustProfile ? trustScore.toLocaleString('fa-IR') : '—'}
                    </div>
                    <div className="mt-2 text-[13px] font-black text-slate-500 dark:text-slate-400">از ۱۰۰</div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  امتیاز فعلی: {customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-black text-slate-900 dark:text-slate-50">روند امتیاز اعتماد</div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">تغییر امتیاز بر اساس خریدها، پرداخت‌ها، دیرکردها و چک‌های برگشتی.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">۳۰ روزه</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">مثبت: {(customerTrustHistory?.summary?.positiveEvents ?? 0).toLocaleString('fa-IR')}</span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">منفی: {(customerTrustHistory?.summary?.negativeEvents ?? 0).toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                {customerTrustHistoryLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    در حال دریافت روند امتیاز...
                  </div>
                ) : !customerTrustHistory?.timeline?.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-[12px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    هنوز رویداد کافی برای نمایش روند امتیاز وجود ندارد.
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                    {(() => {
                      const chartEvents = [...(customerTrustHistory.timeline || [])].reverse().slice(-8);
                      const width = 720;
                      const height = 190;
                      const paddingX = 34;
                      const paddingY = 26;
                      const points = chartEvents.map((event, index) => {
                        const x = paddingX + (index * (width - paddingX * 2)) / Math.max(1, chartEvents.length - 1);
                        const rawPointScore = Number(event.scoreAfter || 0);
                        const score = Math.max(0, Math.min(100, index === chartEvents.length - 1 ? Math.max(rawPointScore, trustScore) : rawPointScore));
                        const y = paddingY + ((100 - score) * (height - paddingY * 2)) / 100;
                        return { x, y, score, event };
                      });
                      const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
                      const lastPoint = points[points.length - 1];
                      return (
                        <div dir="ltr">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 190, display: 'block' }} role="img" aria-label="روند امتیاز اعتماد">
                            {[0, 25, 50, 75, 100].map((line) => {
                              const y = paddingY + ((100 - line) * (height - paddingY * 2)) / 100;
                              return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="7 8" />;
                            })}
                            <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className={trustScore >= 68 ? 'text-emerald-500' : trustScore >= 50 ? 'text-amber-400' : 'text-rose-500'} />
                            {points.map((point, index) => (
                              <g key={`${point.event.date}`}>
                                <circle cx={point.x} cy={point.y} r="6" fill="currentColor" className={index === points.length - 1 ? 'text-rose-500' : 'text-slate-400'} />
                                <circle cx={point.x} cy={point.y} r="11" fill="transparent">
                                  <title>{`${point.event.title} · امتیاز ${point.score.toLocaleString('fa-IR')}`}</title>
                                </circle>
                              </g>
                            ))}
                            {lastPoint ? <text x={Math.max(42, lastPoint.x - 8)} y={lastPoint.y - 14} className="fill-current text-[18px] font-black text-rose-600">{lastPoint.score.toLocaleString('fa-IR')}</text> : null}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-[15px] font-black text-slate-900 dark:text-slate-50">پیشنهاد اقدام مدیریتی</div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">جمع‌بندی اقدامات پیشنهادی بر اساس ریسک، وضعیت حساب و الگوی پرداخت مشتری.</p>
                    </div>
                    <IconGlyph
                      tone={trustScore < 50 ? 'danger' : trustScore < 68 ? 'warning' : 'success'}
                      className="h-7 w-7 text-[18px]"
                      aria-hidden="true"
                    >
                      <i className="fa-solid fa-lightbulb" />
                    </IconGlyph>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {managerActionSummary.map((item) => (
                      <div key={item.label} className={`rounded-[22px] border p-4 ${item.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <IconGlyph tone={inferIconGlyphTone(item.tone)} className="h-9 w-9 shrink-0 text-[15px]" aria-hidden="true"><i className={item.icon} /></IconGlyph>
                            <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">جمع‌بندی</span>
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                            <div className="mt-2 text-[18px] font-black leading-7">{item.value}</div>
                          </div>
                          <button
                            type="button"
                            onClick={item.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-200"
                          >
                            {item.ctaLabel}
                            <i className={`${item.ctaIcon} text-[11px]`} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {managerActionCards.map((action) => (
                      <div key={action.title} className={`rounded-[22px] border p-4 ${action.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <IconGlyph tone={inferIconGlyphTone(action.iconTone)} className="h-10 w-10 shrink-0 text-[15px]" aria-hidden="true">
                              <i className={action.icon} />
                            </IconGlyph>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${action.tagTone}`}>
                              {action.tag}
                            </span>
                          </div>
                          <div className="text-[16px] font-black leading-7 text-slate-900 dark:text-slate-50">{action.title}</div>
                          <p className="text-[11px] leading-6 text-slate-600 dark:text-slate-300">{action.text}</p>
                          <button
                            type="button"
                            onClick={action.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            {action.ctaLabel}
                            <i className={`${action.ctaIcon} text-[11px]`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">آخرین یادداشت‌های مدیریتی</div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">تاریخچه جداگانه برای تصمیم‌های اعتباری و پیگیری‌های مدیریتی.</p>
                      </div>
                      <IconGlyph tone="neutral" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-regular fa-note-sticky" /></IconGlyph>
                    </div>

                    {managerNotesLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        در حال دریافت یادداشت‌های مدیریتی...
                      </div>
                    ) : managerNotes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-[12px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        هنوز یادداشت مدیریتی برای این مشتری ثبت نشده است.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-3">
                        {managerNotes.slice(0, 3).map((note) => (
                          <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-right dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                {note.context || 'یادداشت مدیریتی'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                {formatIsoToShamsi(note.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 max-h-[72px] overflow-hidden text-[11px] leading-6 text-slate-600 dark:text-slate-300">{note.note}</p>
                            {note.createdByUsername ? (
                              <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">ثبت توسط: {note.createdByUsername}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                    این پیشنهادها بر اساس امتیاز اعتماد، مانده حساب، سابقه پرداخت و نشانه‌های ریسک مشتری تولید شده‌اند.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {profileOverviewStats.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-2 text-[16px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                    </div>
                    <IconGlyph tone={inferIconGlyphTone(item.tone)} className="h-10 w-10 shrink-0 text-[15px]" aria-hidden="true">
                      <i className={item.icon} />
                    </IconGlyph>
                  </div>
                </div>
              ))}
            </div>
          </section>

        <section className="customer-extra-section border-t border-slate-200/80 bg-slate-50/55 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/25" aria-label="اکشن‌ها و اطلاعات تکمیلی مشتری">
          <div className="customer-quick-actions-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-42px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
            <div className="customer-quick-actions-header mb-4 flex items-start justify-between gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">اکشن‌های سریع پرونده مشتری</h3>
                  <IconGlyph tone="neutral" className="h-6 w-6" aria-hidden="true"><i className="fa-solid fa-bolt" /></IconGlyph>
                </div>
                <p className="mt-1 text-[11px] leading-6 text-slate-500 dark:text-slate-400">پرکاربردترین عملیات را بدون خروج از پرونده اجرا کنید.</p>
              </div>
            </div>

            <div className="customer-quick-actions-grid grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className="customer-quick-action-btn group flex min-h-[68px] items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-right shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-slate-950 dark:text-slate-50">{action.label}</div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{action.sub}</div>
                  </div>
                  <IconGlyph tone={inferIconGlyphTone(action.tone)} className="h-10 w-10 shrink-0 text-[15px] transition group-hover:scale-105" aria-hidden="true">
                    <i className={action.icon} />
                  </IconGlyph>
                </button>
              ))}
            </div>
          </div>

          <div className="customer-extra-grids mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="customer-extra-card customer-crm-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="customer-extra-card-header mb-4 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-[15px] font-black text-slate-950 dark:text-slate-50">تگ‌های CRM</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">برای گروه‌بندی مشتری و فیلتر در گزارش‌ها استفاده می‌شود.</p>
                </div>
                <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className="fa-solid fa-tag" /></IconGlyph>
              </div>

              {normalizeTags((profile as any).tags).length === 0 ? (
                <div className="customer-crm-empty rounded-[18px] border border-dashed border-slate-300 bg-slate-50/75 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/35">
                  <IconGlyph tone="neutral" className="mx-auto h-11 w-11" aria-hidden="true"><i className="fa-solid fa-tags text-[22px]" /></IconGlyph>
                  <div className="mt-2.5 text-[12px] font-black text-slate-600 dark:text-slate-300">هنوز تگی برای این مشتری ثبت نشده است.</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">با افزودن تگ، مشتری را بهتر دسته‌بندی و مدیریت کنید.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizeTags((profile as any).tags).map(t => (
                    <span key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {t}
                      <button
                        type="button"
                        disabled={isSavingTags}
                        onClick={() => {
                          const current = normalizeTags((profile as any).tags);
                          updateTags(current.filter(x => x !== t));
                        }}
                        data-skip-global-button="true"
                        className="inline-flex h-5 w-5 items-center justify-center !border-0 !bg-transparent text-slate-400 !shadow-none transition hover:text-rose-500"
                        title="حذف مورد تگ"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="customer-crm-form mt-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/35">
                <label className="mb-2 block text-[12px] font-black text-slate-500 dark:text-slate-400">افزودن تگ جدید</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="نام تگ را وارد کنید..."
                    className="customer-crm-input h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={isSavingTags}
                    onClick={() => {
                      const t = tagInput.trim();
                      if (!t) return;
                      const current = normalizeTags((profile as any).tags);
                      if (current.includes(t)) { setTagInput(''); return; }
                      updateTags([...current, t]);
                      setTagInput('');
                    }}
                    className="customer-crm-add-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <i className="fa-solid fa-plus" />
                    افزودن مورد جدید
                  </button>
                </div>
              </div>
            </div>

            <div className="customer-extra-card customer-basic-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-[15px] font-black text-slate-950 dark:text-slate-50">اطلاعات پایه مشتری</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">دسترسی سریع به اطلاعات تماس و یادداشت‌های پرونده</p>
                </div>
                <IconGlyph tone="neutral" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-circle-info" /></IconGlyph>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {[
                  { label: 'شماره تماس', value: <span dir="ltr">{profile.phoneNumber || '-'}</span>, icon: 'fa-solid fa-phone' },
                  { label: 'آدرس', value: profile.address || '-', icon: 'fa-solid fa-location-dot' },
                  { label: 'تعداد تراکنش‌ها', value: ledger.length.toLocaleString('fa-IR'), icon: 'fa-solid fa-chart-simple' },
                  { label: 'یادداشت‌ها', value: profile.notes || 'بدون یادداشت', icon: 'fa-regular fa-note-sticky', full: true },
                ].map((item) => (
                  <div key={item.label} className={`customer-basic-info-card min-h-[78px] rounded-[18px] border border-slate-200 bg-slate-50/65 p-3.5 dark:border-slate-800 dark:bg-slate-900/35 ${item.full ? 'md:col-span-2' : ''}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                      <span>{item.label}</span>
                      <i className={`${item.icon} text-[13px]`} />
                    </div>
                    <div className="text-[14px] font-black leading-6 text-slate-950 dark:text-slate-50">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CustomerDetailHeroOverviewSection;
