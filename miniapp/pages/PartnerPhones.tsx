import React, { useMemo, useState } from "react";
import homeHero from "../assets/home-hero.webp?inline";
import {
  CheckCircle2,
  CircleAlert,
  Search,
  Smartphone,
  WalletCards,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { PartnerCompactHeader } from "../components/premium/PartnerCompactHeader";
import {
  PremiumFilterChip,
  PremiumHeroBalance,
  PremiumIconTile,
  PremiumPill,
  PremiumSearchField,
} from "../components/premium/MiniAppPremiumPrimitives";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerPhoneData } from "../types";

type PhoneFilter = "all" | "open" | "settled";
const amountOnly = (value: number): string => formatToman(value).replace(" تومان", "");

export const PartnerPhones: React.FC = () => {
  const query = useMiniAppPagination<PartnerPhoneData["items"][number], PartnerPhoneData>(
    "/api/miniapp/partner/phones",
    React.useCallback((phone) => phone.ref, []),
  );
  const [filter, setFilter] = useState<PhoneFilter>("all");
  const [search, setSearch] = useState("");

  const visibleItems = useMemo(() => {
    const items = query.data?.items || [];
    const normalized = search.trim().toLocaleLowerCase("fa-IR");
    return items.filter((phone) => {
      if (filter !== "all" && phone.settlement.code !== filter) return false;
      if (!normalized) return true;
      return `${phone.name} ${phone.identifier || ""}`.toLocaleLowerCase("fa-IR").includes(normalized);
    });
  }, [filter, query.data?.items, search]);

  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  const loadedOpen = data.items.filter((phone) => phone.settlement.code === "open").length;
  const statusTone = data.summary.remainingAmount > 0 ? "orange" : "mint";
  const statusLabel = data.summary.remainingAmount > 0 ? "تسویه باز" : "تسویه کامل";

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-phones-title">
      <PartnerCompactHeader id="partner-phones-title" eyebrow="وضعیت دستگاه‌ها" title="تسویه گوشی‌ها" />

      <PremiumHeroBalance
        title="مانده تسویه"
        amount={<><span className="block">{amountOnly(data.summary.remainingAmount)}</span><span className="mt-1 block text-[1rem] font-bold text-white/95">تومان</span></>}
        status={statusLabel}
        statusTone={statusTone}
        updatedLabel={<>{loadedOpen.toLocaleString("fa-IR")} دستگاه باز</>}
        backgroundImageSrc={homeHero}
      />

      <PremiumSearchField value={search} onChange={setSearch} placeholder="جستجو در گوشی‌ها..." icon={Search} />
      <div className={MINIAPP_PREMIUM.filterRail} aria-label="فیلتر تسویه گوشی‌ها">
        <PremiumFilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={Smartphone}>همه</PremiumFilterChip>
        <PremiumFilterChip active={filter === "open"} tone="orange" icon={CircleAlert} onClick={() => setFilter("open")}>در انتظار</PremiumFilterChip>
        <PremiumFilterChip active={filter === "settled"} tone="mint" icon={CheckCircle2} onClick={() => setFilter("settled")}>تسویه‌شده</PremiumFilterChip>
      </div>

      <MiniAppDataState empty={!visibleItems.length} emptyText={search || filter !== "all" ? "گوشی‌ای با این فیلتر پیدا نشد." : "گوشی فروخته‌شده‌ای برای تسویه وجود ندارد."} />
      <section className="space-y-3" aria-label="فهرست تسویه گوشی‌ها">
        {visibleItems.map((phone) => {
          const isOpen = phone.settlement.code === "open";
          return (
            <article key={phone.ref} className={`${MINIAPP_PREMIUM.card} p-4`}>
              <div className="flex items-start gap-3">
                <PremiumIconTile icon={Smartphone} tone={isOpen ? "orange" : "mint"} size="md" solid={false} />
                <div className="min-w-0 flex-1 text-right">
                  <strong className="block text-[13px] font-black leading-6 text-premium-navy">{phone.name}</strong>
                  <span className="mt-0.5 block truncate text-[9px] text-premium-muted" dir="ltr">IMEI: {phone.identifier || "—"}</span>
                  <span className="mt-1 block text-[9px] text-premium-muted">{formatCustomerDate(phone.purchaseDate)} · {phone.status || "وضعیت ثبت نشده"}</span>
                </div>
                <PremiumPill tone={isOpen ? "orange" : "mint"} compact>{phone.settlement.label}</PremiumPill>
              </div>
              <dl className="mt-3 grid grid-cols-3 divide-x-reverse divide-x divide-premium-line/70 border-t border-premium-line/70 pt-3 text-center text-[9px]">
                <div><dt className="text-premium-muted">مبلغ</dt><dd className="m-0 mt-1 font-black tabular-nums text-premium-navy">{formatToman(phone.settlement.amount)}</dd></div>
                <div><dt className="text-premium-muted">پرداخت</dt><dd className="m-0 mt-1 font-black tabular-nums text-premium-green">{formatToman(phone.settlement.paidAmount)}</dd></div>
                <div><dt className="text-premium-muted">مانده</dt><dd className={`m-0 mt-1 font-black tabular-nums ${isOpen ? "text-premium-orange-deep" : "text-premium-green"}`}>{formatToman(phone.settlement.remainingAmount)}</dd></div>
              </dl>
              {phone.settlement.lastPaymentDate ? <div className="mt-3 flex items-center gap-1.5 text-[9px] text-premium-muted"><WalletCards size={13} aria-hidden="true" />آخرین پرداخت: {formatCustomerDate(phone.settlement.lastPaymentDate)}</div> : null}
            </article>
          );
        })}
      </section>

      <p className="m-0 text-center text-[10px] text-premium-muted">نمایش {data.items.length.toLocaleString("fa-IR")} از {data.total.toLocaleString("fa-IR")}</p>
      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className={MINIAPP_PREMIUM.loadMore}>{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
