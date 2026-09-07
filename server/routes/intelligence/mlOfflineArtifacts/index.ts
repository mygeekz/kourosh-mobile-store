import type { Express } from "express";
import type { IntelligenceRouteDeps } from "../types";
import { registerOfflineArtifacts01ArtifactIntakeRoutes } from "./01_artifactIntake.routes";
import { registerOfflineArtifacts02ArtifactReviewRoutes } from "./02_artifactReview.routes";
import { registerOfflineArtifacts03ArtifactRetentionPolicyEvidenceRoutes } from "./03_artifactRetentionPolicyEvidence.routes";
import { registerOfflineArtifacts04ArtifactRetentionGovernanceReviewRoutes } from "./04_artifactRetentionGovernanceReview.routes";
import { registerOfflineArtifacts05ArtifactRetentionPolicyEvidenceRoutes } from "./05_artifactRetentionPolicyEvidence.routes";
import { registerOfflineArtifacts06ArtifactRetentionGovernanceArchiveRoutes } from "./06_artifactRetentionGovernanceArchive.routes";
import { registerOfflineArtifacts07ArtifactRetentionGovernanceReviewRoutes } from "./07_artifactRetentionGovernanceReview.routes";
import { registerOfflineArtifacts08ArtifactFinalizationRoutes } from "./08_artifactFinalization.routes";
import { registerOfflineArtifacts09ArtifactRetentionGovernanceArchiveRoutes } from "./09_artifactRetentionGovernanceArchive.routes";
import { registerOfflineArtifacts10ArtifactAuditSnapshotRoutes } from "./10_artifactAuditSnapshot.routes";
import { registerOfflineArtifacts11ArtifactFinalizationRoutes } from "./11_artifactFinalization.routes";
import { registerOfflineArtifacts12ArtifactAuditSnapshotGovernanceSignoffRoutes } from "./12_artifactAuditSnapshotGovernanceSignoff.routes";
import { registerOfflineArtifacts13ArtifactAuditSnapshotRoutes } from "./13_artifactAuditSnapshot.routes";
import { registerOfflineArtifacts14ArtifactAuditSnapshotGovernanceArchiveRoutes } from "./14_artifactAuditSnapshotGovernanceArchive.routes";
import { registerOfflineArtifacts15ArtifactAuditSnapshotGovernanceSignoffRoutes } from "./15_artifactAuditSnapshotGovernanceSignoff.routes";
import { registerOfflineArtifacts16ArtifactArchiveRoutes } from "./16_artifactArchive.routes";
import { registerOfflineArtifacts17ArtifactSignoffRoutes } from "./17_artifactSignoff.routes";
import { registerOfflineArtifacts18ArtifactBinderRoutes } from "./18_artifactBinder.routes";
import { registerOfflineArtifacts19ArtifactSignoffRoutes } from "./19_artifactSignoff.routes";
import { registerOfflineArtifacts20ArtifactBinderRoutes } from "./20_artifactBinder.routes";
import { registerOfflineArtifacts21ArtifactIntakeRoutes } from "./21_artifactIntake.routes";
import { registerOfflineArtifacts22ArtifactReviewRoutes } from "./22_artifactReview.routes";
import { registerOfflineArtifacts23ArtifactBinderRoutes } from "./23_artifactBinder.routes";
import { registerOfflineArtifacts24ArtifactReviewRoutes } from "./24_artifactReview.routes";

export const registerMlOfflineArtifactIntakeRoutes = (
  app: Express,
  deps: IntelligenceRouteDeps,
): void => {
  registerOfflineArtifacts01ArtifactIntakeRoutes(app, deps);
  registerOfflineArtifacts02ArtifactReviewRoutes(app, deps);
  registerOfflineArtifacts03ArtifactRetentionPolicyEvidenceRoutes(app, deps);
  registerOfflineArtifacts04ArtifactRetentionGovernanceReviewRoutes(app, deps);
  registerOfflineArtifacts05ArtifactRetentionPolicyEvidenceRoutes(app, deps);
  registerOfflineArtifacts06ArtifactRetentionGovernanceArchiveRoutes(app, deps);
  registerOfflineArtifacts07ArtifactRetentionGovernanceReviewRoutes(app, deps);
  registerOfflineArtifacts08ArtifactFinalizationRoutes(app, deps);
  registerOfflineArtifacts09ArtifactRetentionGovernanceArchiveRoutes(app, deps);
  registerOfflineArtifacts10ArtifactAuditSnapshotRoutes(app, deps);
  registerOfflineArtifacts11ArtifactFinalizationRoutes(app, deps);
  registerOfflineArtifacts12ArtifactAuditSnapshotGovernanceSignoffRoutes(app, deps);
  registerOfflineArtifacts13ArtifactAuditSnapshotRoutes(app, deps);
  registerOfflineArtifacts14ArtifactAuditSnapshotGovernanceArchiveRoutes(app, deps);
  registerOfflineArtifacts15ArtifactAuditSnapshotGovernanceSignoffRoutes(app, deps);
  registerOfflineArtifacts16ArtifactArchiveRoutes(app, deps);
  registerOfflineArtifacts17ArtifactSignoffRoutes(app, deps);
  registerOfflineArtifacts18ArtifactBinderRoutes(app, deps);
  registerOfflineArtifacts19ArtifactSignoffRoutes(app, deps);
  registerOfflineArtifacts20ArtifactBinderRoutes(app, deps);
  registerOfflineArtifacts21ArtifactIntakeRoutes(app, deps);
  registerOfflineArtifacts22ArtifactReviewRoutes(app, deps);
  registerOfflineArtifacts23ArtifactBinderRoutes(app, deps);
  registerOfflineArtifacts24ArtifactReviewRoutes(app, deps);
};
