import type { NotificationEvaluationContext, NotificationEvaluationResult, NotificationRuleDecision, RuleReason } from "./notificationRuleTypes";

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const positiveId = (value: number) => Number.isSafeInteger(value) && value > 0;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const DAY = 86400000;

function civilDay(value: string | null): number | null {
  if (!value || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp / DAY;
}
function instant(value: string | null): number | null {
  if (!value || !/^[1-9]\d{3}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
    || civilDay(value.slice(0, 10)) === null) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}
function localDay(timestamp: number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(new Date(timestamp));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

// No I/O, no implicit clock, no outbox, no financial arithmetic and no input mutation.
export function evaluateNotificationRules(context: NotificationEvaluationContext): NotificationEvaluationResult {
  const evaluated = instant(context.evaluatedAt);
  let formatter: Intl.DateTimeFormat | null = null;
  try {
    if (nonempty(context.timezone)) formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone: context.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { /* Each enabled, applicable rule gets an explicit reason. */ }
  const validContext = (nonempty(context.tenantId) || nonempty(context.storeId)) && nonempty(context.eventInstanceId)
    && nonempty(context.eventType) && nonempty(context.entityType) && nonempty(context.sourceType)
    && positiveId(context.entityId) && positiveId(context.customerId) && positiveId(context.sourceId);
  const decisions = context.rules.map(rule => {
    let scheduledFor: string | null = null;
    const decision = (reasonCode: RuleReason): NotificationRuleDecision => ({
      ruleId: rule.id, ruleVersion: rule.version, matched: reasonCode === "MATCHED", reasonCode, scheduledFor,
      schedulePrecision: rule.timing.type === "IMMEDIATE" ? "instant" : "local_date", templateKey: rule.templateKey, channel: rule.channel,
    });
    if (!rule.enabled) return decision("RULE_DISABLED");
    if (rule.valid === false) return decision("INVALID_RULE");
    if (!positiveId(rule.id) || !Number.isSafeInteger(rule.timing.daysOffset) || rule.timing.daysOffset < 0
      || !["sms", "telegram"].includes(rule.channel)
      || !["BEFORE_DUE_DATE", "DUE_DATE", "AFTER_DUE_DATE", "IMMEDIATE"].includes(rule.timing.type)
      || (["DUE_DATE", "IMMEDIATE"].includes(rule.timing.type) && rule.timing.daysOffset !== 0)) return decision("INVALID_RULE");
    if (!validContext) return decision("INVALID_CONTEXT");
    if (!rule.eventTypes.includes(context.eventType)) return decision("EVENT_NOT_MATCHED");
    if (!rule.entityTypes.includes(context.entityType)) return decision("TARGET_NOT_MATCHED");
    if (!formatter) return decision("INVALID_TIMEZONE");
    if (evaluated === null) return decision("INVALID_DATE");
    if (rule.timing.type === "IMMEDIATE") {
      const event = instant(context.eventDate);
      if (event === null) return decision("INVALID_DATE");
      scheduledFor = new Date(event).toISOString();
      if (event > evaluated) return decision("NOT_DUE_YET");
      // v1 has no catch-up policy: only evaluate an immediate event on its local day.
      if (localDay(event, formatter) !== localDay(evaluated, formatter)) return decision("OCCURRENCE_PASSED");
    } else {
      const due = civilDay(context.dueDate);
      if (due === null) return decision("INVALID_DATE");
      const offset = rule.timing.type === "BEFORE_DUE_DATE" ? -rule.timing.daysOffset : rule.timing.daysOffset;
      const scheduledDay = due + offset;
      // Stay inside the prepared four-digit date contract, including extreme offsets.
      if (scheduledDay < civilDay("1000-01-01")! || scheduledDay > civilDay("9999-12-31")!) return decision("INVALID_DATE");
      scheduledFor = new Date(scheduledDay * DAY).toISOString().slice(0, 10);
      const today = localDay(evaluated, formatter);
      if (scheduledFor > today) return decision("NOT_DUE_YET");
      if (scheduledFor < today) return decision("OCCURRENCE_PASSED");
    }
    for (const [key, expected] of Object.entries(rule.conditions)) {
      if (!own(context.facts.conditions, key) || context.facts.conditions[key] === undefined) return decision("REQUIRED_FACT_MISSING");
      if (context.facts.conditions[key] !== expected) return decision("CONDITION_NOT_MET");
    }
    const capability = context.channelCapabilities[rule.channel];
    if (!capability?.enabled || !capability.recipientAvailable) return decision("CHANNEL_UNAVAILABLE");
    const templates = context.availableTemplates.filter(template => template.key === rule.templateKey);
    if (rule.templateAvailable === false || !templates.length || !capability.templateKeys.includes(rule.templateKey)) return decision("TEMPLATE_UNAVAILABLE");
    if (templates.length !== 1) return decision("TEMPLATE_AMBIGUOUS");
    const template = templates[0];
    if (!template.eventTypes.includes(context.eventType)) return decision("TEMPLATE_EVENT_MISMATCH");
    for (const key of template.requiredVariables) {
      const value = own(context.facts.variables, key) ? context.facts.variables[key] : undefined;
      if (value == null || (typeof value === "string" ? !value.trim() : typeof value !== "number" || !Number.isFinite(value))) return decision("REQUIRED_VARIABLE_MISSING");
    }
    const financial = template.requiredVariables.some(key => ["amount", "total"].includes(key));
    if ((financial && !nonempty(template.amountMeaning)) || (template.amountMeaning != null && !nonempty(context.facts.amountMeaning))) return decision("AMOUNT_MEANING_MISSING");
    if (template.amountMeaning != null && template.amountMeaning !== context.facts.amountMeaning) return decision("AMOUNT_MEANING_MISMATCH");
    return decision("MATCHED");
  });
  return { decisions };
}

export type LegacyReminderRule = Readonly<{
  id: number; enabled: number; channel: "sms" | "telegram"; matchType: "days_until" | "overdue_days";
  value: number; targetType?: "both" | "installment" | "check"; updatedAt?: string;
}>;
export type LegacyTemplateBinding = Readonly<{ ruleId: number; entityType: "installment_payment" | "installment_check"; templateKey: string }>;

// Structural adapter only: does not load reminder_rules or reinterpret its free-text template.
export function adaptLegacyReminderRules(rows: readonly LegacyReminderRule[], bindings: readonly LegacyTemplateBinding[]) {
  const rules: NotificationEvaluationContext["rules"][number][] = [];
  const issues: { ruleId: number; code: string }[] = [];
  for (const row of rows) {
    if (!positiveId(row.id) || !Number.isSafeInteger(row.value) || ![0, 1].includes(row.enabled)
      || !["sms", "telegram"].includes(row.channel) || !["days_until", "overdue_days"].includes(row.matchType)
      || !["both", "installment", "check"].includes(row.targetType ?? "both")) {
      issues.push({ ruleId: row.id, code: "INVALID_LEGACY_RULE" }); continue;
    }
    // Preserve the actual legacy meaning of negative values, with visible diagnostics.
    if (row.value < 0) issues.push({ ruleId: row.id, code: "NEGATIVE_LEGACY_OFFSET" });
    const after = row.matchType === "overdue_days" && row.value !== 0 || row.matchType === "days_until" && row.value < 0;
    const timing = { type: row.value === 0 ? "DUE_DATE" as const : after ? "AFTER_DUE_DATE" as const : "BEFORE_DUE_DATE" as const, daysOffset: Math.abs(row.value) };
    const entities = row.targetType === "check" ? ["installment_check"] : row.targetType === "installment" ? ["installment_payment"] : ["installment_payment", "installment_check"];
    for (const entityType of entities) {
      const candidates = bindings.filter(binding => binding.ruleId === row.id && binding.entityType === entityType);
      const templateKey = candidates.length === 1 ? candidates[0].templateKey : "";
      if (!templateKey) issues.push({ ruleId: row.id, code: candidates.length > 1 ? "AMBIGUOUS_TEMPLATE_BINDING" : "TEMPLATE_BINDING_REQUIRED" });
      rules.push({ id: row.id, version: row.updatedAt ?? null, enabled: row.enabled === 1,
        channel: row.channel, entityTypes: [entityType], eventTypes: [entityType === "installment_check" ? "CHECK_DUE" : after ? "INSTALLMENT_OVERDUE" : "INSTALLMENT_DUE"],
        timing, templateKey, conditions: {},
      });
    }
  }
  return { rules, issues };
}
