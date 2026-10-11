import { runAsync } from "../database";
import { buildNotificationContext, notificationValidationSummary, type NotificationContext } from "./notificationContext";

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
  notificationContext?: Partial<NotificationContext>;
};
export const insertSmsLog = async (x: SmsLogInsert) => {
  try {
    const loggedAt = makeUtcIsoTimestamp();
    const existingRequest = x.request && typeof x.request === "object" && !Array.isArray(x.request)
      ? x.request
      : {};
    const financial = existingRequest.financialSms && typeof existingRequest.financialSms === "object"
      ? existingRequest.financialSms
      : undefined;
    const financialPayload = financial?.payload && typeof financial.payload === "object"
      ? financial.payload
      : {};
    const existingProviderRequest = existingRequest.providerRequest && typeof existingRequest.providerRequest === "object"
      ? existingRequest.providerRequest
      : {};
    const responseDetails = x.response?.details && typeof x.response.details === "object"
      ? x.response.details
      : {};

    const supplied = x.notificationContext ?? existingRequest.notificationContext ?? financialPayload?.notificationContext ?? {};
    const notificationContext = buildNotificationContext({
      eventType: x.eventType,
      entityType: financial?.context?.entityType ?? x.entityType,
      entityId: financial?.context?.entityId ?? x.entityId,
      createdAt: financial?.context?.createdAt ?? loggedAt,
    }, financialPayload, {
      ...supplied,
      createdBy: Object.prototype.hasOwnProperty.call(supplied, "createdBy")
        ? supplied.createdBy
        : (x.reqUser ? { userId: x.reqUser.id, username: x.reqUser.username } : null),
    });

    const resolvedTokens = Array.isArray(x.tokens) && x.tokens.length
      ? x.tokens.map((value) => String(value))
      : Array.isArray(existingProviderRequest.tokens) && existingProviderRequest.tokens.length
        ? existingProviderRequest.tokens.map((value: any) => String(value))
        : Array.isArray(financialPayload.tokens) && financialPayload.tokens.length
          ? financialPayload.tokens.map((value: any) => String(value))
          : Array.isArray(existingRequest.tokens) && existingRequest.tokens.length
            ? existingRequest.tokens.map((value: any) => String(value))
            : undefined;

    const normalizedProvider = String(x.provider || "").trim().toLowerCase();
    const payloadPattern = normalizedProvider === "meli_payamak"
      ? financialPayload.meliBodyId
      : normalizedProvider === "kavenegar"
        ? financialPayload.kavenegarTemplate
        : normalizedProvider === "sms_ir"
          ? financialPayload.smsIrTemplateId
          : normalizedProvider === "ippanel"
            ? financialPayload.ippanelPatternCode
            : undefined;

    const resolvedPatternId = String(
      x.patternId ||
      existingProviderRequest.patternId ||
      payloadPattern ||
      existingRequest.patternId ||
      existingRequest.bodyId ||
      "",
    ).trim() || null;

    const resolvedHttpStatus = typeof x.httpStatus === "number"
      ? x.httpStatus
      : typeof responseDetails.httpStatus === "number"
        ? responseDetails.httpStatus
        : null;
    const resolvedRawResponseText = typeof x.rawResponseText === "string"
      ? x.rawResponseText
      : typeof responseDetails.rawResponseText === "string"
        ? responseDetails.rawResponseText
        : null;
    const resolvedDurationMs = typeof x.durationMs === "number"
      ? x.durationMs
      : typeof responseDetails.durationMs === "number"
        ? responseDetails.durationMs
        : null;

    let request: any = x.request;
    if (x.provider !== "telegram") {
      request = {
        ...existingRequest,
        providerRequest: {
          provider: x.provider,
          recipient: x.recipient,
          patternId: resolvedPatternId,
          tokens: resolvedTokens ?? [],
        },
        notificationContext,
        ...(x.response?.validation
          ? { validation: notificationValidationSummary(x.response.validation) }
          : {}),
      };
    }

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
        loggedAt,
        x.reqUser?.id ?? null,
        x.reqUser?.username ?? null,
        x.provider,
        x.eventType ?? null,
        x.entityType ?? null,
        x.entityId ?? null,
        x.recipient,
        resolvedPatternId,
        resolvedTokens ? JSON.stringify(resolvedTokens) : null,
        x.success ? 1 : 0,
        request ? JSON.stringify(request) : null,
        resolvedHttpStatus,
        resolvedRawResponseText,
        resolvedDurationMs,
        x.correlationId ?? null,
        x.response ? JSON.stringify(x.response) : null,
        x.error ?? null,
        x.error ?? null,
        x.relatedLogId ?? null,
      ],
    );
  } catch (e) {
    // Observability must never break the originating business flow.
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
