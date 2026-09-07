import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactIntakeRequest } from "./artifactValidation";
import {
  findQuarantinedArtifactBySha256,
  getQuarantinedArtifactSummary,
  quarantineOfflineArtifactEnvelope,
} from "./artifactQuarantine.service";
import type {
  ArtifactIntakeStatus,
  OfflineArtifactRecord,
  OfflineArtifactSummary,
  OfflineModelArtifactIntakeResult,
} from "./artifactIntakeTypes";

const buildHashEnvelope = (input: {
  artifactName: string;
  artifactKind: string;
  modelKey: string;
  modelVersion: string;
  source: string;
  declaredFormat: string;
  declaredPurpose: string;
  relatedModelImportId: string | number | null;
  notes: string | null;
  metadataJson: Record<string, unknown>;
  artifactPayloadJson: Record<string, unknown> | null;
}): Record<string, unknown> => ({
  artifactName: input.artifactName,
  artifactKind: input.artifactKind,
  modelKey: input.modelKey,
  modelVersion: input.modelVersion,
  source: input.source,
  declaredFormat: input.declaredFormat,
  declaredPurpose: input.declaredPurpose,
  relatedModelImportId: input.relatedModelImportId,
  notes: input.notes,
  metadataJson: input.metadataJson,
  artifactPayloadJson: input.artifactPayloadJson,
});

const nowIso = (): string => new Date().toISOString();

const resultFromRecord = (
  record: OfflineArtifactRecord,
  status: ArtifactIntakeStatus,
  validationMessages: string[],
  duplicateOfArtifactId?: string | number | null,
): OfflineModelArtifactIntakeResult => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  return {
    accepted: status !== "rejected",
    status,
    artifactId: record.id,
    artifactName: record.artifactName,
    artifactKind: record.artifactKind,
    modelKey: record.modelKey,
    modelVersion: record.modelVersion,
    declaredFormat: record.declaredFormat,
    sha256: record.sha256,
    sizeBytes: record.sizeBytes,
    quarantineRequired: gate.artifactQuarantineRequired,
    quarantined: record.quarantineStatus === "quarantined",
    artifactExecutionAllowed: gate.artifactExecutionAllowed,
    artifactAutoActivationAllowed: gate.artifactAutoActivationAllowed,
    modelExecutionAllowed: gate.modelExecutionAllowed,
    inferenceEndpointExposed: gate.inferenceEndpointExposed,
    productionIntegrationAllowed: gate.productionIntegrationAllowed,
    canMutateBusinessRecords: gate.canMutateBusinessRecords,
    validationMessages,
    safetyNotes: record.safetyNotes.length ? record.safetyNotes : buildOfflineArtifactSafetyNotes(),
    duplicateOfArtifactId,
    createdAt: record.createdAt || nowIso(),
  };
};

export async function intakeOfflineModelArtifact(
  request: unknown,
  createdByUserId?: string | number | null,
): Promise<OfflineModelArtifactIntakeResult> {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const safetyNotes = buildOfflineArtifactSafetyNotes();
  const validation = validateOfflineArtifactIntakeRequest(request, gate);

  if (!validation.valid || !validation.normalized) {
    const raw = request && typeof request === "object" ? (request as Record<string, unknown>) : {};
    return {
      accepted: false,
      status: "rejected",
      artifactId: null,
      artifactName: typeof raw.artifactName === "string" ? raw.artifactName : "",
      artifactKind: typeof raw.artifactKind === "string" ? raw.artifactKind : "",
      modelKey: typeof raw.modelKey === "string" ? raw.modelKey : "",
      modelVersion: typeof raw.modelVersion === "string" ? raw.modelVersion : "",
      declaredFormat: typeof raw.declaredFormat === "string" ? raw.declaredFormat : "",
      sha256: null,
      sizeBytes: null,
      quarantineRequired: gate.artifactQuarantineRequired,
      quarantined: false,
      artifactExecutionAllowed: gate.artifactExecutionAllowed,
      artifactAutoActivationAllowed: gate.artifactAutoActivationAllowed,
      modelExecutionAllowed: gate.modelExecutionAllowed,
      inferenceEndpointExposed: gate.inferenceEndpointExposed,
      productionIntegrationAllowed: gate.productionIntegrationAllowed,
      canMutateBusinessRecords: gate.canMutateBusinessRecords,
      validationMessages: validation.messages,
      safetyNotes,
      createdAt: nowIso(),
    };
  }

  const envelope = buildHashEnvelope(validation.normalized);
  const sha256 = computeArtifactEnvelopeSha256(envelope);
  const duplicate = await findQuarantinedArtifactBySha256(sha256);
  if (duplicate) {
    return resultFromRecord(
      duplicate,
      "needs_review",
      [
        ...validation.messages,
        `Duplicate offline artifact envelope detected. Existing artifact id=${duplicate.id}; no new quarantine record was created.`,
      ],
      duplicate.id,
    );
  }

  const record = await quarantineOfflineArtifactEnvelope({
    input: validation.normalized,
    sha256,
    validationMessages: validation.messages,
    safetyNotes,
    createdByUserId,
  });

  if (!record) {
    return {
      accepted: false,
      status: "rejected",
      artifactId: null,
      artifactName: validation.normalized.artifactName,
      artifactKind: validation.normalized.artifactKind,
      modelKey: validation.normalized.modelKey,
      modelVersion: validation.normalized.modelVersion,
      declaredFormat: validation.normalized.declaredFormat,
      sha256,
      sizeBytes: validation.normalized.sizeBytes,
      quarantineRequired: gate.artifactQuarantineRequired,
      quarantined: false,
      artifactExecutionAllowed: gate.artifactExecutionAllowed,
      artifactAutoActivationAllowed: gate.artifactAutoActivationAllowed,
      modelExecutionAllowed: gate.modelExecutionAllowed,
      inferenceEndpointExposed: gate.inferenceEndpointExposed,
      productionIntegrationAllowed: gate.productionIntegrationAllowed,
      canMutateBusinessRecords: gate.canMutateBusinessRecords,
      validationMessages: ["Artifact envelope could not be recorded in quarantine metadata table."],
      safetyNotes,
      createdAt: nowIso(),
    };
  }

  return resultFromRecord(record, "needs_review", validation.messages, null);
}

export async function buildOfflineArtifactIntakeSummary(): Promise<OfflineArtifactSummary> {
  return getQuarantinedArtifactSummary();
}
