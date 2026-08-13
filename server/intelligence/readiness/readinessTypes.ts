export type ReadinessSignalStatus = "good" | "weak" | "missing";
export type ModelReadinessStatus = "ready" | "almost_ready" | "needs_data" | "not_ready";

export type ModelReadinessSignal = {
  name: string;
  status: ReadinessSignalStatus;
  value: number | string | null;
  message: string;
};

export type ModelReadinessItem = {
  key: string;
  label: string;
  readinessPct: number;
  status: ModelReadinessStatus;
  dataSignals: ModelReadinessSignal[];
  blockers: string[];
  recommendedNextAction: string;
};

export type ModelReadinessSummary = {
  generatedAt: string;
  items: ModelReadinessItem[];
  bestReadyModel: ModelReadinessItem | null;
  weakestModel: ModelReadinessItem | null;
};

export type DataQualityCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "fail";
  value: number | string | null;
  message: string;
};

export type DataQualitySummary = {
  generatedAt: string;
  overallScore: number;
  checks: DataQualityCheck[];
};
