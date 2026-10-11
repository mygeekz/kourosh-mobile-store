import { MELI_PAYAMAK_PATTERN_DEFINITIONS } from '../../../shared/messages';
import { smsReminderOptions, validateSmsReminderContract, type SmsReminderContract, type SmsRuleReadiness } from '../../../shared/notifications/smsReminderRule';
import { notificationTemplateRegistry } from './notificationTemplateRegistry';
import { providerTemplateBindings, type ProviderTemplateKey } from './providerTemplateBindings';
export { validateSmsReminderContract };

// Local provider contracts only. Never resolve an alternative Body ID or call provider APIs.
export function smsReminderBinding(contract: SmsReminderContract): { settingKey: string | null; tokenKeys: readonly string[] } {
  if (contract.templateKey && contract.templateKey in providerTemplateBindings) {
    const binding = providerTemplateBindings[contract.templateKey as ProviderTemplateKey];
    return { settingKey: binding.settingKey, tokenKeys: binding.tokenKeys };
  }
  if (contract.eventType === 'CHECK_FAILED') return { settingKey: 'meli_payamak_check_failed_pattern_id', tokenKeys: ['name','amount','dueDate'] };
  // Check reminders have only the existing 0/3/7 provider bindings. Do not assume
  // their approved text works for arbitrary offsets or overdue reminders.
  const suffix = contract.timingType !== 'AFTER_DUE_DATE' && [0,3,7].includes(contract.daysOffset)
    ? contract.daysOffset === 0 ? 'today' : String(contract.daysOffset) : null;
  return { settingKey: suffix ? `meli_payamak_check_due_${suffix}_pattern_id` : null, tokenKeys: ['name','checkNumber','dueDate','amount'] };
}

export const smsReminderSettingKeys = [
  'sms_provider', 'meli_payamak_username', 'meli_payamak_password', 'meli_payamak_installment_due_notice_pattern_id', 'meli_payamak_installment_overdue_pattern_id',
  'meli_payamak_check_due_today_pattern_id', 'meli_payamak_check_due_3_pattern_id', 'meli_payamak_check_due_7_pattern_id', 'meli_payamak_check_failed_pattern_id',
] as const;

export function getSmsReminderReadiness(input: Record<string, unknown>, settings: Readonly<Record<string, unknown>>): SmsRuleReadiness {
  const { contract, errors } = validateSmsReminderContract(input);
  const template = notificationTemplateRegistry.find(item => item.key === input.templateKey);
  const provider = String(settings.sms_provider || 'meli_payamak').toLowerCase();
  const binding = contract ? smsReminderBinding(contract) : null;
  const definition = binding?.settingKey ? MELI_PAYAMAK_PATTERN_DEFINITIONS.find(item => item.key === binding.settingKey) : null;
  // The existing check sender explicitly uses this four-token order; other patterns
  // must match the central messages catalog, including order, without rendering tokens.
  const knownOrder = definition?.tokenKeys ?? (contract?.eventType === 'CHECK_DUE' ? ['name','checkNumber','dueDate','amount'] : []);
  const supported = Boolean(template && binding?.settingKey && template.eventTypes.includes(String(input.eventType))
    && JSON.stringify(template.requiredVariables) === JSON.stringify(binding.tokenKeys)
    && JSON.stringify(knownOrder) === JSON.stringify(binding.tokenKeys) && template.amountMeaning);
  const bindingValue = binding?.settingKey ? String(settings[binding.settingKey] ?? '').trim() : '';
  const bindingExists = /^[1-9]\d*$/.test(bindingValue) && Number.isSafeInteger(Number(bindingValue));
  const channelAvailable = provider === 'meli_payamak' && Boolean(String(settings.meli_payamak_username ?? '').trim() && String(settings.meli_payamak_password ?? '').trim());
  const reasonCode = errors[0] || (!template ? 'TEMPLATE_UNAVAILABLE' : !channelAvailable ? 'CHANNEL_UNAVAILABLE'
    : !supported ? 'TOKEN_CONTRACT_UNSUPPORTED' : !bindingExists ? 'TEMPLATE_UNAVAILABLE' : 'READY');
  const ready = reasonCode === 'READY';
  return { status: !input.enabled ? 'DISABLED' : ready ? 'READY' : 'NOT_READY', ready, reasonCode,
    message: ready ? 'قالب آماده است' : reasonCode === 'TEMPLATE_UNAVAILABLE' ? 'قالب پیامک تنظیم نشده'
      : reasonCode === 'CHANNEL_UNAVAILABLE' ? 'حساب سرویس پیامک تنظیم نشده یا پشتیبانی نمی‌شود'
        : reasonCode === 'TOKEN_CONTRACT_UNSUPPORTED' ? 'قرارداد قالب برای این زمان‌بندی پشتیبانی نمی‌شود' : 'مشخصات قانون معتبر نیست',
    templateLabel: smsReminderOptions.find(item => item.eventType === input.eventType)?.label || 'قالب انتخاب نشده',
    provider: ['meli_payamak','kavenegar','sms_ir','ippanel'].includes(provider) ? provider : 'unsupported',
    bindingExists, tokenContractSupported: supported, expectedTokenCount: template?.requiredVariables.length || 0,
    requiredVariables: template?.requiredVariables || [], amountMeaning: template?.amountMeaning || null, deliveryMode: 'shadow_only' };
}
