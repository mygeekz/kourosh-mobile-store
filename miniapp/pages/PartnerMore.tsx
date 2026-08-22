import React from "react";
import {
  Boxes,
  ListChecks,
  Package,
  Smartphone,
  UserCheck,
  WalletCards,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { PartnerCompactHeader } from "../components/premium/PartnerCompactHeader";
import {
  PremiumIconTile,
  PremiumInfoRow,
  PremiumPill,
  PremiumSectionHeading,
} from "../components/premium/MiniAppPremiumPrimitives";
import { formatPartnerType, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerAccountData } from "../types";

export const PartnerMore: React.FC = () => {
  const query = useMiniAppQuery<PartnerAccountData>("/api/miniapp/partner/account");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  const accountTone = data.account.code === "debtor" ? "red" : data.account.code === "creditor" ? "mint" : "blue";

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-more-title">
      <PartnerCompactHeader id="partner-more-title" eyebrow="حساب همکار" title="بیشتر" />

      <section className={`${MINIAPP_PREMIUM.card} p-4`} aria-labelledby="partner-more-overview">
        <div className="flex items-start gap-3">
          <PremiumIconTile icon={WalletCards} tone={accountTone} size="lg" solid={false} />
          <div className="min-w-0 flex-1 text-right">
            <span className="block text-[9px] font-black text-premium-blue">{formatPartnerType(data.partner.type)}</span>
            <h2 id="partner-more-overview" className="m-0 mt-1 truncate text-[1.2rem] font-black text-premium-navy">{data.partner.name}</h2>
            <strong className="mt-2 block text-[1.15rem] font-black tabular-nums text-premium-navy">{formatToman(data.account.amount)}</strong>
          </div>
          <PremiumPill tone={accountTone} compact>{data.account.label}</PremiumPill>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-premium-line/70 pt-3">
          <span className="text-[10px] text-premium-muted">کل اقلام تأمین‌شده</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-premium-navy"><Boxes size={14} aria-hidden="true" />{data.supplied.total.toLocaleString("fa-IR")} آیتم</span>
        </div>
      </section>

      <section className="space-y-2.5" aria-labelledby="partner-more-financial">
        <PremiumSectionHeading title="حساب و مالی" subtitle="اطلاعات و رکوردهای مالی همکاری" />
        <div id="partner-more-financial" className="space-y-2.5">
          <PremiumInfoRow to="/account" title="اطلاعات حساب" subtitle="مشخصات و خلاصه همکاری" icon={UserCheck} tone="violet" />
          <PremiumInfoRow to="/ledger" title="گردش حساب" subtitle="تمام رکوردهای بدهکار و بستانکار" icon={ListChecks} tone="blue" />
        </div>
      </section>

      <section className="space-y-2.5" aria-labelledby="partner-more-operations">
        <PremiumSectionHeading title="کالا و تسویه" subtitle="اقلام تأمین‌شده و وضعیت دستگاه‌ها" />
        <div id="partner-more-operations" className="space-y-2.5">
          <PremiumInfoRow to="/purchases" title="کالاها" subtitle="اقلام و گوشی‌های تأمین‌شده" icon={Package} tone="orange" />
          <PremiumInfoRow to="/phones" title="تسویه گوشی‌ها" subtitle="مانده و وضعیت تسویه دستگاه‌ها" icon={Smartphone} tone="mint" />
        </div>
      </section>
    </section>
  );
};
