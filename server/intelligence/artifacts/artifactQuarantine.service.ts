import {
  createOfflineArtifactIntakeRecord,
  findOfflineArtifactBySha256,
  getOfflineArtifactById,
  getOfflineArtifactSummary,
  listOfflineArtifacts,
  updateOfflineArtifactStatus,
} from "../../db/domains/ml/mlOfflineArtifacts.db";
import { getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import type {
  ArtifactIntakeStatus,
  ArtifactQuarantineStatus,
  NormalizedArtifactIntakeInput,
  OfflineArtifactRecord,
  OfflineArtifactSummary,
} from "./artifactIntakeTypes";

export const quarantineOfflineArtifactEnvelope = async (payload: {
  input: NormalizedArtifactIntakeInput;
  sha256: string;
  validationMessages: string[];
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  if (
    gate.artifactExecutionAllowed !== false ||
    gate.artifactAutoActivationAllowed !== false ||
    gate.artifactQuarantineRequired !== true ||
    gate.modelExecutionAllowed !== false ||
    gate.inferenceEndpointExposed !== false ||
    gate.productionIntegrationAllowed !== false ||
    gate.canMutateBusinessRecords !== false
  ) {
    throw new Error("Offline artifact intake safety gate is not locked down.");
  }

  return createOfflineArtifactIntakeRecord({
    input: payload.input,
    sha256: payload.sha256,
    validationMessages: payload.validationMessages,
    safetyNotes: payload.safetyNotes,
    intakeStatus: "needs_review",
    quarantineStatus: "quarantined",
    createdByUserId: payload.createdByUserId,
  });
};

export const findQuarantinedArtifactBySha256 = findOfflineArtifactBySha256;
export const getQuarantinedArtifactById = getOfflineArtifactById;
export const listQuarantinedArtifacts = listOfflineArtifacts;
export const getQuarantinedArtifactSummary = getOfflineArtifactSummary;

export const updateQuarantinedArtifactReviewStatus = async (payload: {
  id: string | number;
  intakeStatus: ArtifactIntakeStatus;
  quarantineStatus?: ArtifactQuarantineStatus;
  safetyNotes?: string[];
}): Promise<OfflineArtifactRecord | null> => {
  return updateOfflineArtifactStatus(payload);
};
