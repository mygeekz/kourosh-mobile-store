import React from "react";
import homeHero from "../assets/home-hero.webp?inline";
import {
  Boxes,
  ListChecks,
  Smartphone,
  WalletCards,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import {
  PremiumHeroBalance,
  PremiumIconTile,
  PremiumQuickAction,
  PremiumSectionHeading,
} from "../components/premium/MiniAppPremiumPrimitives";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { PartnerCompactHeader } from "../components/premium/PartnerCompactHeader";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerHomeData, PartnerPhoneData } from "../types";

const accountTone = (code: PartnerHomeData["account"]["code"]) =>
  code === "debtor" ? "red" : code === "creditor" ? "mint" : "blue";

const amountOnly = (value: number): string => formatToman(value).replace(" تومان", "");

export const PartnerHome: React.FC = () => {
  const query = useMiniAppQuery<PartnerHomeData>("/api/miniapp/partner/home");
  const recentPhones = useMiniAppQuery<PartnerPhoneData>(
    "/api/miniapp/partner/phones?page=1&pageSize=3",
    { availability: "secondary" },
  );
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-home-title">
      <PartnerCompactHeader id="partner-home-title" title={`سلام ${data.partner.name}`} eyebrow="حساب همکار" />

      <PremiumHeroBalance
        title="موجودی فعلی"
        amount={<>
          <span className="block">{amountOnly(data.account.amount)}</span>
          <span className="mt-1 block text-[1rem] font-bold text-white/95">تومان</span>
        </>}
        status={data.account.label}
        statusTone={accountTone(data.account.code)}
        updatedLabel={<>{formatCustomerDate(data.ledger.lastActivity)}</>}
        backgroundImageSrc={homeHero}
      />

      <section className="space-y-2.5" aria-labelledby="partner-home-actions">
        <PremiumSectionHeading title="دسترسی سریع" subtitle="بخش‌های اصلی حساب همکار" />
        <div id="partner-home-actions" className="grid grid-cols-2 gap-2.5">
          <PremiumQuickAction to="/ledger" title="گردش حساب" subtitle="مشاهده تراکنش‌ها" icon={ListChecks} tone="blue" compact />
          <PremiumQuickAction to="/purchases" title="کالاها" subtitle="اقلام تأمین‌شده" icon={Boxes} tone="violet" compact />
          <PremiumQuickAction to="/phones" title="تسویه گوشی‌ها" subtitle="وضعیت تسویه" icon={Smartphone} tone="mint" compact />
          <PremiumQuickAction to="/account" title="حساب" subtitle="خلاصه همکاری" icon={WalletCards} tone="orange" compact />
        </div>
      </section>

      <section className={`${MINIAPP_PREMIUM.card} overflow-hidden`} aria-labelledby="partner-recent-activity">
        <div className="p-4 pb-2.5">
          <PremiumSectionHeading title="آخرین فعالیت‌ها" subtitle="آخرین گوشی‌های ثبت‌شده" actionLabel="مشاهده همه" actionTo="/phones" />
        </div>
        {recentPhones.data?.items?.length ? (
          <ul className="m-0 list-none divide-y divide-premium-line/70 p-0">
            {recentPhones.data.items.slice(0, 3).map((item) => (
              <li key={item.ref} className="flex items-center gap-3 px-4 py-3">
                <PremiumIconTile icon={Smartphone} tone={item.settlement.code === "open" ? "orange" : "mint"} size="sm" solid={false} />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] font-black text-premium-navy">{item.name}</strong>
                  <span className="mt-0.5 block truncate text-[10px] text-premium-muted">
                    {formatCustomerDate(item.purchaseDate)}{item.identifier ? <> · <MiniAppBidiText>{item.identifier}</MiniAppBidiText></> : null}
                  </span>
                </div>
                <strong className="shrink-0 text-[11px] font-black tabular-nums text-premium-green">{formatToman(item.settlement.amount)}</strong>
              </li>
            ))}
          </ul>
        ) : recentPhones.loading ? (
          <div className="px-4 pb-5 text-xs text-premium-muted">در حال دریافت آخرین گوشی‌ها…</div>
        ) : (
          <div className="px-4 pb-5 text-xs text-premium-muted">هنوز گوشی‌ای ثبت نشده است.</div>
        )}
      </section>
    </section>
  );
};
