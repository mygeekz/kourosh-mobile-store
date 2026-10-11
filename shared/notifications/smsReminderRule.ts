export type SmsReminderEvent = 'INSTALLMENT_DUE' | 'INSTALLMENT_OVERDUE' | 'CHECK_DUE' | 'CHECK_FAILED';
export type SmsReminderTiming = 'BEFORE_DUE_DATE' | 'DUE_DATE' | 'AFTER_DUE_DATE' | 'IMMEDIATE';
export type SmsReminderContract = {
  eventType: SmsReminderEvent; timingType: SmsReminderTiming; daysOffset: number;
  targetType: 'installment' | 'check'; templateKey: string | null;
};
export const smsReminderOptions = [
  { eventType: 'INSTALLMENT_DUE', targetType: 'installment', templateKey: 'installment_due_notice', label: 'یادآوری قسط', timings: ['BEFORE_DUE_DATE', 'DUE_DATE'] },
  { eventType: 'INSTALLMENT_OVERDUE', targetType: 'installment', templateKey: 'installment_overdue', label: 'پیگیری قسط معوق', timings: ['AFTER_DUE_DATE'] },
  { eventType: 'CHECK_DUE', targetType: 'check', templateKey: 'check_due', label: 'یادآوری چک', timings: ['BEFORE_DUE_DATE', 'DUE_DATE', 'AFTER_DUE_DATE'] },
  { eventType: 'CHECK_FAILED', targetType: 'check', templateKey: 'check_failed', label: 'اطلاع‌رسانی چک برگشتی', timings: ['IMMEDIATE'] },
] as const;
export type SmsRuleReadiness = {
  status: 'READY' | 'NOT_READY' | 'DISABLED'; ready: boolean; reasonCode: string; message: string;
  templateLabel: string; provider: string; bindingExists: boolean; tokenContractSupported: boolean;
  expectedTokenCount: number; requiredVariables: readonly string[]; amountMeaning: string | null;
  deliveryMode: 'shadow_only';
};

export function validateSmsReminderContract(input: Record<string, unknown>): { contract: SmsReminderContract | null; errors: string[] } {
  const errors: string[] = [];
  const definition = smsReminderOptions.find(item => item.eventType === input.eventType);
  if (!definition) errors.push('INVALID_EVENT');
  if (definition && definition.targetType !== input.targetType) errors.push('INCOMPATIBLE_TARGET');
  if (!definition || !(definition.timings as readonly unknown[]).includes(input.timingType)) errors.push('INVALID_TIMING');
  const days = input.daysOffset;
  if (typeof days !== 'number' || !Number.isSafeInteger(days) || days < 0) errors.push('INVALID_OFFSET');
  else if ((['DUE_DATE','IMMEDIATE'].includes(String(input.timingType)) && days !== 0)
    || (input.timingType === 'AFTER_DUE_DATE' && days === 0)) errors.push('INVALID_OFFSET');
  const key = input.templateKey == null || input.templateKey === '' ? null : input.templateKey;
  if (key !== null && key !== definition?.templateKey) errors.push('INCOMPATIBLE_TEMPLATE');
  if (errors.length) return { contract: null, errors };
  return { errors, contract: { eventType: input.eventType as SmsReminderEvent, targetType: definition!.targetType,
    timingType: input.timingType as SmsReminderTiming, daysOffset: days as number, templateKey: key as string | null } };
}

export function describeSmsReminder(rule: Partial<SmsReminderContract>): string {
  const label = smsReminderOptions.find(item => item.eventType === rule.eventType)?.label || 'یادآوری';
  const days = Number(rule.daysOffset ?? 0).toLocaleString('fa-IR');
  const timing = rule.timingType === 'IMMEDIATE' ? 'هنگام ثبت رویداد'
    : rule.timingType === 'DUE_DATE' || (rule.timingType === 'BEFORE_DUE_DATE' && rule.daysOffset === 0) ? 'روز سررسید'
      : `${days} روز ${rule.timingType === 'AFTER_DUE_DATE' ? 'پس از' : 'قبل از'} سررسید`;
  return `پیامک ${label}، ${timing}`;
}
