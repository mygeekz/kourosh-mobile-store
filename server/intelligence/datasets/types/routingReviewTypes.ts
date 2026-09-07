// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { ExternalModelImportContract, ExternalModelImportValidationSummary } from "./candidateOutputTypes";

export type MlModelImportCatalogSummary = {
  generatedAt: string;
  contract: ExternalModelImportContract;
  currentValidation: ExternalModelImportValidationSummary;
  lastModelResultImports: Array<Record<string, unknown>>;
};
