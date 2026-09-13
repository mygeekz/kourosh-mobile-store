import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { RecordMeta } from "../components/ui/MiniAppRecord";
import { Smartphone, Tag } from "lucide-react";
import { MiniAppFilterChip, MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { PartnerList, PartnerLoadedScope, PartnerLoadMore, PartnerMetric, PartnerPage, PartnerQueryState, PartnerRecord, PartnerSearch, PartnerSection, PartnerSettlement } from "../components/partner/PartnerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerPhoneData } from "../types";

const filters = [{ key: "all", label: "همه" }, { key: "open", label: "تسویه باز" }, { key: "settled", label: "تسویه‌شده" }];
export const PartnerPhones: React.FC = () => {
  const query = useMiniAppPagination<PartnerPhoneData["items"][number], PartnerPhoneData>("/api/miniapp/partner/phones", useCallback(item => item.ref, []));
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const filter = filters.find(item => item.key === params.get("filter"))?.key || "all";
  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); return next; }, { replace: true });
  const d = query.data;
  const visible = (d?.items || []).filter(item => (filter === "all" || item.settlement.code === filter) && `${item.name} ${item.identifier || ""}`.toLocaleLowerCase("fa-IR").includes(search.trim().toLocaleLowerCase("fa-IR")));
  return <PartnerPage id="partner-phones-title" title="تسویه گوشی‌ها" description="پرداخت‌ها و مانده هر گوشی؛ بدون تغییر در حساب" paginated>
    <PartnerQueryState query={query}>{d && <>
      {d.summary && <PartnerSection title="خلاصه تسویه" description="خلاصه پاسخ آخرین صفحه؛ با فیلتر محلی محاسبه مجدد نمی‌شود"><div className="partner-grid">
        <PartnerMetric label="مبلغ تسویه" value={d.summary.amount} field="summaryAmount" /><PartnerMetric label="پرداخت‌شده" value={d.summary.paidAmount} field="summaryPaid" /><PartnerMetric label="مانده تسویه" value={d.summary.remainingAmount} field="summaryRemaining" />
      </div></PartnerSection>}
      <PartnerSearch value={search} onChange={value => update("q", value)} label="جستجوی نام یا شناسه در گوشی‌های دریافت‌شده" />
      <div className="partner-actions" aria-label="فیلتر تسویه‌های دریافت‌شده">{filters.map(item => <MiniAppFilterChip key={item.key} active={filter === item.key} onClick={() => update("filter", item.key)}>{item.label}</MiniAppFilterChip>)}</div>
      <PartnerLoadedScope loaded={d.items.length} visible={visible.length} total={d.total} pageMeta={query.pageMeta} />
      {visible.length ? <PartnerList>{visible.map(item => <PartnerRecord key={item.ref} record={item.ref} title={item.name} icon={Smartphone} status={<MiniAppPill tone={item.settlement.code === "open" ? "warning" : "success"}>{item.settlement.label}</MiniAppPill>} detail={<>
        <RecordMeta>{formatCustomerDate(item.purchaseDate)} · {item.status || "وضعیت ثبت نشده"}</RecordMeta>
        <RecordMeta icon={Tag}>شناسه: {item.identifier ? <MiniAppBidiText>{item.identifier}</MiniAppBidiText> : "ثبت نشده"} · مرجع کالا: <MiniAppBidiText>{item.ref}</MiniAppBidiText></RecordMeta>
      </>}>
        <PartnerSettlement settlement={item.settlement} record={item.ref} showStatus={false} />
      </PartnerRecord>)}</PartnerList> : !query.error && <MiniAppDataState empty emptyText="گوشی‌ای در اطلاعات دریافت‌شده با این فیلتر پیدا نشد." />}
      <PartnerLoadMore query={query} />
    </>}</PartnerQueryState>
  </PartnerPage>;
};
