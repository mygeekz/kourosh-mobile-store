import FinancialStatusBadge from '@/components/FinancialStatusBadge';
import { IconGlyph } from '@/components/ui';
import { PeopleDetailHeroHeader } from '@/components/people/PeopleDetailFoundation';
import React from 'react';
import { resolvePartnerRiskStatus } from './partnerRiskStatus';

type Props = { ctx: Record<string, any> };

const PartnerDetailHeaderSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button, formatCurrencyText, formatPartnerLedgerCurrency, openEditModal,
    openPartnerQrLinkModal, openTelegramReport, partnerRiskFactors,
    partnerTelegramLinked, partnerTelegramLinkedAt, partnerTypeLabel, profile,
    readStoredCurrencyUnit, scrollToLedger, setIsMessageModalOpen,
    setPrefillChannels, setPrefillMessageText, soldPhonesProductSettlementBalance,
    tgQrLoading, totalCredits, totalDebits,
  } = ctx;

  const riskScore = Number(partnerRiskFactors?.score);
  const riskStatus = resolvePartnerRiskStatus(riskScore);
  const normalizedRiskScore = Number.isFinite(riskScore) ? Math.min(10, Math.max(0, riskScore)) : 0;
  const riskCircleCircumference = 282.743;
  const riskCircleOffset = riskCircleCircumference * (1 - normalizedRiskScore / 10);
  const balance = Number(profile.currentBalance || 0);
  const balanceLabel = balance > 0 ? 'بدهی به همکار' : balance < 0 ? 'طلب از همکار' : 'تسویه';
  const secureTelegram = Boolean(String(profile.telegram_user_id || '').trim());
  const legacyTelegram = partnerTelegramLinked && !secureTelegram;
  const riskTone = riskStatus.level === 'critical' ? 'danger' : riskStatus.level === 'good' ? 'success' : riskStatus.level === 'unknown' ? 'neutral' : 'warning';

  const financialMetrics = [
    { label: 'پرداختی شما', value: formatCurrencyText(Number(totalCredits || 0), readStoredCurrencyUnit()), icon: 'fa-solid fa-arrow-up', tone: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'دریافتی شما', value: formatCurrencyText(Number(totalDebits || 0), readStoredCurrencyUnit()), icon: 'fa-solid fa-arrow-down', tone: 'text-sky-600 dark:text-sky-300' },
    { label: 'سرمایه در انتظار', value: formatCurrencyText(Math.max(0, Number(soldPhonesProductSettlementBalance || 0)), readStoredCurrencyUnit()), icon: 'fa-regular fa-clock', tone: 'text-orange-600 dark:text-orange-300' },
    { label: 'پرونده فروش باز', value: `${Number(partnerRiskFactors?.openSaleFiles || 0).toLocaleString('fa-IR')} مورد`, icon: 'fa-solid fa-folder-open', tone: 'text-violet-600 dark:text-violet-300' },
  ];

  return (
    <>
      <PeopleDetailHeroHeader
        entity="partner"
        titleId="partner-detail-title"
        iconClass="fa-solid fa-user-tie"
        eyebrow="پرونده همکار"
        title={profile.partnerName}
        subtitle="نمای کامل همکار برای پیگیری ارتباطات، گردش حساب، خریدها و وضعیت همکاری."
        badges={<>
          <FinancialStatusBadge label={partnerTypeLabel} tone="partner" icon="fa-solid fa-store" size="sm" />
          <FinancialStatusBadge label={<bdi dir="ltr">{profile.phoneNumber || 'بدون شماره'}</bdi>} tone="neutral" icon="fa-solid fa-phone" size="sm" />
          <FinancialStatusBadge label={`ریسک: ${riskStatus.label} · ${Number.isFinite(riskScore) ? riskScore.toLocaleString('fa-IR') : '—'} از ۱۰`} tone={riskTone} icon={riskStatus.icon} size="sm" className={riskStatus.badgeClass} />
          <FinancialStatusBadge label={balanceLabel} tone={balance > 0 ? 'warning' : 'success'} icon="fa-solid fa-wallet" size="sm" />
          <FinancialStatusBadge label={secureTelegram ? 'تلگرام متصل امن' : legacyTelegram ? 'تلگرام قدیمی؛ فقط ارسال' : 'تلگرام متصل نیست'} tone={secureTelegram ? 'info' : legacyTelegram ? 'warning' : 'danger'} icon="fa-brands fa-telegram" size="sm" />
          {partnerTelegramLinkedAt ? <FinancialStatusBadge label={`آخرین اتصال: ${partnerTelegramLinkedAt}`} tone="neutral" icon="fa-regular fa-clock" size="sm" /> : null}
        </>}
        actions={<>
          <Button onClick={() => { setPrefillMessageText(''); setPrefillChannels(undefined); setIsMessageModalOpen(true); }} variant="primary" size="sm" leftIcon={<i className="fa-solid fa-paper-plane" />}>ارسال پیام</Button>
          <Button onClick={openTelegramReport} variant="secondary" size="sm" leftIcon={<i className="fa-brands fa-telegram" />}>ارسال گزارش</Button>
          <Button onClick={openEditModal} variant="secondary" size="sm" leftIcon={<i className="fas fa-edit" />}>ویرایش پروفایل</Button>
          <Button onClick={openPartnerQrLinkModal} disabled={tgQrLoading} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-link" />}>{secureTelegram ? 'اتصال مجدد تلگرام' : 'اتصال تلگرام'}</Button>
        </>}
      />

      <div className="grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">وضعیت حساب همکار</h2>
              <div className={`mt-2 break-words text-xl font-black ${balance > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{formatPartnerLedgerCurrency(balance, 'balance')}</div>
            </div>
            <IconGlyph tone="neutral" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-wallet" /></IconGlyph>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{balance > 0 ? 'فروشگاه به این همکار بدهکار است و زمان‌بندی تسویه باید کنترل شود.' : balance < 0 ? 'همکار به فروشگاه بدهکار است و مانده باید در خرید یا تسویه بعدی لحاظ شود.' : 'حساب همکار تسویه است و مانده فعالی ندارد.'}</p>
          <Button onClick={scrollToLedger} variant="secondary" size="md" className="mt-3 w-full" leftIcon={<i className="fa-solid fa-book-open" />}>مشاهده دفتر حساب</Button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">شاخص‌های مالی کلیدی</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {financialMetrics.map((item) => <div key={item.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><i className={`${item.icon} ${item.tone}`} aria-hidden="true" />{item.label}</div><div className="mt-2 break-words text-sm font-black text-slate-950 dark:text-slate-50">{item.value}</div></div>)}
          </div>
        </article>

        <article className={`rounded-2xl border p-4 ${riskStatus.surfaceClass}`} data-ui-partner-risk={riskStatus.level}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-black text-slate-700 dark:text-slate-200">سطح ریسک همکاری</h2><div className={`mt-1 text-xl font-black ${riskStatus.textClass}`}>{riskStatus.label}</div></div><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${riskStatus.badgeClass}`}><i className={riskStatus.icon} aria-hidden="true" /></span></div>
          <div className="mx-auto mt-3 w-32" role="progressbar" aria-label={`امتیاز ریسک همکاری: ${Number.isFinite(riskScore) ? riskScore.toLocaleString('fa-IR') : 'نامشخص'} از ۱۰`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={Number.isFinite(riskScore) ? normalizedRiskScore : undefined}>
            <div className="relative aspect-square" aria-hidden="true">
              <svg viewBox="0 0 116 116" className="h-full w-full" focusable="false">
                <circle cx="58" cy="58" r="45" fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
                <circle cx="58" cy="58" r="45" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={riskCircleCircumference} strokeDashoffset={riskCircleOffset} transform="rotate(-90 58 58)" className={riskStatus.strokeClass} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <strong className={`text-3xl font-black tabular-nums ${riskStatus.textClass}`}>{Number.isFinite(riskScore) ? riskScore.toLocaleString('fa-IR') : '—'}</strong>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">از ۱۰</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{partnerRiskFactors?.recommendation || 'پیش از خرید یا تسویه جدید، دفتر حساب و پرونده‌های باز بررسی شود.'}</p>
        </article>
      </div>
    </>
  );
};

export default PartnerDetailHeaderSection;
