import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type {
  OfflineArtifactValidationReviewPriority,
  OfflineArtifactValidationReviewQueueRecord,
  OfflineArtifactValidationReviewQueueStatus,
} from "./offlineArtifactValidationReviewQueueTypes";

export type OfflineArtifactValidationReviewerAssignmentEventType =
  | "assignment_changed"
  | "evidence_note_added"
  | "filter_snapshot_recorded";

export type OfflineArtifactValidationReviewerEvidenceType =
  | "metadata_note"
  | "contract_evidence"
  | "benchmark_evidence"
  | "quarantine_evidence"
  | "reviewer_note";

export interface OfflineArtifactValidationReviewQueueFilterInput {
  status?: OfflineArtifactValidationReviewQueueStatus | "all" | null;
  priority?: OfflineArtifactValidationReviewPriority | "all" | null;
  assignedReviewerId?: string | number | "all" | "unassigned" | null;
  limit?: string | number | null;
}

export interface OfflineArtifactValidationReviewerAssignmentInput {
  queueItemId: string | number;
  assignedReviewerId: string | number | null;
  assignmentNote?: string | null;
  assignedByUserId?: string | number | null;
}

export interface OfflineArtifactValidationReviewerEvidenceNoteInput {
  queueItemId: string | number;
  evidenceNote: string;
  evidenceType?: OfflineArtifactValidationReviewerEvidenceType | null;
  evidenceReference?: string | null;
  recordedByUserId?: string | number | null;
}

export interface OfflineArtifactValidationReviewerAssignmentEventRecord {
  id: number;
  queueItemId: number;
  eventType: OfflineArtifactValidationReviewerAssignmentEventType;
  assignedReviewerId: string | number | null;
  note: string | null;
  evidenceType: OfflineArtifactValidationReviewerEvidenceType | null;
  evidenceReference: string | null;
  evidenceJson: Record<string, unknown>;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationReviewerAssignmentUxState {
  phase: "Phase 7C — Offline Artifact Validation Reviewer Assignment UX";
  filterControls: {
    statuses: Array<OfflineArtifactValidationReviewQueueStatus | "all">;
    priorities: Array<OfflineArtifactValidationReviewPriority | "all">;
    reviewerScopes: Array<"all" | "unassigned" | "assigned">;
  };
  activeFilters: {
    status: OfflineArtifactValidationReviewQueueStatus | "all";
    priority: OfflineArtifactValidationReviewPriority | "all";
    assignedReviewerId: string | number | "all" | "unassigned";
    limit: number;
  };
  visibleItems: OfflineArtifactValidationReviewQueueRecord[];
  totalVisibleItems: number;
  latestQueueItem: OfflineArtifactValidationReviewQueueRecord | null;
  latestAssignmentEvent: OfflineArtifactValidationReviewerAssignmentEventRecord | null;
  evidenceNoteCount: number;
  assignedVisibleItems: number;
  unassignedVisibleItems: number;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}
