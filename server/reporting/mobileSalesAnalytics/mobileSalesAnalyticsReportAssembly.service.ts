import {
  mobileAnalyticsNumber,
  mobileAnalyticsPct,
  mobileAnalyticsRound,
  sortMobileAnalyticsRowsBySaleDateDesc,
  sumMobileAnalyticsBy,
} from "./mobileSalesAnalyticsUtils";

type BuildMobileAnalyticsReportPayloadArgs = {
  fromJ: string;
  toJ: string;
  cashRows: any[];
  installmentRows: any[];
  partnerCapitalRows: any[];
  partnerCapitalSummary: any;
};

export const buildMobileAnalyticsReportPayload = ({
  fromJ,
  toJ,
  cashRows,
  installmentRows,
  partnerCapitalRows,
  partnerCapitalSummary,
}: BuildMobileAnalyticsReportPayloadArgs) => {
  const cashSales = sumMobileAnalyticsBy(cashRows, "salePrice");
  const instSales = sumMobileAnalyticsBy(installmentRows, "contractTotal");
  const instReceived = sumMobileAnalyticsBy(installmentRows, "receivedAmount");
  const instOutstanding = sumMobileAnalyticsBy(
    installmentRows,
    "outstandingAmount",
  );
  const cashProfit = sumMobileAnalyticsBy(cashRows, "profit");
  const cashRealProfit = sumMobileAnalyticsBy(cashRows, "realProfit");
  const instFullProfit = sumMobileAnalyticsBy(installmentRows, "fullProfit");
  const instRealizedProfit = sumMobileAnalyticsBy(
    installmentRows,
    "realizedProfit",
  );
  const instUnrecognizedProfit = sumMobileAnalyticsBy(
    installmentRows,
    "unrecognizedProfit",
  );
  const highRiskRows = installmentRows.filter((r: any) =>
    ["critical", "high"].includes(String(r.riskLevel)),
  );
  const referencePricedRows = [...cashRows, ...installmentRows].filter(
    (r: any) => r.referencePriceAvailable === true,
  );
  const allRealProfitRows = [
    ...cashRows.filter((r: any) => r.referencePriceAvailable === true).map((r: any) => ({
      ...r,
      fullProfit: r.profit,
      realizedProfit: r.profit,
      unrecognizedProfit: 0,
      riskLabel: "—",
    })),
    ...installmentRows.filter((r: any) => r.referencePriceAvailable === true),
  ]
    .sort(
      (a: any, b: any) =>
        Math.abs(mobileAnalyticsNumber(b.replacementDelta)) -
        Math.abs(mobileAnalyticsNumber(a.replacementDelta)),
    )
    .slice(0, 80);

  return {
    from: fromJ,
    to: toJ,
    summary: {
      totalPhones: cashRows.length + installmentRows.length,
      cashCount: cashRows.length,
      installmentCount: installmentRows.length,
      totalSales: mobileAnalyticsRound(cashSales + instSales),
      cashSales: mobileAnalyticsRound(cashSales),
      installmentSales: mobileAnalyticsRound(instSales),
      cashProfit: mobileAnalyticsRound(cashProfit),
      cashRealProfit: mobileAnalyticsRound(cashRealProfit),
      installmentFullProfit: mobileAnalyticsRound(instFullProfit),
      installmentRealizedProfit: mobileAnalyticsRound(instRealizedProfit),
      installmentUnrecognizedProfit: mobileAnalyticsRound(instUnrecognizedProfit),
      installmentReceived: mobileAnalyticsRound(instReceived),
      installmentOutstanding: mobileAnalyticsRound(instOutstanding),
      installmentCollectionRate: mobileAnalyticsRound(
        mobileAnalyticsPct(instReceived, instSales),
      ),
      highRiskCount: highRiskRows.length,
      criticalRiskCount: installmentRows.filter(
        (r: any) => r.riskLevel === "critical",
      ).length,
      averageDownPaymentRate: mobileAnalyticsRound(
        installmentRows.length
          ? installmentRows.reduce(
              (s: number, r: any) =>
                s + mobileAnalyticsNumber(r.downPaymentRate),
              0,
            ) / installmentRows.length
          : 0,
      ),
      totalReplacementDelta: mobileAnalyticsRound(
        sumMobileAnalyticsBy(cashRows, "replacementDelta") +
          sumMobileAnalyticsBy(installmentRows, "replacementDelta"),
      ),
      totalRealProfit: mobileAnalyticsRound(
        sumMobileAnalyticsBy(referencePricedRows, "realProfit"),
      ),
      referencePricedCount: referencePricedRows.length,
      referenceCoverageRate: mobileAnalyticsRound(
        mobileAnalyticsPct(referencePricedRows.length, cashRows.length + installmentRows.length),
      ),
    },
    comparison: {
      cash: {
        count: cashRows.length,
        sales: mobileAnalyticsRound(cashSales),
        profit: mobileAnalyticsRound(cashProfit),
        collectionRate: 100,
      },
      installment: {
        count: installmentRows.length,
        sales: mobileAnalyticsRound(instSales),
        profit: mobileAnalyticsRound(instFullProfit),
        realizedProfit: mobileAnalyticsRound(instRealizedProfit),
        outstanding: mobileAnalyticsRound(instOutstanding),
        collectionRate: mobileAnalyticsRound(
          mobileAnalyticsPct(instReceived, instSales),
        ),
      },
    },
    risk: {
      highRiskCount: highRiskRows.length,
      rows: installmentRows
        .sort(
          (a: any, b: any) =>
            mobileAnalyticsNumber(b.riskScore) -
            mobileAnalyticsNumber(a.riskScore),
        )
        .slice(0, 100),
    },
    partnerCapital: {
      summary: partnerCapitalSummary,
      rows: partnerCapitalRows,
    },
    cashRows: sortMobileAnalyticsRowsBySaleDateDesc(cashRows),
    installmentRows: sortMobileAnalyticsRowsBySaleDateDesc(installmentRows),
    realProfitRows: allRealProfitRows,
    dataQuality: {
      source: "sqlite-business-records",
      includesMockData: false,
      referencePricePolicy: "current-purchase-price-only",
      referencePricedCount: referencePricedRows.length,
      referenceMissingCount: cashRows.length + installmentRows.length - referencePricedRows.length,
      riskPolicy: "deterministic-collection-rules",
      partnerCapitalScope: "all-time-business-records",
    },
  };
};
