import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip, MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { PartnerAmount, PartnerList, PartnerLoadedScope, PartnerLoadMore, PartnerPage, PartnerQueryState, PartnerRecord, PartnerSearch } from "../components/partner/PartnerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerPurchasesData } from "../types";

const filters = [{ key: "all", label: "همه" }, { key: "phone", label: "گوشی" }, { key: "product", label: "کالا" }, { key: "open", label: "تسویه باز" }];
export const PartnerPurchases: React.FC = () => {
  const query = useMiniAppPagination<PartnerPurchasesData["items"][number], PartnerPurchasesData>("/api/miniapp/partner/purchases", useCallback(item => item.ref, []));
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const filter = filters.find(item => item.key === params.get("filter"))?.key || "all";
  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); return next; }, { replace: true });
  const d = query.data;
  const visible = (d?.items || []).filter(item => {
    if (filter === "phone" || filter === "product") { if (item.type !== filter) return false; }
    if (filter === "open" && item.settlement?.code !== "open") return false;
    return `${item.name} ${item.identifier || ""}`.toLocaleLowerCase("fa-IR").includes(search.trim().toLocaleLowerCase("fa-IR"));
  });
  return <PartnerPage id="partner-purchases-title" title="کالاهای تأمین‌شده" description="سوابق کالا و گوشی ثبت‌شده برای همکاری شما" paginated>
    <PartnerQueryState query={query}>{d && <>
      <PartnerSearch value={search} onChange={value => update("q", value)} label="جستجوی نام یا شناسه در کالاهای دریافت‌شده" />
      <div className="partner-actions" aria-label="فیلتر کالاهای دریافت‌شده">{filters.map(item => <MiniAppFilterChip key={item.key} active={filter === item.key} onClick={() => update("filter", item.key)}>{item.label}</MiniAppFilterChip>)}</div>
      <PartnerLoadedScope loaded={d.items.length} visible={visible.length} total={d.total} pageMeta={query.pageMeta} />
      {visible.length ? <PartnerList>{visible.map(item => <PartnerRecord key={item.ref} record={item.ref} title={item.name} detail={`${formatCustomerDate(item.purchaseDate)} · ${item.quantity.toLocaleString("fa-IR")} ${item.unit}`}>
        {item.identifier && <p className="partner-muted">شناسه: <MiniAppBidiText>{item.identifier}</MiniAppBidiText></p>}
        <p className="partner-muted">مرجع کالا: <MiniAppBidiText>{item.ref}</MiniAppBidiText></p>
        <div><MiniAppPill>{item.type === "phone" ? "گوشی" : "کالا"}</MiniAppPill>{item.status && <span className="partner-muted"> · {item.status}</span>}</div>
        <PartnerAmount label="مبلغ تأمین ثبت‌شده" value={item.supplyAmount} field={`${item.ref}-supply`} />
        {item.settlement ? <><div><MiniAppPill tone={item.settlement.code === "open" ? "warning" : "success"}>{item.settlement.label}</MiniAppPill></div><PartnerAmount label="پرداخت‌شده بابت این گوشی" value={item.settlement.paidAmount} field={`${item.ref}-paid`} /><PartnerAmount label="مانده تسویه این گوشی" value={item.settlement.remainingAmount} field={`${item.ref}-remaining`} /></> : <p className="partner-muted">اطلاعات تسویه جداگانه برای این کالا در پاسخ سرویس وجود ندارد.</p>}
      </PartnerRecord>)}</PartnerList> : !query.error && <MiniAppDataState empty emptyText="کالایی در اطلاعات دریافت‌شده با این فیلتر پیدا نشد." />}
      <PartnerLoadMore query={query} />
    </>}</PartnerQueryState>
  </PartnerPage>;
};
