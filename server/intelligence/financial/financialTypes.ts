export type FinancialBrainQuery = {
  fromDate?: unknown;
  from?: unknown;
  toDate?: unknown;
  to?: unknown;
};

export type FinancialBrainRange = {
  from: string;
  to: string;
  fromISO: string;
  toISO: string;
};

export type FinancialBrainSeverity = "critical" | "high" | "medium" | "positive";

export type FinancialBrainSignal = {
  id: string;
  severity?: FinancialBrainSeverity;
  title: string;
  summary: string;
  to: string;
};

export type FinancialBrainAction = FinancialBrainSignal & {
  actionLabel: string;
  severity: FinancialBrainSeverity;
};
