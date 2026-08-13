import type {
  OfflineArtifactValidationFinding,
  OfflineArtifactValidationFindingSeverity,
  OfflineArtifactValidationFindingStatus,
} from "./offlineArtifactValidationTypes";

export const buildValidationFinding = (
  key: string,
  severity: OfflineArtifactValidationFindingSeverity,
  status: OfflineArtifactValidationFindingStatus,
  message: string,
  evidence: Record<string, unknown>,
  recommendedAction: string,
): OfflineArtifactValidationFinding => ({
  key,
  severity,
  status,
  message,
  evidence,
  recommendedAction,
});

export const countFindings = (
  findings: OfflineArtifactValidationFinding[],
  severity: OfflineArtifactValidationFindingSeverity,
): number => findings.filter((finding) => finding.severity === severity && finding.status !== "pass").length;

export const hasFinding = (
  findings: OfflineArtifactValidationFinding[],
  key: string,
  status?: OfflineArtifactValidationFindingStatus,
): boolean => findings.some((finding) => finding.key === key && (!status || finding.status === status));
