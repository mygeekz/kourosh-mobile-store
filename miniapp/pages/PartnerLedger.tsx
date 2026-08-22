import React, { useMemo, useState } from "react";
import homeHero from "../assets/home-hero.webp?inline";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ListChecks,
  Search,
  SlidersHorizontal,
} from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { PartnerCompactHeader } from "../components/premium/PartnerCompactHeader";
import {
  PremiumFilterChip,
  PremiumHeroBalance,
  PremiumIconTile,
  PremiumSearchField,
} from "../components/premium/MiniAppPremiumPrimitives";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import type { PartnerLedgerData } from "../types";

type LedgerFilter = "all" | "debit" | "credit";
const amountOnly = (value: number): string => formatToman(value).replace(" تومان", "");

export const PartnerLedger: React.FC = () => {
  const query = useMiniAppPagination<PartnerLedgerData["items"][number], PartnerLedgerData>(
    "/api/miniapp/partner/ledger",
    React.useCallback((entry) => entry.id, []),
  );
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [search, setSearch] = useState("");
  const visibleItems = useMemo(() => {
    const items = query.data?.items || [];
    const normalized = search.trim().toLocaleLowerCase("fa-IR");
    return items.filter((entry) => {
      if (filter === "debit" && entry.debit <= 0) return false;
      if (filter === "credit" && entry.credit <= 0) return false;
      return !normalized || entry.description.toLocaleLowerCase("fa-IR").includes(normalized);
    });
  }, [filter, query.data?.items, search]);

  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  const accountTone = data.account.code === "debtor" ? "red" : data.account.code === "creditor" ? "mint" : "blue";

  return (
    <section className={MINIAPP_PREMIUM.page} aria-labelledby="partner-ledger-title">
      <PartnerCompactHeader id="partner-ledger-title" eyebrow="حساب همکار" title="گردش حساب" />

      <PremiumHeroBalance
        title="موجودی فعلی"
        amount={<><span className="block">{amountOnly(data.account.amount)}</span><span className="mt-1 block text-[1rem] font-bold text-white/95">تومان</span></>}
        status={data.account.label}
        statusTone={accountTone}
        updatedLabel={<>{data.total.toLocaleString("fa-IR")} رکورد</>}
        backgroundImageSrc={homeHero}
      />

      <PremiumSearchField value={search} onChange={setSearch} placeholder="جستجو در تراکنش‌ها..." icon={Search} trailingIcon={SlidersHorizontal} />

      <div className={MINIAPP_PREMIUM.filterRail} aria-label="فیلتر گردش حساب">
        <PremiumFilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={ListChecks}>همه</PremiumFilterChip>
        <PremiumFilterChip active={filter === "credit"} tone="mint" icon={ArrowDownLeft} onClick={() => setFilter("credit")}>بستانکار</PremiumFilterChip>
        <PremiumFilterChip active={filter === "debit"} tone="red" icon={ArrowUpRight} onClick={() => setFilter("debit")}>بدهکار</PremiumFilterChip>
        <PremiumFilterChip tone="slate" icon={CalendarDays}>همه تاریخ‌ها</PremiumFilterChip>
      </div>

      <section className={`${MINIAPP_PREMIUM.card} overflow-hidden`} aria-label="فهرست گردش حساب">
        <div className="flex items-center justify-between gap-3 border-b border-premium-line/70 px-4 py-3">
          <div className="min-w-0 text-right">
            <strong className="block text-[13px] font-black text-premium-navy">تراکنش‌ها</strong>
            <span className="mt-0.5 block text-[10px] text-premium-muted">نمایش {visibleItems.length.toLocaleString("fa-IR")} مورد از {data.total.toLocaleString("fa-IR")}</span>
          </div>
          <PremiumIconTile icon={ListChecks} tone="blue" size="sm" solid={false} />
        </div>
        <MiniAppDataState empty={!visibleItems.length} emptyText={search || filter !== "all" ? "رکوردی با این فیلتر پیدا نشد." : "گردش حسابی ثبت نشده است."} />
        <ul className="m-0 list-none divide-y divide-premium-line/70 p-0">
          {visibleItems.map((entry) => {
            const isDebit = entry.debit > 0;
            const value = isDebit ? entry.debit : entry.credit;
            return (
              <li key={entry.id} className="grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                <PremiumIconTile icon={isDebit ? ArrowUpRight : ArrowDownLeft} tone={isDebit ? "red" : "mint"} size="sm" solid={false} />
                <div className="min-w-0 text-right">
                  <strong className="block text-[12px] font-black leading-6 text-premium-navy">{entry.description}</strong>
                  <span className="mt-0.5 block text-[9px] text-premium-muted">{formatCustomerDate(entry.transactionDate)} · مانده {formatToman(Math.abs(entry.balance))}</span>
                </div>
                <div className="shrink-0 text-left">
                  <strong className={`block text-[11px] font-black tabular-nums ${isDebit ? "text-premium-red" : "text-premium-green"}`}>{isDebit ? "−" : "+"}{formatToman(value)}</strong>
                  <span className="mt-1 block text-[9px] text-premium-muted">{isDebit ? "بدهکار" : "بستانکار"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className={MINIAPP_PREMIUM.loadMore}>{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
