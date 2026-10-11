import moment from "jalali-moment";
import { adaptLegacyReminderRules, type LegacyReminderRule } from "./evaluateNotificationRules";
import { notificationTemplateRegistry } from "./notificationTemplateRegistry";
import { runNotificationRuleShadow, type NotificationShadowLog, type ShadowCandidate } from "./notificationRuleShadow";
import type { NotificationChannel, NotificationEvaluationContext } from "./notificationRuleTypes";
import { getSmsReminderReadiness, validateSmsReminderContract } from './smsReminderRuleReadiness';

type Row = Readonly<Record<string, any>>;
export type SchedulerShadowState = Readonly<{
  rules: readonly (LegacyReminderRule & { templateKey?: string; eventType?: string; timingType?: string; daysOffset?: number })[];
  timezone: string; storeId: string | null; configuredTemplateKeys: readonly string[];
  smsRuleReady?: Readonly<Record<number, boolean>>;
}>;
export type SchedulerShadowInput = Readonly<{
  kind: "installment" | "check"; row: Row; mode: "sms" | "telegram" | "both";
  originalEventType: string | null; legacyDate: string; evaluatedAt: string;
}>;
const configured = (value: unknown) => /^[1-9]\d*$/.test(String(value ?? "").trim());
const configKeys: Record<string, string> = {
  installment_due_notice: "meli_payamak_installment_due_notice_pattern_id",
  installment_due_3: "meli_payamak_installment_due_3_pattern_id",
  installment_due_7: "meli_payamak_installment_due_7_pattern_id",
  installment_overdue: "meli_payamak_installment_overdue_pattern_id",
  check_due: "meli_payamak_check_due_today_pattern_id",
  check_due_3: "meli_payamak_check_due_3_pattern_id",
  check_due_7: "meli_payamak_check_due_7_pattern_id",
};

// Only SELECT-capable loaders are supplied. No ensure/schema/startup helper is used.
// Read failures propagate to the scheduler's observation-only catch, never its send path.
export async function prepareSchedulerRuleShadow(settings: Row, readers: {
  getEnabledReminderRules: (channel: NotificationChannel) => Promise<any[]>;
  getAsync: (sql: string) => Promise<any>;
}): Promise<SchedulerShadowState> {
  const [sms, telegram, config] = await Promise.all([
    readers.getEnabledReminderRules("sms"), readers.getEnabledReminderRules("telegram"),
    readers.getAsync("SELECT timezone FROM reminder_config WHERE id=1 LIMIT 1"),
  ]);
  return {
    // Copy scalar data only, retaining the stored channel. Never repurpose Telegram rules.
    rules: [...sms, ...telegram].map(r => ({ id: r.id, enabled: r.enabled, channel: r.channel,
      matchType: r.matchType, value: r.value, targetType: r.targetType, updatedAt: r.updatedAt,
      templateKey: r.templateKey, eventType: r.eventType, timingType: r.timingType, daysOffset: r.daysOffset })),
    smsRuleReady: Object.fromEntries(sms.map(rule => [rule.id, getSmsReminderReadiness(rule, settings).ready])),
    timezone: String(config?.timezone || "Asia/Tehran"),
    storeId: typeof settings.installation_id === "string" ? settings.installation_id : null,
    // Availability only: no Body ID lookup/fallback, tokens or secret settings escape.
    configuredTemplateKeys: String(settings.sms_provider || "meli_payamak").toLowerCase() === "meli_payamak"
      ? Object.entries(configKeys).filter(([, key]) => configured(settings[key])).map(([key]) => key) : [],
  };
}

export function schedulerCivilDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
    const date = moment(raw, "jYYYY/jMM/jDD", true);
    return date.isValid() ? date.locale("en").format("YYYY-MM-DD") : null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export function observeSchedulerRuleCandidate(
  state: SchedulerShadowState, input: SchedulerShadowInput,
  log: (entry: NotificationShadowLog & { originalEventType: string | null }) => void,
) {
  // This function has no persistence, sender, retry or scheduler dependency.
  const { row, kind } = input;
  const dueDate = schedulerCivilDate(row.dueDate);
  const sourceId = Number(kind === "installment" ? row.paymentId : row.checkId);
  const entityType = kind === "installment" ? "installment_payment" : "installment_check";
  const localParts = new Intl.DateTimeFormat("en-CA", { timeZone: state.timezone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(input.evaluatedAt));
  const today = ["year", "month", "day"].map(type => localParts.find(p => p.type === type)!.value).join("-");
  const overdue = !input.originalEventType && dueDate != null && dueDate < today;
  const normalizedEvent = kind === "check" ? "CHECK_DUE" : overdue ? "INSTALLMENT_OVERDUE" : "INSTALLMENT_DUE";
  const templateKey = kind === "check" ? "check_due" : overdue ? "installment_overdue" : "installment_due_notice";
  const amountMeaning = kind === "check" ? "check_amount" : "scheduled_installment_amount";
  const channels: NotificationChannel[] = input.mode === "both" ? ["sms", "telegram"] : [input.mode];
  return channels.map(channel => {
    const rows = state.rules.filter(rule => rule.channel === channel);
    // Current reminder_rules stores free text, not an SMS template binding. Only an
    // explicit semantic key is accepted; do not infer a binding from text or Body ID.
    const bindings = rows.flatMap(rule => {
      const key = rule.templateKey;
      return notificationTemplateRegistry.some(t => t.key === key)
        ? [{ ruleId: rule.id, entityType, templateKey: key! } as any] : [];
    });
    const adapted = adaptLegacyReminderRules(rows, bindings);
    const configuredKeys = channel === "sms" ? state.configuredTemplateKeys : bindings.map(binding => binding.templateKey);
    const rules = adapted.rules.map(legacyRule => {
      const stored = rows.find(row => row.id === legacyRule.id)!;
      const modern = channel === 'sms' && stored.eventType != null;
      const validated = modern ? validateSmsReminderContract(stored as unknown as Record<string, unknown>) : null;
      const contract = validated?.contract;
      const rule = contract ? { ...legacyRule, eventTypes: [contract.eventType],
        entityTypes: [contract.targetType === 'check' ? 'installment_check' : 'installment_payment'],
        timing: { type: contract.timingType, daysOffset: contract.daysOffset } } : legacyRule;
      const offset = rule.timing.daysOffset;
      const requiredKey = channel === "sms" && rule.templateKey === "installment_due_notice" && [3, 7].includes(offset) ? `installment_due_${offset}`
        : channel === "sms" && rule.templateKey === "check_due" && [3, 7].includes(offset) ? `check_due_${offset}` : rule.templateKey;
      return { ...rule, valid: !modern || Boolean(contract),
        templateAvailable: modern ? state.smsRuleReady?.[rule.id] === true : configuredKeys.includes(requiredKey), conditions: {
        ...rule.conditions, contractActive: true, customerChannelEligible: true,
        ...(kind === "check" ? { checkPending: true } : { hasOutstandingBalance: true }),
      } };
    });
    const recipientAvailable = channel === "sms"
      ? Boolean(String(row.customerPhone ?? row.customerPhoneNumber ?? "").trim())
      : Boolean(String(row.telegramChatId ?? "").trim()) && String(row.telegramOptedOut ?? "0") !== "1" && String(row.telegramInvalid ?? "0") !== "1";
    const capabilityKeys = rules.filter(rule => rule.templateAvailable).map(rule => rule.templateKey);
    const context: NotificationEvaluationContext = {
      tenantId: null, storeId: state.storeId, eventType: normalizedEvent,
      eventInstanceId: `${kind}:${sourceId}:${dueDate ?? "invalid"}`, entityType, entityId: sourceId,
      customerId: Number(row.customerId), sourceType: kind, sourceId, eventDate: null, dueDate,
      evaluatedAt: input.evaluatedAt, timezone: state.timezone, rules,
      availableTemplates: notificationTemplateRegistry,
      channelCapabilities: { [channel]: { enabled: true, recipientAvailable, templateKeys: capabilityKeys } },
      facts: { conditions: {
        // Proven by the existing pending selector's active-contract WHERE and filter.
        contractActive: true, customerChannelEligible: recipientAvailable,
        ...(kind === "check" ? { checkPending: true } : { hasOutstandingBalance: Number(row.effectiveRemaining) > 0 }),
      }, variables: { name: row.customerFullName, dueDate: row.dueDate,
        amount: kind === "check" ? row.originalAmount : row.originalAmountDue, checkNumber: row.checkNumber }, amountMeaning },
    };
    const legacyDecisions: ShadowCandidate[] = input.originalEventType ? [{
      normalizedEvent: input.originalEventType.startsWith("CHECK_") ? "CHECK_DUE" : "INSTALLMENT_DUE",
      customerId: Number(row.customerId), sourceType: kind, sourceId, ruleId: null, ruleVersion: null,
      channel, scheduledFor: input.legacyDate, schedulePrecision: "local_date", templateKey, amountMeaning,
    }] : [];
    const result = runNotificationRuleShadow({ context, legacyDecisions, includeNormalizedEvent: true }, entry => log({ ...entry, originalEventType: input.originalEventType }));
    return { ...result, channel, sourceId, customerId: Number(row.customerId),
      originalEventType: input.originalEventType, normalizedEvent, adapterIssues: adapted.issues };
  });
}

// The catch includes input construction, evaluation and logger execution. No thrown
// error text/raw input is logged: either may contain private data.
export function safelyObserveSchedulerCandidate(work: () => unknown): void {
  try { work(); } catch {
    try { console.warn("NOTIFICATION_RULE_SHADOW_ERROR", { reasonCode: "SHADOW_OBSERVATION_FAILED" }); } catch {}
  }
}
