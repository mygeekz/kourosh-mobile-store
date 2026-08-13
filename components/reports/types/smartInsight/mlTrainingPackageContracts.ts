// Extracted from ../smartInsightContracts.ts; type-only compatibility surface preserved.
export type MlTrainingPackageSummaryPayload = {
  generatedAt?: string;
  currentInventoryStockoutTrainingPackage?: {
    packageKey?: string;
    datasetKey?: string;
    datasetVersion?: string;
    trainRows?: number;
    testRows?: number;
    labeledRows?: number;
    featureCount?: number;
    labelKey?: string;
    bestBaselineKey?: string | null;
    bestBaselineF1Pct?: number | null;
    bestBaselineBalancedAccuracyPct?: number | null;
    status?: string;
    blockers?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastTrainingPackageExports?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
