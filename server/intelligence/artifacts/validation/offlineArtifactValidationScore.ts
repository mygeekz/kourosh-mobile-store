import type {
  OfflineArtifactTrustLabel,
  OfflineArtifactValidationFinding,
} from "./offlineArtifactValidationTypes";
import { hasFinding } from "./offlineArtifactValidationFindings";

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

export const calculateOfflineArtifactTrustScore = (
  findings: OfflineArtifactValidationFinding[],
): { trustScore: number; trustLabel: OfflineArtifactTrustLabel } => {
  let score = 100;

  for (const finding of findings) {
    if (finding.status === "pass") continue;
    if (finding.severity === "critical") score -= 35;
    if (finding.severity === "high") score -= 20;
    if (finding.severity === "warning") score -= 8;
  }

  if (hasFinding(findings, "envelope_schema.required_identity", "fail")) score = Math.min(score, 40);
  if (hasFinding(findings, "output_contract.forbidden_mutation_field", "fail")) score = Math.min(score, 20);
  if (hasFinding(findings, "model_family.unsupported", "fail")) score = Math.min(score, 55);
  if (hasFinding(findings, "feature_contract.missing", "fail")) score = Math.min(score, 60);
  if (hasFinding(findings, "output_contract.missing", "fail")) score = Math.min(score, 60);

  const trustScore = clampScore(score);
  let trustLabel: OfflineArtifactTrustLabel = "trusted_candidate";
  if (trustScore < 30) trustLabel = "reject_recommended";
  else if (trustScore < 55) trustLabel = "quarantine_recommended";
  else if (trustScore < 85) trustLabel = "review_required";

  return { trustScore, trustLabel };
};
