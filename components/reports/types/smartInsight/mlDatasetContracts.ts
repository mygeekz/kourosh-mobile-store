// Extracted from ../smartInsightContracts.ts; type-only compatibility surface preserved.
export type MlDatasetSummaryPayload = {
  generatedAt?: string;
  datasets?: Array<{
    datasetKey?: string;
    datasetVersion?: string;
    labelKey?: string;
    totalRows?: number;
    labeledRows?: number;
    unlabeledRows?: number;
    positiveLabels?: number;
    negativeLabels?: number;
    featureCount?: number;
    readinessPct?: number;
    status?: string;
    blockers?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  }>;
  lastExports?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
