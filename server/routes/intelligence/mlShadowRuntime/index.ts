import type { Express } from "express";
import type { IntelligenceRouteDeps } from "../types";
import { registerShadowruntimedryrunRoutesRoutes } from "./shadowRuntimeDryRun.routes";
import { registerShadowruntimeattemptsRoutesRoutes } from "./shadowRuntimeAttempts.routes";
import { registerShadowruntimereplayRoutesRoutes } from "./shadowRuntimeReplay.routes";
import { registerShadowruntimereplayreviewRoutesRoutes } from "./shadowRuntimeReplayReview.routes";
import { registerShadowruntimereplayevidenceRoutesRoutes } from "./shadowRuntimeReplayEvidence.routes";
import { registerShadowruntimecandidateoutputRoutesRoutes } from "./shadowRuntimeCandidateOutput.routes";
import { registerShadowruntimecomparisonmatrixRoutesRoutes } from "./shadowRuntimeComparisonMatrix.routes";
import { registerShadowruntimecontractdriftRoutesRoutes } from "./shadowRuntimeContractDrift.routes";
import { registerShadowruntimecandidateartifactmetadataRoutesRoutes } from "./shadowRuntimeCandidateArtifactMetadata.routes";
import { registerShadowruntimeartifactmetadatacompatibilityRoutesRoutes } from "./shadowRuntimeArtifactMetadataCompatibility.routes";
import { registerShadowruntimeenvelopestorageRoutesRoutes } from "./shadowRuntimeEnvelopeStorage.routes";
import { registerShadowruntimeenveloperetentionpolicyRoutesRoutes } from "./shadowRuntimeEnvelopeRetentionPolicy.routes";
import { registerShadowruntimeenveloperetentionevidenceRoutesRoutes } from "./shadowRuntimeEnvelopeRetentionEvidence.routes";
import { registerShadowruntimeenvelopereviewbinderRoutesRoutes } from "./shadowRuntimeEnvelopeReviewBinder.routes";
import { registerShadowruntimetraceabilitymatrixRoutesRoutes } from "./shadowRuntimeTraceabilityMatrix.routes";
import { registerShadowruntimetraceabilitycoverageRoutesRoutes } from "./shadowRuntimeTraceabilityCoverage.routes";
import { registerShadowruntimetraceabilitygapnotesRoutesRoutes } from "./shadowRuntimeTraceabilityGapNotes.routes";
import { registerShadowruntimetraceabilityprioritizationRoutesRoutes } from "./shadowRuntimeTraceabilityPrioritization.routes";
import { registerShadowruntimetraceabilityroutingreadinessRoutesRoutes } from "./shadowRuntimeTraceabilityRoutingReadiness.routes";
import { registerShadowruntimetraceabilitycoveragebalanceRoutesRoutes } from "./shadowRuntimeTraceabilityCoverageBalance.routes";
import { registerShadowruntimetraceabilitybalancenotesRoutesRoutes } from "./shadowRuntimeTraceabilityBalanceNotes.routes";
import { registerShadowruntimetraceabilitytriagematrixRoutesRoutes } from "./shadowRuntimeTraceabilityTriageMatrix.routes";
import { registerShadowruntimetraceabilityroutingsummaryRoutesRoutes } from "./shadowRuntimeTraceabilityRoutingSummary.routes";
import { registerShadowruntimesummaryRoutesRoutes } from "./shadowRuntimeSummary.routes";

export const registerMlShadowRuntimeRoutes = (
  app: Express,
  deps: IntelligenceRouteDeps,
): void => {
  registerShadowruntimedryrunRoutesRoutes(app, deps);
  registerShadowruntimeattemptsRoutesRoutes(app, deps);
  registerShadowruntimereplayRoutesRoutes(app, deps);
  registerShadowruntimereplayreviewRoutesRoutes(app, deps);
  registerShadowruntimereplayevidenceRoutesRoutes(app, deps);
  registerShadowruntimecandidateoutputRoutesRoutes(app, deps);
  registerShadowruntimecomparisonmatrixRoutesRoutes(app, deps);
  registerShadowruntimecontractdriftRoutesRoutes(app, deps);
  registerShadowruntimecandidateartifactmetadataRoutesRoutes(app, deps);
  registerShadowruntimeartifactmetadatacompatibilityRoutesRoutes(app, deps);
  registerShadowruntimeenvelopestorageRoutesRoutes(app, deps);
  registerShadowruntimeenveloperetentionpolicyRoutesRoutes(app, deps);
  registerShadowruntimeenveloperetentionevidenceRoutesRoutes(app, deps);
  registerShadowruntimeenvelopereviewbinderRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitymatrixRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitycoverageRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitygapnotesRoutesRoutes(app, deps);
  registerShadowruntimetraceabilityprioritizationRoutesRoutes(app, deps);
  registerShadowruntimetraceabilityroutingreadinessRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitycoveragebalanceRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitybalancenotesRoutesRoutes(app, deps);
  registerShadowruntimetraceabilitytriagematrixRoutesRoutes(app, deps);
  registerShadowruntimetraceabilityroutingsummaryRoutesRoutes(app, deps);
  registerShadowruntimesummaryRoutesRoutes(app, deps);
};
