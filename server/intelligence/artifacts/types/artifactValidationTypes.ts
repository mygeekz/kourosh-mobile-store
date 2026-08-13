// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput } from "./artifactReviewTypes";

export interface OfflineArtifactGovernanceArchiveChainFinalizationValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput | null;
}
