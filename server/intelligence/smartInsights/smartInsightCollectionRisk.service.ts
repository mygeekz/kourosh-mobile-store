import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;

export type SmartInsightCollectionRiskDeps = {
  buildProductSalesCollectionsReport: (fromISO: string, toISO: string) => Promise<any>;
  buildProductSalesCollectionRisk: (rows: any[], docs: any[], limit?: number) => Promise<any>;
  enrichCollectionCenterItems: (items: any[]) => Promise<any[]>;
};

export async function buildCollectionRiskInsights({
  fromISO,
  toISO,
  addInsight,
  collectionRiskDeps,
}: {
  fromISO: string;
  toISO: string;
  addInsight: AddInsight;
  collectionRiskDeps: SmartInsightCollectionRiskDeps;
}): Promise<void> {
  try {
    const collections = await collectionRiskDeps.buildProductSalesCollectionsReport(
      fromISO,
      toISO,
    );
    const risk = await collectionRiskDeps.buildProductSalesCollectionRisk(
      collections.rows || [],
      collections.docs || [],
      10,
    );
    const riskItems = await collectionRiskDeps.enrichCollectionCenterItems(
      Array.isArray(risk?.items) ? risk.items : [],
    );
    const actionableRiskItems = riskItems.filter((x: any) => {
      const stage = String(x.kanbanStage || "");
      if (x.touchedToday) return false;
      if (stage === "settled" || stage === "promise" || stage === "waiting")
        return false;
      return ["critical", "urgent"].includes(String(x.level));
    });
    const critical = actionableRiskItems.slice(0, 5);
    if (critical.length) {
      const totalOutstanding = critical.reduce(
        (s: number, r: any) => s + smartInsightNum(r.outstandingAmount),
        0,
      );
      addInsight({
        id: "collection-risk-critical",
        type: "collection_risk",
        category: "وصول مطالبات",
        severity: "critical",
        score: Math.min(
          99,
          Math.max(...critical.map((x: any) => smartInsightNum(x.score))),
        ),
        confidence: 88,
        icon: "fa-headset",
        title: "پرونده‌های وصول فوری/بحرانی شناسایی شد",
        summary: `${formatExactNumberText(critical.length)} سند نیازمند پیگیری فوری است و مانده آن‌ها ${smartInsightMoney(totalOutstanding)} است.`,
        reasons: critical.map(
          (r: any) =>
            `${r.customerName || "مشتری"} | سند ${r.orderId}: ${r.label || "ریسک بالا"}، مانده ${smartInsightMoney(r.outstandingAmount)}، وصول ${smartInsightPercent(r.collectionRate)}`,
        ),
        metrics: [
          {
            label: "پرونده فوری",
            value: formatExactNumberText(critical.length),
          },
          {
            label: "مانده فوری",
            value: smartInsightMoney(totalOutstanding),
          },
          {
            label: "بالاترین امتیاز",
            value: formatExactNumberText(Math.max(
              ...critical.map((x: any) => smartInsightNum(x.score)),
            )),
          },
        ],
        actions: [
          {
            label: "مرکز پیگیری وصول",
            to: "/reports/collection-center",
            icon: "fa-headset",
          },
        ],
        target: { rows: critical },
      });
    }

    const totalProfit = smartInsightNum(collections.summary?.totalProfit);
    const realizedProfit = smartInsightNum(collections.summary?.realizedProfit);
    const profitCollectionRate =
      totalProfit > 0 ? (realizedProfit / totalProfit) * 100 : 100;
    if (totalProfit > 0 && profitCollectionRate < 65) {
      addInsight({
        id: "profit-quality-realized-profit",
        type: "profit_quality",
        category: "کیفیت سود",
        severity: profitCollectionRate < 40 ? "high" : "medium",
        score: 100 - profitCollectionRate,
        confidence: 76,
        icon: "fa-scale-balanced",
        title: "کیفیت سود نیاز به کنترل دارد",
        summary: `بخش قابل توجهی از سود این بازه هنوز وصول نشده؛ نرخ سود وصول‌شده ${smartInsightPercent(profitCollectionRate)} است.`,
        reasons: [
          `سود کل برآوردی: ${smartInsightMoney(totalProfit)}`,
          `سود وصول‌شده: ${smartInsightMoney(realizedProfit)}`,
          `سود وصول‌نشده: ${smartInsightMoney(totalProfit - realizedProfit)}`,
        ],
        metrics: [
          {
            label: "نرخ سود وصول‌شده",
            value: smartInsightPercent(profitCollectionRate),
          },
          {
            label: "سود وصول‌نشده",
            value: smartInsightMoney(totalProfit - realizedProfit),
          },
        ],
        actions: [
          {
            label: "فروش غیرگوشی",
            to: "/reports/product-sales",
            icon: "fa-boxes-stacked",
          },
          {
            label: "مرکز وصول",
            to: "/reports/collection-center",
            icon: "fa-headset",
          },
        ],
      });
    }
  } catch (e: any) {
    console.error("SmartInsight collection risk failed:", e?.message || e);
  }
}
