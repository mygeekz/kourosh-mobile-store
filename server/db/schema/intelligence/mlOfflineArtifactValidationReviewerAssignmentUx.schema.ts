import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationReviewerAssignmentUxSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_reviewer_assignment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_item_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      assigned_reviewer_id TEXT,
      note TEXT,
      evidence_type TEXT,
      evidence_reference TEXT,
      evidence_json TEXT,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_assignment_events_queue_item_id ON offline_artifact_validation_reviewer_assignment_events(queue_item_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_assignment_events_type ON offline_artifact_validation_reviewer_assignment_events(event_type)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_assignment_events_reviewer ON offline_artifact_validation_reviewer_assignment_events(assigned_reviewer_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_assignment_events_created_at ON offline_artifact_validation_reviewer_assignment_events(created_at)`);
};
