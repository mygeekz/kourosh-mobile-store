import { ArrowUpRight, ReceiptText } from "lucide-react";
import React from "react";
import { MiniAppFilterChip } from "../components/MiniAppVisualPrimitives";
import { ManagerAmount, ManagerGrid, ManagerList, ManagerMetric, ManagerPage, ManagerQueryState, ManagerRecord, ManagerSection, useManagerListLocation } from "../components/manager/ManagerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffSalesSummary } from "../types";
type Summary = Partial<StaffSalesSummary> & Pick<StaffSalesSummary, "period" | "from" | "to">;
const periods = [{ key: "today", label: "امروز" }, { key: "week", label: "۷ روز اخیر" }, { key: "month", label: "ماه جاری" }] as const;
export const ManagerSales: React.FC = () => {
  const { params, update } = useManagerListLocation();
  const period = periods.find(item => item.key === params.get("period"))?.key || "today";
  const query = useMiniAppQuery<Summary>(`/api/miniapp/manager/sales-summary?period=${period}`);
  const d = query.data;
  return <ManagerPage title="گزارش فروش" description="عملکرد فروش در بازه انتخاب‌شده؛ شاخص‌های در دسترس شما">
    <div className="manager-actions" aria-label="بازه گزارش">{periods.map(item => <MiniAppFilterChip key={item.key} active={period === item.key} onClick={() => update("period", item.key)}>{item.label}</MiniAppFilterChip>)}</div>
    <ManagerQueryState query={query}>{d && <>
      <ManagerSection title="خلاصه دوره" description={`از ${formatCustomerDate(d.from)} تا ${formatCustomerDate(d.to)}`}><ManagerGrid>
        <ManagerMetric icon={ReceiptText} label="مبلغ فروش" value={d.totalRevenue} field="totalRevenue" />
        <ManagerMetric icon={ArrowUpRight} label="سود ناخالص" value={d.grossProfit} field="grossProfit" detail={typeof d.grossProfit === "number" && d.grossProfit < 0 ? "مقدار منفی: زیان ناخالص؛ پیش از هزینه‌های عملیاتی" : "پیش از هزینه‌های عملیاتی؛ سود خالص نیست"} />
        <ManagerMetric icon={ReceiptText} label="تعداد فروش" value={d.totalTransactions} money={false} />
        <ManagerMetric label="میانگین مبلغ هر فروش" value={d.averageSaleValue} field="averageSaleValue" />
      </ManagerGrid></ManagerSection>
      {d.topSellingItems && <ManagerSection title="پرفروش‌های این دوره" description="رتبه‌بندی گزارش فروش؛ فهرست کامل تراکنش‌ها نیست"><ManagerQueryState query={query} empty={!d.topSellingItems.length} emptyText="فروشی در این بازه برای رتبه‌بندی ثبت نشده است."><ManagerList>{d.topSellingItems.map((item, index) => <ManagerRecord key={`${item.itemType}-${item.id}`} title={`${(index + 1).toLocaleString("fa-IR")}. ${item.itemName}`} detail={`${item.quantitySold.toLocaleString("fa-IR")} عدد فروخته‌شده`}><ManagerAmount label="مبلغ فروش این کالا" value={item.totalRevenue} field={`sales-item-${item.id}`} /></ManagerRecord>)}</ManagerList></ManagerQueryState></ManagerSection>}
    </>}</ManagerQueryState>
  </ManagerPage>;
};
