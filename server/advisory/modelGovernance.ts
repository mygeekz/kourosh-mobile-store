export type DriftReport = {
  status: "stable" | "warning" | "critical";
  maximumStandardizedMeanShift: number;
  shiftedFeatures: string[];
  retrainingRecommended: boolean;
};

export const detectMeanDrift = (input: {
  featureNames: string[];
  trainingMeans: number[];
  trainingScales: number[];
  recentRows: number[][];
}): DriftReport => {
  if (!input.recentRows.length) return { status: "warning", maximumStandardizedMeanShift: 0, shiftedFeatures: [], retrainingRecommended: false };
  const shifts = input.featureNames.map((name, index) => {
    const recentMean = input.recentRows.reduce((sum, row) => sum + Number(row[index] || 0), 0) / input.recentRows.length;
    return { name, shift: Math.abs(recentMean - input.trainingMeans[index]) / Math.max(1e-9, input.trainingScales[index] || 1) };
  });
  const maximum = Math.max(...shifts.map((item) => item.shift), 0);
  const shiftedFeatures = shifts.filter((item) => item.shift >= 0.75).map((item) => item.name);
  return {
    status: maximum >= 1.5 ? "critical" : maximum >= 0.75 ? "warning" : "stable",
    maximumStandardizedMeanShift: Number(maximum.toFixed(4)),
    shiftedFeatures,
    retrainingRecommended: maximum >= 1.5 || shiftedFeatures.length >= Math.max(2, Math.ceil(input.featureNames.length * 0.3)),
  };
};

export const selectChampion = <T extends { artifactId: string; metrics: { mape: number; mae: number; r2: number } }>(candidates: T[]): T => {
  if (!candidates.length) throw new Error("At least one candidate is required");
  return [...candidates].sort((a, b) => a.metrics.mape - b.metrics.mape || a.metrics.mae - b.metrics.mae || b.metrics.r2 - a.metrics.r2 || a.artifactId.localeCompare(b.artifactId))[0];
};
