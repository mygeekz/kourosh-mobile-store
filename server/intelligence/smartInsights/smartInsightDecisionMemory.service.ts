import { runAsync } from "../../database";
import {
  smartDecisionCopy,
  smartInsightNum,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

const attachSmartInsightDecisionMemory = async ({
  aiIsEnabled,
  insights,
}: {
  aiIsEnabled: (key: string) => boolean;
  insights: any[];
}) => {
  let memoryRows: any[] = [];
  if (aiIsEnabled("decision_memory")) {
    for (const insight of insights) {
      await runAsync(
        `
            INSERT INTO smart_insight_decisions (insightId, type, title, severity, score, confidence, occurrenceCount, lastGeneratedAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
            ON CONFLICT(insightId) DO UPDATE SET
              type = excluded.type,
              title = excluded.title,
              severity = excluded.severity,
              score = excluded.score,
              confidence = excluded.confidence,
              occurrenceCount = COALESCE(smart_insight_decisions.occurrenceCount, 0) + 1,
              lastGeneratedAt = excluded.lastGeneratedAt,
              updatedAt = excluded.updatedAt
          `,
        [
          insight.id,
          insight.type,
          insight.title,
          insight.severity,
          insight.score,
          insight.confidence,
        ],
      );
    }
    memoryRows = await smartInsightSafeRows(
      `SELECT * FROM smart_insight_decisions ORDER BY updatedAt DESC LIMIT 500`,
    );
    const memoryById = new Map(
      (memoryRows || []).map((r: any) => [String(r.insightId), r]),
    );
    for (const insight of insights) {
      const memory: any = memoryById.get(String(insight.id)) || {};
      insight.decision = {
        status: memory.status || "open",
        userDecision: memory.userDecision || "pending",
        outcome: memory.outcome || "unknown",
        note: memory.note || "",
        actionLabel: memory.actionLabel || "",
        occurrenceCount: smartInsightNum(memory.occurrenceCount),
        firstGeneratedAt: memory.firstGeneratedAt || null,
        lastGeneratedAt: memory.lastGeneratedAt || null,
        decidedAt: memory.decidedAt || null,
        outcomeAt: memory.outcomeAt || null,
        ...smartDecisionCopy(memory),
      };
    }
  }
  return memoryRows;
};

export { attachSmartInsightDecisionMemory };
