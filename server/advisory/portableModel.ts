import { createHash } from "node:crypto";

export type PortableModelMetrics = {
  sampleCount: number;
  trainCount: number;
  testCount: number;
  mae: number;
  mape: number;
  r2: number;
};

export type PortableRegressionArtifact = {
  schemaVersion: 1;
  artifactId: string;
  task: "phone-purchase-price" | "phone-sale-price" | "phone-days-to-sell" | "product-sale-price";
  trainedAt: string;
  trainingDataFingerprint: string;
  featureNames: string[];
  means: number[];
  scales: number[];
  weights: number[];
  intercept: number;
  residualMae: number;
  metrics: PortableModelMetrics;
  approval: {
    status: "shadow" | "approved" | "retired";
    approvedBy: string | null;
    approvedAt: string | null;
    syntheticTrainingData: boolean;
  };
  checksum: string;
};

export type RegressionExample = { x: number[]; y: number; observedAt: string; entityKey: string };

export type PortableLogisticArtifact = {
  schemaVersion: 1;
  artifactId: string;
  task: "inventory-stockout-risk";
  trainedAt: string;
  trainingDataFingerprint: string;
  featureNames: string[];
  means: number[];
  scales: number[];
  weights: number[];
  intercept: number;
  metrics: { sampleCount: number; trainCount: number; testCount: number; accuracy: number; precision: number; recall: number; brier: number };
  approval: {
    status: "shadow" | "approved" | "retired";
    approvedBy: string | null;
    approvedAt: string | null;
    syntheticTrainingData: boolean;
  };
  checksum: string;
};

const round = (value: number, precision = 8): number => Number(value.toFixed(precision));

const canonicalArtifact = (artifact: Omit<PortableRegressionArtifact, "checksum">): string =>
  JSON.stringify(artifact);

export const artifactChecksum = (artifact: Omit<PortableRegressionArtifact, "checksum">): string =>
  createHash("sha256").update(canonicalArtifact(artifact)).digest("hex");

export const verifyArtifact = (artifact: PortableRegressionArtifact): boolean => {
  const { checksum, ...unsigned } = artifact;
  return checksum.length === 64 && artifactChecksum(unsigned) === checksum;
};

const solve = (matrix: number[][], vector: number[]): number[] => {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) continue;
    for (let index = column; index <= n; index += 1) augmented[column][index] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= n; index += 1) augmented[row][index] -= factor * augmented[column][index];
    }
  }
  return augmented.map((row, index) => Number.isFinite(row[n]) ? row[n] : (index === 0 ? 0 : 0));
};

const predictRaw = (weights: number[], intercept: number, row: number[]): number =>
  weights.reduce((sum, weight, index) => sum + weight * row[index], intercept);

const metrics = (actual: number[], predicted: number[]): Omit<PortableModelMetrics, "sampleCount" | "trainCount" | "testCount"> => {
  if (!actual.length) return { mae: 0, mape: 0, r2: 0 };
  const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
  const errors = actual.map((value, index) => Math.abs(value - predicted[index]));
  const mae = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const mape = errors.reduce((sum, value, index) => sum + value / Math.max(1, Math.abs(actual[index])), 0) / errors.length;
  const residual = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const total = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return { mae: round(mae, 2), mape: round(mape * 100, 2), r2: round(total > 0 ? 1 - residual / total : 0, 4) };
};

/** Deterministic ridge regression with a chronological holdout. */
export const trainPortableRegression = (input: {
  artifactId: string;
  task: PortableRegressionArtifact["task"];
  featureNames: string[];
  examples: RegressionExample[];
  syntheticTrainingData?: boolean;
  trainedAt?: string;
  ridge?: number;
}): PortableRegressionArtifact => {
  if (input.examples.length < 12) throw new Error("At least 12 labeled examples are required");
  if (input.examples.some((row) => row.x.length !== input.featureNames.length)) throw new Error("Feature contract mismatch");
  const ordered = [...input.examples].sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.entityKey.localeCompare(b.entityKey));
  const testCount = Math.max(3, Math.floor(ordered.length * 0.2));
  const train = ordered.slice(0, -testCount);
  const test = ordered.slice(-testCount);
  const means = input.featureNames.map((_, feature) => train.reduce((sum, row) => sum + row.x[feature], 0) / train.length);
  const scales = input.featureNames.map((_, feature) => {
    const variance = train.reduce((sum, row) => sum + (row.x[feature] - means[feature]) ** 2, 0) / train.length;
    return Math.sqrt(variance) || 1;
  });
  const standardize = (row: number[]) => row.map((value, index) => (value - means[index]) / scales[index]);
  const x = train.map((row) => [1, ...standardize(row.x)]);
  const dimension = input.featureNames.length + 1;
  const xtx = Array.from({ length: dimension }, () => Array(dimension).fill(0));
  const xty = Array(dimension).fill(0);
  for (let row = 0; row < x.length; row += 1) {
    for (let left = 0; left < dimension; left += 1) {
      xty[left] += x[row][left] * train[row].y;
      for (let right = 0; right < dimension; right += 1) xtx[left][right] += x[row][left] * x[row][right];
    }
  }
  const ridge = input.ridge ?? 1;
  for (let index = 1; index < dimension; index += 1) xtx[index][index] += ridge;
  const solution = solve(xtx, xty);
  const intercept = solution[0];
  const weights = solution.slice(1);
  const testPredictions = test.map((row) => predictRaw(weights, intercept, standardize(row.x)));
  const evaluated = metrics(test.map((row) => row.y), testPredictions);
  const trainingPredictions = train.map((row) => predictRaw(weights, intercept, standardize(row.x)));
  const residualMae = metrics(train.map((row) => row.y), trainingPredictions).mae;
  const fingerprint = createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
  const unsigned: Omit<PortableRegressionArtifact, "checksum"> = {
    schemaVersion: 1,
    artifactId: input.artifactId,
    task: input.task,
    trainedAt: input.trainedAt ?? new Date().toISOString(),
    trainingDataFingerprint: fingerprint,
    featureNames: [...input.featureNames],
    means: means.map((value) => round(value)),
    scales: scales.map((value) => round(value)),
    weights: weights.map((value) => round(value)),
    intercept: round(intercept),
    residualMae: round(residualMae, 2),
    metrics: { sampleCount: ordered.length, trainCount: train.length, testCount: test.length, ...evaluated },
    approval: { status: "shadow", approvedBy: null, approvedAt: null, syntheticTrainingData: Boolean(input.syntheticTrainingData) },
  };
  return { ...unsigned, checksum: artifactChecksum(unsigned) };
};

export const runPortableRegression = (artifact: PortableRegressionArtifact, features: number[]): number => {
  if (!verifyArtifact(artifact)) throw new Error("Artifact checksum validation failed");
  if (features.length !== artifact.featureNames.length) throw new Error("Feature contract mismatch");
  const standardized = features.map((value, index) => (value - artifact.means[index]) / artifact.scales[index]);
  return predictRaw(artifact.weights, artifact.intercept, standardized);
};

export const approveArtifact = (artifact: PortableRegressionArtifact, actor: string, approvedAt: string): PortableRegressionArtifact => {
  if (!verifyArtifact(artifact)) throw new Error("Cannot approve an invalid artifact");
  if (artifact.approval.syntheticTrainingData) throw new Error("Synthetic artifacts cannot be production-approved");
  const { checksum: _checksum, ...unsigned } = artifact;
  const approved = { ...unsigned, approval: { ...unsigned.approval, status: "approved" as const, approvedBy: actor, approvedAt } };
  return { ...approved, checksum: artifactChecksum(approved) };
};

export const logisticArtifactChecksum = (artifact: Omit<PortableLogisticArtifact, "checksum">): string =>
  createHash("sha256").update(JSON.stringify(artifact)).digest("hex");

export const verifyLogisticArtifact = (artifact: PortableLogisticArtifact): boolean => {
  const { checksum, ...unsigned } = artifact;
  return checksum.length === 64 && checksum === logisticArtifactChecksum(unsigned);
};

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, value))));

/** Deterministic L2 logistic regression for binary advisory risk. */
export const trainPortableLogistic = (input: {
  artifactId: string;
  featureNames: string[];
  examples: RegressionExample[];
  trainedAt?: string;
  syntheticTrainingData?: boolean;
}): PortableLogisticArtifact => {
  if (input.examples.length < 30) throw new Error("At least 30 labeled examples are required");
  const ordered = [...input.examples].sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.entityKey.localeCompare(b.entityKey));
  if (!ordered.some((row) => row.y === 0) || !ordered.some((row) => row.y === 1)) throw new Error("Both label classes are required");
  const testCount = Math.max(6, Math.floor(ordered.length * 0.2));
  const train = ordered.slice(0, -testCount);
  const test = ordered.slice(-testCount);
  if (!train.some((row) => row.y === 0) || !train.some((row) => row.y === 1) || !test.some((row) => row.y === 0) || !test.some((row) => row.y === 1)) {
    throw new Error("Chronological train and holdout windows must both contain both label classes");
  }
  const means = input.featureNames.map((_, index) => train.reduce((sum, row) => sum + row.x[index], 0) / train.length);
  const scales = input.featureNames.map((_, index) => Math.sqrt(train.reduce((sum, row) => sum + (row.x[index] - means[index]) ** 2, 0) / train.length) || 1);
  const standardize = (row: number[]) => row.map((value, index) => (value - means[index]) / scales[index]);
  const weights = Array(input.featureNames.length).fill(0);
  let intercept = 0;
  const rate = 0.08;
  for (let epoch = 0; epoch < 900; epoch += 1) {
    const gradient = Array(weights.length).fill(0);
    let interceptGradient = 0;
    for (const row of train) {
      const x = standardize(row.x);
      const probability = sigmoid(predictRaw(weights, intercept, x));
      const error = probability - row.y;
      interceptGradient += error;
      for (let index = 0; index < weights.length; index += 1) gradient[index] += error * x[index];
    }
    intercept -= rate * interceptGradient / train.length;
    for (let index = 0; index < weights.length; index += 1) weights[index] -= rate * (gradient[index] / train.length + 0.01 * weights[index]);
  }
  const probabilities = test.map((row) => sigmoid(predictRaw(weights, intercept, standardize(row.x))));
  let tp = 0; let fp = 0; let tn = 0; let fn = 0;
  probabilities.forEach((probability, index) => {
    const predicted = probability >= 0.5 ? 1 : 0;
    const actual = test[index].y;
    if (predicted === 1 && actual === 1) tp += 1;
    else if (predicted === 1) fp += 1;
    else if (actual === 0) tn += 1;
    else fn += 1;
  });
  const unsigned: Omit<PortableLogisticArtifact, "checksum"> = {
    schemaVersion: 1, artifactId: input.artifactId, task: "inventory-stockout-risk", trainedAt: input.trainedAt ?? new Date().toISOString(),
    trainingDataFingerprint: createHash("sha256").update(JSON.stringify(ordered)).digest("hex"),
    featureNames: [...input.featureNames], means: means.map((value) => round(value)), scales: scales.map((value) => round(value)), weights: weights.map((value) => round(value)), intercept: round(intercept),
    metrics: {
      sampleCount: ordered.length, trainCount: train.length, testCount: test.length,
      accuracy: round((tp + tn) / test.length, 4), precision: round(tp / Math.max(1, tp + fp), 4), recall: round(tp / Math.max(1, tp + fn), 4),
      brier: round(probabilities.reduce((sum, probability, index) => sum + (probability - test[index].y) ** 2, 0) / test.length, 4),
    },
    approval: { status: "shadow", approvedBy: null, approvedAt: null, syntheticTrainingData: Boolean(input.syntheticTrainingData) },
  };
  return { ...unsigned, checksum: logisticArtifactChecksum(unsigned) };
};

export const runPortableLogistic = (artifact: PortableLogisticArtifact, features: number[]): number => {
  const { checksum, ...unsigned } = artifact;
  if (checksum !== logisticArtifactChecksum(unsigned)) throw new Error("Artifact checksum validation failed");
  if (features.length !== artifact.featureNames.length) throw new Error("Feature contract mismatch");
  const standardized = features.map((value, index) => (value - artifact.means[index]) / artifact.scales[index]);
  return sigmoid(predictRaw(artifact.weights, artifact.intercept, standardized));
};

export const approveLogisticArtifact = (artifact: PortableLogisticArtifact, actor: string, approvedAt: string): PortableLogisticArtifact => {
  if (!verifyLogisticArtifact(artifact)) throw new Error("Cannot approve an invalid artifact");
  if (artifact.approval.syntheticTrainingData) throw new Error("Synthetic artifacts cannot be production-approved");
  const { checksum: _checksum, ...unsigned } = artifact;
  const approved = { ...unsigned, approval: { ...unsigned.approval, status: "approved" as const, approvedBy: actor, approvedAt } };
  return { ...approved, checksum: logisticArtifactChecksum(approved) };
};
