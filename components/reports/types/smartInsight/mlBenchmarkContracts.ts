// Extracted from ../smartInsightContracts.ts; type-only compatibility surface preserved.
export type MlBenchmarkSummaryPayload = {
  generatedAt?: string;
  currentInventoryStockoutBenchmark?: {
    benchmarkKey?: string;
    datasetKey?: string;
    datasetVersion?: string;
    trainRows?: number;
    testRows?: number;
    bestCandidateKey?: string | null;
    bestCandidateLabel?: string | null;
    bestF1Pct?: number | null;
    bestBalancedAccuracyPct?: number | null;
    status?: string;
    blockers?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastBenchmarks?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
