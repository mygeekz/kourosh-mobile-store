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
<div className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <IconGlyph tone="accent" className="h-8 w-8 shrink-0 text-sm" aria-hidden="true">
                <i className="fa-solid fa-user" />
              </IconGlyph>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <i className="fa-solid fa-address-card text-xs" />
                  پرونده مشتری
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{profile.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">نمای کامل مشتری برای پیگیری ارتباطات، گردش حساب و سوابق خرید و تعاملات.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-solid fa-phone text-xs text-slate-400" /><span dir="ltr">{profile.phoneNumber || 'بدون شماره'}</span></span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1.5 font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200"><i className="fa-solid fa-bag-shopping text-xs" />{purchaseHistory.length.toLocaleString('fa-IR')} خرید ثبت‌شده</span>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${trustTone.shell}`}><i className={`${trustTone.icon} text-xs`} />امتیاز اعتماد: {customerTrustLoading ? '...' : customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}</span>
                  <FinancialStatusBadge label={profile.currentBalance > 0 ? 'بدهکار' : profile.currentBalance < 0 ? 'بستانکار' : 'تسویه'} tone={profile.currentBalance > 0 ? 'danger' : profile.currentBalance < 0 ? 'success' : 'success'} icon="fa-solid fa-wallet" size="sm" />
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${customerTelegramSecureLinked ? 'border-sky-100 bg-sky-50/90 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200' : customerTelegramLegacyDelivery ? 'border-amber-100 bg-amber-50/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200' : 'border-rose-100 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'}`}><i className={`fa-brands fa-telegram ${customerTelegramSecureLinked ? '' : 'opacity-80'}`} />{customerTelegramSecureLinked ? 'تلگرام متصل امن' : customerTelegramLegacyDelivery ? 'تلگرام قدیمی؛ فقط ارسال' : 'تلگرام لینک امن نشده'}</span>
                  {customerTelegramLinkedAt && <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-regular fa-clock text-xs text-slate-400" />آخرین اتصال: {customerTelegramLinkedAt}</span>}
                </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:max-w-[48%] lg:justify-end">
              <Button
                onClick={() => {
                  setPrefillMessageText('');
                  setPrefillChannels(undefined);
                  setIsMessageModalOpen(true);
                }}
                variant="success"
                size="sm"
                title="ارسال پیامک/تلگرام"
                leftIcon={<i className="fa-solid fa-paper-plane" />}
              >
                ارسال پیام
              </Button>
              <Button
                onClick={openTelegramReport}
                variant="primary"
                size="sm"
                title="ارسال گزارش کامل مشتری در تلگرام"
                leftIcon={<i className="fa-brands fa-telegram" />}
              >
                ارسال گزارش
              </Button>
              <Button
                onClick={openEditModal}
                variant="primary"
                size="sm"
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
                title="نمایش QR، کپی لینک، باز کردن مستقیم و ساخت QR تازه"
                leftIcon={<i className="fa-solid fa-link" />}
              >
                اتصال تلگرام
              </Button>
            </div>
          </div>

          <section className="mt-3 space-y-3" aria-label="داشبورد اعتبار و حساب مشتری">
            <div className="grid gap-2.5 lg:grid-cols-[1fr_1.25fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">وضعیت حساب مشتری</div>
                    <div className={`mt-2 text-lg font-black leading-7 ${
                      profile.currentBalance > 0 ? 'text-rose-600 dark:text-rose-300'
                        : profile.currentBalance < 0 ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-slate-900 dark:text-slate-50'
                    }`}>
                      {formatLedgerCurrency(profile.currentBalance, 'balance')}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {profile.currentBalance > 0 ? 'حساب مشتری بدهکار است و نیاز به پیگیری دریافت دارد.' : profile.currentBalance < 0 ? 'مشتری بستانکار است و باید در فروش یا تسویه بعدی لحاظ شود.' : 'حساب مشتری تسویه است و بدهی فعالی ندارد.'}
                    </p>
                  </div>
                  <i className={`fa-solid fa-wallet text-lg ${profile.currentBalance > 0 ? 'text-rose-600' : profile.currentBalance < 0 ? 'text-emerald-600' : 'text-slate-500'}`} aria-hidden="true" />
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  {profile.currentBalance > 0 ? 'پیشنهاد: قبل از فروش اعتباری جدید، دفتر حساب و تعهدات فعال بررسی شود.' : 'وضعیت حساب فعلی مانع مستقیم برای فروش جدید ایجاد نمی‌کند.'}
                </div>
                <Button
                  onClick={scrollToLedger}
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  leftIcon={<i className="fa-solid fa-book-open" />}
                >
                  مشاهده دفتر حساب
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">شاخص‌های اثرگذار بر اعتبار</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">خلاصه داده‌هایی که مستقیم روی تصمیم اعتباری اثر می‌گذارند.</p>
                  </div>
                  <IconGlyph tone="neutral" className="h-6 w-6" aria-hidden="true"><i className="fa-solid fa-chart-simple" /></IconGlyph>
                </div>
                <div className="grid gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 sm:grid-cols-2">
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
                    <div key={item.label} className={`min-h-[76px] p-2.5 ${index % 2 === 0 ? 'sm:border-s' : ''} ${index < 2 ? 'border-b' : ''} border-slate-200 dark:border-slate-800`}>
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                          <div className="mt-1.5 text-base font-black leading-6 text-slate-950 dark:text-slate-50">{item.value}</div>
                        </div>
                        <i className={`${item.icon} ${item.tone.split(' ').filter((token: string) => token.startsWith('text-') || token.startsWith('dark:text-')).join(' ')}`} aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">سطح ریسک اعتباری</div>
                    <div className={`mt-1.5 text-lg font-black ${
                      trustScore >= 68 ? 'text-emerald-600 dark:text-emerald-300'
                        : trustScore >= 50 ? 'text-amber-600 dark:text-amber-300'
                          : 'text-rose-600 dark:text-rose-300'
                    }`}>
                      {customerTrustLoading ? 'در حال محاسبه...' : customerTrustProfile ? customerTrustProfile.tierLabel : 'نامشخص'}
                    </div>
                  </div>
                  <i className={`${trustTone.icon} ${trustScore >= 68 ? 'text-emerald-600' : trustScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`} aria-hidden="true" />
                </div>

                <div className="relative mx-auto mt-2 h-28 w-28 max-w-full">
                  <svg viewBox="0 0 160 160" className="block h-28 w-28 -rotate-90" role="img" aria-label="نمودار دایره‌ای امتیاز اعتماد مشتری">
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
                    <div className="text-[28px] font-black leading-none text-slate-950 dark:text-slate-50">
                      {customerTrustLoading ? '...' : customerTrustProfile ? trustScore.toLocaleString('fa-IR') : '—'}
                    </div>
                    <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">از ۱۰۰</div>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[10px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  امتیاز فعلی: {customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">روند امتیاز اعتماد</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">تغییر امتیاز بر اساس خریدها، پرداخت‌ها، دیرکردها و چک‌های برگشتی.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">۳۰ روزه</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">مثبت: {(customerTrustHistory?.summary?.positiveEvents ?? 0).toLocaleString('fa-IR')}</span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">منفی: {(customerTrustHistory?.summary?.negativeEvents ?? 0).toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                {customerTrustHistoryLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    در حال دریافت روند امتیاز...
                  </div>
                ) : !customerTrustHistory?.timeline?.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    هنوز رویداد کافی برای نمایش روند امتیاز وجود ندارد.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
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
                          <svg viewBox={`0 0 ${width} ${height}`} className="block h-48 w-full" role="img" aria-label="روند امتیاز اعتماد">
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
                            {lastPoint ? <text x={Math.max(42, lastPoint.x - 8)} y={lastPoint.y - 14} className="fill-current text-lg font-black text-rose-600">{lastPoint.score.toLocaleString('fa-IR')}</text> : null}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-50">پیشنهاد اقدام مدیریتی</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">جمع‌بندی اقدامات پیشنهادی بر اساس ریسک، وضعیت حساب و الگوی پرداخت مشتری.</p>
                    </div>
                    <IconGlyph
                      tone={trustScore < 50 ? 'danger' : trustScore < 68 ? 'warning' : 'success'}
                      className="h-7 w-7 text-lg"
                      aria-hidden="true"
                    >
                      <i className="fa-solid fa-lightbulb" />
                    </IconGlyph>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {managerActionSummary.map((item) => (
                      <div key={item.label} className={`rounded-xl border p-3 ${item.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <IconGlyph tone={inferIconGlyphTone(item.tone)} className="h-8 w-8 shrink-0 text-sm" aria-hidden="true"><i className={item.icon} /></IconGlyph>
                            <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">جمع‌بندی</span>
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                            <div className="mt-2 text-lg font-black leading-7">{item.value}</div>
                          </div>
                          <button
                            type="button"
                            onClick={item.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-200"
                          >
                            {item.ctaLabel}
                            <i className={`${item.ctaIcon} text-xs`} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {managerActionCards.map((action) => (
                      <div key={action.title} className={`rounded-xl border p-3 ${action.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <IconGlyph tone={inferIconGlyphTone(action.iconTone)} className="h-8 w-8 shrink-0 text-sm" aria-hidden="true">
                              <i className={action.icon} />
                            </IconGlyph>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${action.tagTone}`}>
                              {action.tag}
                            </span>
                          </div>
                          <div className="text-base font-black leading-7 text-slate-900 dark:text-slate-50">{action.title}</div>
                          <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">{action.text}</p>
                          <button
                            type="button"
                            onClick={action.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            {action.ctaLabel}
                            <i className={`${action.ctaIcon} text-xs`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/35">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-50">آخرین یادداشت‌های مدیریتی</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">تاریخچه جداگانه برای تصمیم‌های اعتباری و پیگیری‌های مدیریتی.</p>
                      </div>
                      <IconGlyph tone="neutral" className="h-8 w-8 shrink-0" aria-hidden="true"><i className="fa-regular fa-note-sticky" /></IconGlyph>
                    </div>

                    {managerNotesLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        در حال دریافت یادداشت‌های مدیریتی...
                      </div>
                    ) : managerNotes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        هنوز یادداشت مدیریتی برای این مشتری ثبت نشده است.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-3">
                        {managerNotes.slice(0, 3).map((note) => (
                          <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-right dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                {note.context || 'یادداشت مدیریتی'}
                              </span>
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                {formatIsoToShamsi(note.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 max-h-[72px] overflow-hidden text-xs leading-6 text-slate-600 dark:text-slate-300">{note.note}</p>
                            {note.createdByUsername ? (
                              <div className="mt-2 text-xs font-bold text-slate-400 dark:text-slate-500">ثبت توسط: {note.createdByUsername}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                    این پیشنهادها بر اساس امتیاز اعتماد، مانده حساب، سابقه پرداخت و نشانه‌های ریسک مشتری تولید شده‌اند.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {profileOverviewStats.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-xs font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-2 text-base font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                    </div>
                    <IconGlyph tone={inferIconGlyphTone(item.tone)} className="h-8 w-8 shrink-0 text-sm" aria-hidden="true">
                      <i className={item.icon} />
                    </IconGlyph>
                  </div>
                </div>
              ))}
            </div>
          </section>

        <section className="border-t border-slate-200/80 bg-slate-50/55 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/25" aria-label="اکشن‌ها و اطلاعات تکمیلی مشتری">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_-42px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-2.5 flex items-start gap-3">
              <div className="text-right">
                <div className="flex items-center justify-start gap-2">
                  <IconGlyph tone="neutral" className="h-6 w-6 shrink-0" aria-hidden="true"><i className="fa-solid fa-bolt" /></IconGlyph>
                  <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">اکشن‌های سریع پرونده مشتری</h3>
                </div>
                <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">پرکاربردترین عملیات را بدون خروج از پرونده اجرا کنید.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className="group flex min-h-12 min-w-0 items-center justify-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <IconGlyph tone={inferIconGlyphTone(action.tone)} className="h-7 w-7 shrink-0 text-xs transition group-hover:scale-105" aria-hidden="true">
                    <i className={action.icon} />
                  </IconGlyph>
                  <div className="min-w-0 flex-1">
                    <div className="allow-truncate truncate text-xs font-black text-slate-950 dark:text-slate-50">{action.label}</div>
                    <div className="allow-truncate mt-0.5 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">{action.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-950 dark:text-slate-50">تگ‌های CRM</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">برای گروه‌بندی مشتری و فیلتر در گزارش‌ها استفاده می‌شود.</p>
                </div>
                <IconGlyph tone="neutral" className="h-8 w-8 shrink-0" aria-hidden="true"><i className="fa-solid fa-tag" /></IconGlyph>
              </div>

              {normalizeTags((profile as any).tags).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/75 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-900/35">
                  <IconGlyph tone="neutral" className="mx-auto h-8 w-8" aria-hidden="true"><i className="fa-solid fa-tags text-sm" /></IconGlyph>
                  <div className="mt-2.5 text-xs font-black text-slate-600 dark:text-slate-300">هنوز تگی برای این مشتری ثبت نشده است.</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">با افزودن تگ، مشتری را بهتر دسته‌بندی و مدیریت کنید.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizeTags((profile as any).tags).map(t => (
                    <span key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {t}
                      <button
                        type="button"
                        disabled={isSavingTags}
                        onClick={() => {
                          const current = normalizeTags((profile as any).tags);
                          updateTags(current.filter(x => x !== t));
                        }}
                        data-skip-global-button="true"
                        className="inline-flex h-5 w-5 items-center justify-center border-0 bg-transparent text-slate-400 shadow-none transition hover:text-rose-500"
                        title="حذف مورد تگ"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/35">
                <label className="mb-2 block text-xs font-black text-slate-500 dark:text-slate-400">افزودن تگ جدید</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="نام تگ را وارد کنید..."
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <i className="fa-solid fa-plus" />
                    افزودن مورد جدید
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-950 dark:text-slate-50">اطلاعات پایه مشتری</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">دسترسی سریع به اطلاعات تماس و یادداشت‌های پرونده</p>
                </div>
                <IconGlyph tone="neutral" className="h-8 w-8 shrink-0" aria-hidden="true"><i className="fa-solid fa-circle-info" /></IconGlyph>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {[
                  { label: 'شماره تماس', value: <span dir="ltr">{profile.phoneNumber || '-'}</span>, icon: 'fa-solid fa-phone' },
                  { label: 'کد ملی', value: <span dir="ltr">{profile.nationalCode || 'ثبت نشده'}</span>, icon: 'fa-solid fa-id-card' },
                  { label: 'آدرس قرارداد', value: profile.address || 'ثبت نشده', icon: 'fa-solid fa-location-dot', full: true },
                  { label: 'تعداد تراکنش‌ها', value: ledger.length.toLocaleString('fa-IR'), icon: 'fa-solid fa-chart-simple' },
                  { label: 'یادداشت‌ها', value: profile.notes || 'بدون یادداشت', icon: 'fa-regular fa-note-sticky', full: true },
                ].map((item) => (
                  <div key={item.label} className={`min-h-[60px] rounded-xl border border-slate-200 bg-slate-50/65 p-2.5 dark:border-slate-800 dark:bg-slate-900/35 ${item.full ? 'md:col-span-2' : ''}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                      <span>{item.label}</span>
                      <i className={`${item.icon} text-sm`} />
                    </div>
                    <div className="text-sm font-black leading-6 text-slate-950 dark:text-slate-50">{item.value}</div>
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
