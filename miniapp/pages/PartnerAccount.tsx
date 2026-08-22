import React from "react";
import homeHero from "../assets/home-hero.webp?inline";
import {
  Boxes,
  ListChecks,
  Package,
  Radio,
  Smartphone,
  Store,
  UserCheck,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import {
  PremiumHeroBalance,
  PremiumInfoRow,
  PremiumPill,
  PremiumSectionHeading,
} from "../components/premium/MiniAppPremiumPrimitives";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import { formatPartnerType, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { isMiniAppAvailabilityOnlineTone, resolveMiniAppAvailabilityPresentation } from "../reference/miniAppDataAvailability";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerAccountData } from "../types";

const amountOnly = (value: number): string => formatToman(value).replace(" تومان", "");

export const PartnerAccount: React.FC = () => {
  const query = useMiniAppQuery<PartnerAccountData>("/api/miniapp/partner/account");
  const { meta, pending } = useMiniAppDataAvailability();
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;

  const data = query.data;
  const accountTone = data.account.code === "debtor" ? "red" : data.account.code === "creditor" ? "mint" : "blue";
  const availabilityView = !pending && meta ? resolveMiniAppAvailabilityPresentation(meta) : null;
  const availabilityOnline = availabilityView ? isMiniAppAvailabilityOnlineTone(availabilityView.tone) : false;
  const availabilityTone = availabilityOnline ? "mint" : availabilityView?.tone === "very_stale" ? "red" : availabilityView ? "orange" : "blue";
  const storeTone = availabilityOnline ? "blue" : availabilityTone;

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-account-title">
      <header className={`${MINIAPP_PREMIUM.card} px-3.5 py-2`}>
        <div dir="ltr" className="flex min-w-0 items-center justify-between gap-2.5">
          <div className="flex shrink-0 items-center gap-1">
            {availabilityView ? (
              <PremiumPill
                tone={availabilityTone}
                icon={availabilityOnline ? Radio : Store}
                compact
                className="whitespace-nowrap shadow-none"
              >
                {availabilityView.badge}
              </PremiumPill>
            ) : null}
            <PremiumPill
              tone={storeTone}
              icon={Store}
              compact
              className="whitespace-nowrap shadow-none"
            >
              {availabilityView ? availabilityView.title : "فروشگاه آنلاین"}
            </PremiumPill>
          </div>
          <div dir="rtl" className="min-w-0 flex-1 text-right">
            <p className="m-0 text-[9px] font-black leading-4 text-premium-blue">حساب همکار</p>
            <h1 id="partner-account-title" className="m-0 truncate text-right text-[1.05rem] font-black leading-6 tracking-tight text-premium-navy">{data.partner.name}</h1>
          </div>
        </div>
        {availabilityView && meta?.source === "snapshot" ? (
          <p dir="rtl" className={`mb-0 mt-1.5 text-right text-[9px] font-bold leading-4 ${availabilityOnline ? "text-premium-green" : "text-premium-orange-deep"}`}>{availabilityView.detail}</p>
        ) : null}
      </header>

      <PremiumHeroBalance
        title="مانده دقیق همکاری"
        amount={(
          <>
            <span className="block">{amountOnly(data.account.amount)}</span>
            <span className="mt-1 block text-[1rem] font-bold text-white/95">تومان</span>
          </>
        )}
        status={data.account.label}
        statusTone={accountTone}
        updatedLabel={<>{formatPartnerType(data.partner.type)}</>}
        backgroundImageSrc={homeHero}
      />

      <section className={`${MINIAPP_PREMIUM.card} overflow-hidden p-4`} aria-labelledby="partner-account-summary">
        <PremiumSectionHeading title="خلاصه همکاری" subtitle="نمای کلی ارقام حساب و تأمین" />
        <div id="partner-account-summary" className="mt-3 grid grid-cols-2 gap-2.5">
          <div className={`${MINIAPP_PREMIUM.insetCard} p-3`}>
            <span className="block text-[10px] font-bold text-premium-muted">جمع بدهکار</span>
            <strong className="mt-1.5 block truncate text-[15px] font-black tabular-nums text-premium-red">{formatToman(data.totalDebit)}</strong>
          </div>
          <div className={`${MINIAPP_PREMIUM.insetCard} p-3`}>
            <span className="block text-[10px] font-bold text-premium-muted">جمع بستانکار</span>
            <strong className="mt-1.5 block truncate text-[15px] font-black tabular-nums text-premium-green">{formatToman(data.totalCredit)}</strong>
          </div>
          <div className={`${MINIAPP_PREMIUM.insetCard} p-3`}>
            <span className="block text-[10px] font-bold text-premium-muted">جمع تأمین</span>
            <strong className="mt-1.5 block truncate text-[14px] font-black tabular-nums text-premium-navy">{formatToman(data.supplied.totalSupplyAmount)}</strong>
          </div>
          <div className={`${MINIAPP_PREMIUM.insetCard} p-3`}>
            <span className="block text-[10px] font-bold text-premium-muted">مانده تسویه گوشی</span>
            <strong className="mt-1.5 block truncate text-[14px] font-black tabular-nums text-premium-navy">{formatToman(data.phoneSettlement.remainingAmount)}</strong>
          </div>
          <div className={`${MINIAPP_PREMIUM.insetCard} col-span-2 flex items-center justify-between gap-3 p-3`}>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-premium-muted">کل اقلام تأمین‌شده</span>
              <strong className="mt-1 block text-[16px] font-black tabular-nums text-premium-navy">{data.supplied.total.toLocaleString("fa-IR")} آیتم</strong>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] border border-premium-blue/[0.15] bg-premium-blue-soft text-premium-blue" aria-hidden="true">
              <Boxes size={19} strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </section>

      <section className={`${MINIAPP_PREMIUM.card} p-4`} aria-labelledby="partner-profile-info">
        <PremiumSectionHeading title="اطلاعات حساب" subtitle="اطلاعات ثبت‌شده برای همکاری شما" />
        <dl id="partner-profile-info" className="mt-3 divide-y divide-premium-line/70 text-sm">
          <div className="flex min-h-12 items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-premium-muted"><UserCheck size={16} />نوع همکاری</dt>
            <dd className="m-0 font-black text-premium-navy">{formatPartnerType(data.partner.type)}</dd>
          </div>
          {data.partner.contactName ? <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-premium-muted">شخص رابط</dt><dd className="m-0 font-black text-premium-navy">{data.partner.contactName}</dd></div> : null}
          {data.partner.phoneNumber ? <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-premium-muted">شماره تماس</dt><dd className="m-0 font-black text-premium-navy" dir="ltr">{data.partner.phoneNumber}</dd></div> : null}
          {data.partner.email ? <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-premium-muted">ایمیل</dt><dd className="m-0 max-w-[55%] truncate font-black text-premium-navy" dir="ltr">{data.partner.email}</dd></div> : null}
        </dl>
      </section>

      <section className="space-y-2.5" aria-label="میانبرهای حساب">
        <PremiumSectionHeading title="دسترسی به جزئیات" subtitle="بخش‌های مرتبط با حساب همکار" />
        <PremiumInfoRow to="/ledger" title="گردش حساب" subtitle="مشاهده تمام رکوردهای مالی حساب" icon={ListChecks} tone="blue" />
        <PremiumInfoRow to="/purchases" title="کالاها" subtitle="اقلام و گوشی‌های تأمین‌شده" icon={Package} tone="violet" />
        <PremiumInfoRow to="/phones" title="تسویه گوشی‌ها" subtitle="بررسی مانده و وضعیت دستگاه‌ها" icon={Smartphone} tone="mint" />
      </section>
    </section>
  );
};
