import type { Express, Request, Response } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import { getAsync, runAsync } from "./db/query";

const ensureFeedbackTable = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS advisory_model_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advisory_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      model_artifact_id TEXT,
      suggested_value REAL,
      chosen_value REAL,
      action TEXT NOT NULL CHECK(action IN ('accepted', 'adjusted', 'rejected')),
      reason TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_advisory_feedback_type_created ON advisory_model_feedback(advisory_type, created_at)");
};

const text = (value: unknown, max: number): string => String(value ?? "").trim().slice(0, max);
const finiteOrNull = (value: unknown): number | null => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

export const registerKouroshAdvisorFeedbackRoute = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.post("/api/intelligence/advisory/feedback", authorizeRole(["Admin", "Manager", "Warehouse"]), async (request: Request, response: Response, next) => {
    try {
    const advisoryType = text(request.body?.advisoryType, 80);
    const entityType = text(request.body?.entityType, 40);
    const entityKey = text(request.body?.entityKey, 160);
    const action = text(request.body?.action, 16);
    if (!advisoryType || !entityType || !entityKey || !["accepted", "adjusted", "rejected"].includes(action)) {
      return response.status(400).json({ success: false, message: "بازخورد مشاور کامل یا معتبر نیست." });
    }
    await ensureFeedbackTable();
    const result = await runAsync(`INSERT INTO advisory_model_feedback
      (advisory_type, entity_type, entity_key, model_artifact_id, suggested_value, chosen_value, action, reason, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      advisoryType, entityType, entityKey, text(request.body?.modelArtifactId, 160) || null,
      finiteOrNull(request.body?.suggestedValue), finiteOrNull(request.body?.chosenValue), action,
      text(request.body?.reason, 500) || null, Number((request as any).user?.id || 0) || null,
    ]);
    const row = await getAsync("SELECT id, advisory_type AS advisoryType, entity_type AS entityType, entity_key AS entityKey, action, created_at AS createdAt FROM advisory_model_feedback WHERE id = ?", [result.lastID]);
    return response.status(201).json({ success: true, data: row });
    } catch (error) { return next(error); }
  });
};
