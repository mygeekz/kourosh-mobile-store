// Prepared server-side data only. Observability context is not an authorization source.
export type NotificationChannel = "sms" | "telegram";
export type NotificationFact = string | number | boolean | null;
export type RuleTiming = Readonly<{
  type: "BEFORE_DUE_DATE" | "DUE_DATE" | "AFTER_DUE_DATE" | "IMMEDIATE";
  daysOffset: number;
}>;
export type NotificationRule = Readonly<{
  id: number;
  version: string | null;
  enabled: boolean;
  valid?: boolean;
  eventTypes: readonly string[];
  entityTypes: readonly string[];
  timing: RuleTiming;
  channel: NotificationChannel;
  templateKey: string;
  // Prepared per-rule binding availability; prevents one rule's config enabling another.
  templateAvailable?: boolean;
  conditions: Readonly<Record<string, NotificationFact>>;
}>;
export type NotificationTemplate = Readonly<{
  key: string;
  eventTypes: readonly string[];
  requiredVariables: readonly string[];
  // null means this template has no financial amount, not an unknown amount meaning.
  amountMeaning: string | null;
}>;
export type NotificationEvaluationContext = Readonly<{
  tenantId: string | null;
  storeId: string | null;
  eventType: string;
  eventInstanceId: string;
  entityType: string;
  entityId: number;
  customerId: number;
  sourceType: string;
  sourceId: number;
  // ISO timestamp with offset, or null for a date-derived candidate.
  eventDate: string | null;
  // Prepared Gregorian civil date YYYY-MM-DD. Persian parsing stays in the caller.
  dueDate: string | null;
  evaluatedAt: string;
  timezone: string;
  facts: Readonly<{
    conditions: Readonly<Record<string, NotificationFact>>;
    variables: Readonly<Record<string, unknown>>;
    amountMeaning: string | null;
  }>;
  rules: readonly NotificationRule[];
  availableTemplates: readonly NotificationTemplate[];
  channelCapabilities: Readonly<Partial<Record<NotificationChannel, Readonly<{
    enabled: boolean;
    recipientAvailable: boolean;
    templateKeys: readonly string[];
  }>>>>;
}>;
export type RuleReason = "MATCHED" | "RULE_DISABLED" | "INVALID_RULE" | "INVALID_CONTEXT"
  | "EVENT_NOT_MATCHED" | "TARGET_NOT_MATCHED" | "INVALID_TIMEZONE" | "INVALID_DATE"
  | "NOT_DUE_YET" | "OCCURRENCE_PASSED" | "REQUIRED_FACT_MISSING" | "CONDITION_NOT_MET"
  | "CHANNEL_UNAVAILABLE" | "TEMPLATE_UNAVAILABLE" | "TEMPLATE_AMBIGUOUS"
  | "TEMPLATE_EVENT_MISMATCH" | "REQUIRED_VARIABLE_MISSING" | "AMOUNT_MEANING_MISSING"
  | "AMOUNT_MEANING_MISMATCH";
export type NotificationRuleDecision = Readonly<{
  ruleId: number;
  ruleVersion: string | null;
  matched: boolean;
  reasonCode: RuleReason;
  // Due rules: local YYYY-MM-DD. Immediate: original event instant normalized to UTC.
  // This is a comparison coordinate, not a send-at instruction.
  scheduledFor: string | null;
  schedulePrecision: "local_date" | "instant";
  templateKey: string;
  channel: NotificationChannel;
}>;
export type NotificationEvaluationResult = Readonly<{ decisions: readonly NotificationRuleDecision[] }>;
