import type { SmsPatternDef } from '../../components/SmsBulkTestModal';
import { MELI_PAYAMAK_PATTERN_DEFINITIONS } from '../../shared/messages';
import type { SmsBusinessInfo } from './index';

import { buildSmsProviderDefinitions, type SmsProviderDefinition } from './settingsSmsProviderDefinitions';
export type { SmsProviderDefinition, SmsProviderFieldDef, SmsProviderFieldGroup } from './settingsSmsProviderDefinitions';
	// تعریف مرکزی پترن‌های ملی‌پیامک از منبع واحد پیام‌ها
export const meliPatternDefs: SmsPatternDef[] = MELI_PAYAMAK_PATTERN_DEFINITIONS.map((item) => ({
  key: item.key,
  label: item.label,
  category: item.category,
  accent: item.accent,
  iconClass: item.iconClass,
  tokens: [...item.tokens],
  previewTemplate: item.previewTemplate,
}));


export const smsProviderDefinitions = buildSmsProviderDefinitions(meliPatternDefs);

export interface SettingsSmsViewModel {
  smsInfo: SmsBusinessInfo;
  getSmsInfoString: (key: string) => string;
  smsConfiguredCount: number;
  smsTotalCount: number;
  smsAutomationCount: number;
  smsProviderMeta: { title: string; subtitle: string; icon: string };
  smsProviderKey: string;
  smsProviderDefinition: SmsProviderDefinition;
  smsCredentialReady: boolean;
  smsCredentialConfiguredCount: number;
  smsCredentialTotalCount: number;
  smsReadinessPercent: number;
  smsMissingRequirements: string[];
  smsCoreReady: boolean;
  meliPatternDefs: SmsPatternDef[];
}

export const buildSettingsSmsViewModel = (businessInfo: SmsBusinessInfo): SettingsSmsViewModel => {
  const smsInfo = businessInfo;
  const getSmsInfoString = (key: string) => String(smsInfo[key] || '').trim();
  const smsProviderKey = String(smsInfo.sms_provider || 'meli_payamak');
  const smsProviderDefinition = smsProviderDefinitions[smsProviderKey] || smsProviderDefinitions.meli_payamak;
  const smsConfiguredCount = smsProviderDefinition.templates.filter((field) => Boolean(getSmsInfoString(field.key))).length;
  const smsTotalCount = smsProviderDefinition.templates.length;
  const smsCredentialConfiguredCount = smsProviderDefinition.credentials.filter((field) => Boolean(getSmsInfoString(field.key))).length;
  const smsCredentialTotalCount = smsProviderDefinition.credentials.length;
  const smsCredentialReady = smsProviderDefinition.credentials
    .filter((field) => field.required !== false)
    .every((field) => Boolean(getSmsInfoString(field.key)));
  const smsAutomationCount = [
    smsInfo.auto_send_installment_due,
    smsInfo.auto_send_check_due,
    smsInfo.auto_send_repair_ready,
  ].filter((value) => ['sms', 'both'].includes(String(value || 'off'))).length;
  const readinessDenominator = Math.max(1, smsCredentialTotalCount + smsTotalCount);
  const smsReadinessPercent = Math.round(((smsCredentialConfiguredCount + smsConfiguredCount) / readinessDenominator) * 100);
  const smsMissingRequirements = [
    ...smsProviderDefinition.credentials
      .filter((field) => field.required !== false && !getSmsInfoString(field.key))
      .map((field) => field.label),
    ...(smsConfiguredCount === 0 ? ['حداقل یک قالب پیامک'] : []),
  ];
  const smsCoreReady = smsCredentialReady && smsConfiguredCount > 0;

  return {
    smsInfo,
    getSmsInfoString,
    smsConfiguredCount,
    smsTotalCount,
    smsAutomationCount,
    smsProviderMeta: smsProviderDefinition,
    smsProviderKey,
    smsProviderDefinition,
    smsCredentialReady,
    smsCredentialConfiguredCount,
    smsCredentialTotalCount,
    smsReadinessPercent,
    smsMissingRequirements,
    smsCoreReady,
    meliPatternDefs,
  };
};
