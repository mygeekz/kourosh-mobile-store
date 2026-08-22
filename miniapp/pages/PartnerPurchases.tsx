import React, { useMemo, useState } from "react";
import {
  Boxes,
  CircleAlert,
  Package,
  Search,
  Smartphone,
  Tag,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { PartnerCompactHeader } from "../components/premium/PartnerCompactHeader";
import {
  PremiumFilterChip,
  PremiumIconTile,
  PremiumPill,
  PremiumSearchField,
  PremiumSectionHeading,
} from "../components/premium/MiniAppPremiumPrimitives";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerPurchasesData } from "../types";

type ProductFilter = "all" | "phone" | "product" | "open";

export const PartnerPurchases: React.FC = () => {
  const query = useMiniAppPagination<PartnerPurchasesData["items"][number], PartnerPurchasesData>(
    "/api/miniapp/partner/purchases",
    React.useCallback((item) => item.ref, []),
  );
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [search, setSearch] = useState("");

  const visibleItems = useMemo(() => {
    const items = query.data?.items || [];
    const normalized = search.trim().toLocaleLowerCase("fa-IR");
    return items.filter((item) => {
      if (filter === "phone" && item.type !== "phone") return false;
      if (filter === "product" && item.type !== "product") return false;
      if (filter === "open" && item.settlement?.code !== "open") return false;
      if (!normalized) return true;
      return `${item.name} ${item.identifier || ""}`.toLocaleLowerCase("fa-IR").includes(normalized);
    });
  }, [filter, query.data?.items, search]);

  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  const phoneCount = data.items.filter((item) => item.type === "phone").length;
  const productCount = data.items.filter((item) => item.type === "product").length;
  const openCount = data.items.filter((item) => item.settlement?.code === "open").length;
  const loadedSupplyAmount = data.items.reduce((sum, item) => sum + item.supplyAmount, 0);

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-purchases-title">
      <PartnerCompactHeader id="partner-purchases-title" eyebrow="اقلام تأمین‌شده" title="کالاها" />

      <section className={`${MINIAPP_PREMIUM.card} p-4`} aria-labelledby="partner-purchases-overview">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-right">
            <PremiumSectionHeading title="نمای کلی کالاها" subtitle={`نمایش ${data.items.length.toLocaleString("fa-IR")} مورد از ${data.total.toLocaleString("fa-IR")}`} />
            <strong className="mt-3 block text-[1.55rem] font-black tabular-nums text-premium-navy">{formatToman(loadedSupplyAmount)}</strong>
            <span className="mt-0.5 block text-[10px] text-premium-muted">ارزش اقلام نمایش‌داده‌شده</span>
          </div>
          <PremiumIconTile icon={Boxes} tone="violet" size="lg" solid={false} />
        </div>
        <div id="partner-purchases-overview" className="mt-4 grid grid-cols-3 divide-x-reverse divide-x divide-premium-line/70 border-t border-premium-line/70 pt-3 text-center">
          <div><span className="block text-[9px] text-premium-muted">گوشی</span><strong className="mt-1 block text-[15px] font-black text-premium-blue">{phoneCount.toLocaleString("fa-IR")}</strong></div>
          <div><span className="block text-[9px] text-premium-muted">کالا</span><strong className="mt-1 block text-[15px] font-black text-premium-green">{productCount.toLocaleString("fa-IR")}</strong></div>
          <div><span className="block text-[9px] text-premium-muted">تسویه باز</span><strong className="mt-1 block text-[15px] font-black text-premium-orange-deep">{openCount.toLocaleString("fa-IR")}</strong></div>
        </div>
      </section>

      <PremiumSearchField value={search} onChange={setSearch} placeholder="جستجو در کالاها..." icon={Search} />

      <div className={MINIAPP_PREMIUM.filterRail} aria-label="فیلتر کالاها">
        <PremiumFilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={Boxes}>همه</PremiumFilterChip>
        <PremiumFilterChip active={filter === "phone"} tone="blue" onClick={() => setFilter("phone")} icon={Smartphone}>گوشی</PremiumFilterChip>
        <PremiumFilterChip active={filter === "product"} tone="mint" onClick={() => setFilter("product")} icon={Package}>کالا</PremiumFilterChip>
        <PremiumFilterChip active={filter === "open"} tone="orange" onClick={() => setFilter("open")} icon={CircleAlert}>تسویه باز</PremiumFilterChip>
      </div>

      <MiniAppDataState empty={!visibleItems.length} emptyText={search || filter !== "all" ? "کالایی با این فیلتر پیدا نشد." : "کالایی برای این حساب ثبت نشده است."} />

      <section className="space-y-3" aria-label="فهرست کالاهای همکار">
        {visibleItems.map((item) => {
          const isPhone = item.type === "phone";
          const isOpen = item.settlement?.code === "open";
          return (
            <article key={item.ref} className={`${MINIAPP_PREMIUM.card} p-4`}>
              <div className="flex items-start gap-3">
                <PremiumIconTile icon={isPhone ? Smartphone : Package} tone={isPhone ? "blue" : "violet"} size="md" solid={false} />
                <div className="min-w-0 flex-1 text-right">
                  <strong className="block text-[13px] font-black leading-6 text-premium-navy">{item.name}</strong>
                  <span className="mt-0.5 block truncate text-[9px] text-premium-muted" dir={isPhone ? "ltr" : undefined}>{isPhone ? item.identifier || "شناسه ثبت نشده" : `${item.quantity.toLocaleString("fa-IR")} ${item.unit}`}</span>
                  <span className="mt-1 block text-[9px] text-premium-muted">{formatCustomerDate(item.purchaseDate)}</span>
                </div>
                {item.settlement ? <PremiumPill tone={isOpen ? "orange" : "mint"} compact>{item.settlement.label}</PremiumPill> : <PremiumPill tone="slate" icon={Tag} compact>{item.status || "ثبت‌شده"}</PremiumPill>}
              </div>
              <div className="mt-3 grid grid-cols-2 divide-x-reverse divide-x divide-premium-line/70 border-t border-premium-line/70 pt-3 text-center">
                <div className="px-2"><span className="block text-[9px] text-premium-muted">مبلغ تأمین</span><strong className="mt-1 block text-[11px] font-black tabular-nums text-premium-navy">{formatToman(item.supplyAmount)}</strong></div>
                <div className="px-2"><span className="block text-[9px] text-premium-muted">مانده تسویه</span><strong className={`mt-1 block text-[11px] font-black tabular-nums ${isOpen ? "text-premium-orange-deep" : "text-premium-green"}`}>{item.settlement ? formatToman(item.settlement.remainingAmount) : "—"}</strong></div>
              </div>
            </article>
          );
        })}
      </section>

      <p className="m-0 text-center text-[10px] text-premium-muted">نمایش {data.items.length.toLocaleString("fa-IR")} از {data.total.toLocaleString("fa-IR")}</p>
      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className={MINIAPP_PREMIUM.loadMore}>{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
