import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip } from "../components/MiniAppVisualPrimitives";
import { PartnerLedgerRows, PartnerLoadedScope, PartnerLoadMore, PartnerPage, PartnerPosition, PartnerQueryState, PartnerSearch, PartnerSection } from "../components/partner/PartnerUI";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerLedgerData } from "../types";

export const PartnerLedger: React.FC = () => {
  const query = useMiniAppPagination<PartnerLedgerData["items"][number], PartnerLedgerData>("/api/miniapp/partner/ledger", useCallback(item => item.id, []));
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const filter = ["debit", "credit"].includes(params.get("filter") || "") ? params.get("filter") : "all";
  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); return next; }, { replace: true });
  const d = query.data;
  const visible = (d?.items || []).filter(item => (filter !== "debit" || item.debit > 0) && (filter !== "credit" || item.credit > 0) && item.description.toLocaleLowerCase("fa-IR").includes(search.trim().toLocaleLowerCase("fa-IR")));
  return <PartnerPage id="partner-ledger-title" title="گردش حساب" description="شرح، بدهکار، بستانکار و مانده هر رکورد" paginated>
    <PartnerQueryState query={query}>{d && <>
      <PartnerPosition account={d.account} />
      <p className="partner-muted">مانده حساب مربوط به پاسخ آخرین صفحه دریافت‌شده است.</p>
      <PartnerSearch value={search} onChange={value => update("q", value)} label="جستجو در شرح رکوردهای دریافت‌شده" />
      <div className="partner-actions" aria-label="فیلتر رکوردهای دریافت‌شده">{[{ key: "all", label: "همه" }, { key: "debit", label: "بدهکار" }, { key: "credit", label: "بستانکار" }].map(item => <MiniAppFilterChip key={item.key} active={filter === item.key} onClick={() => update("filter", item.key)}>{item.label}</MiniAppFilterChip>)}</div>
      <PartnerLoadedScope loaded={d.items.length} visible={visible.length} total={d.total} pageMeta={query.pageMeta} />
      <PartnerSection title="رکوردهای حساب">{visible.length ? <PartnerLedgerRows items={visible} /> : !query.error && <MiniAppDataState empty emptyText="رکوردی در اطلاعات دریافت‌شده با این فیلتر پیدا نشد." />}</PartnerSection>
      <PartnerLoadMore query={query} />
    </>}</PartnerQueryState>
  </PartnerPage>;
};
