import { runAsync } from "../database";

export const makeUtcIsoTimestamp = () => new Date().toISOString();
export type SmsLogInsert = {
  reqUser?: { id?: number; username?: string };
  provider: string;
  eventType?: string;
  entityType?: string;
  entityId?: number | null;
  recipient: string;
  eventKey?: string | null;
  capCustomerId?: number | null;
  patternId?: string;
  tokens?: string[];
  success: boolean;
  response?: any;
  error?: string;
  request?: any;
  httpStatus?: number;
  rawResponseText?: string;
  durationMs?: number;
  correlationId?: string;
  relatedLogId?: number;
};
export const insertSmsLog = async (x: SmsLogInsert) => {
  try {
    await runAsync(
      `INSERT INTO sms_logs (
        createdAt,
        createdByUserId,
        createdByUsername,
        provider,
        eventType,
        entityType,
        entityId,
        recipient,
        patternId,
        tokensJson,
        success,
        requestJson,
        httpStatus,
        rawResponseText,
        durationMs,
        correlationId,
        responseJson,
        error,
        errorText,
        relatedLogId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        makeUtcIsoTimestamp(),
        x.reqUser?.id ?? null,
        x.reqUser?.username ?? null,
        x.provider,
        x.eventType ?? null,
        x.entityType ?? null,
        x.entityId ?? null,
        x.recipient,
        x.patternId ?? null,
        x.tokens ? JSON.stringify(x.tokens) : null,
        x.success ? 1 : 0,
        x.request ? JSON.stringify(x.request) : null,
        typeof x.httpStatus === "number" ? x.httpStatus : null,
        x.rawResponseText ?? null,
        typeof x.durationMs === "number" ? x.durationMs : null,
        x.correlationId ?? null,
        x.response ? JSON.stringify(x.response) : null,
        x.error ?? null,
        x.error ?? null,
        x.relatedLogId ?? null,
      ],
    );
  } catch (e) {
    // don't break main flows
    console.error("Failed to insert sms_logs:", e);
  }
};
export const inferEntityTypeFromEvent = (eventType?: string): string | undefined => {
  if (!eventType) return undefined;
  if (eventType.startsWith("INSTALLMENT")) return "installment";
  if (eventType.startsWith("REPAIR")) return "repair";
  if (eventType.startsWith("CHECK")) return "check";
  return undefined;
};
