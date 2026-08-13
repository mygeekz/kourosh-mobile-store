import type { SmsPatternDef } from '../../components/SmsBulkTestModal';

export type SmsProviderFieldKind = 'text' | 'secret' | 'numeric';
export type SmsProviderFieldGroup = 'credentials' | 'installments' | 'checks' | 'repairs';

export type SmsProviderFieldDef = {
  key: string;
  label: string;
  group: SmsProviderFieldGroup;
  kind?: SmsProviderFieldKind;
  required?: boolean;
  placeholder?: string;
};

export type SmsProviderDefinition = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  credentials: SmsProviderFieldDef[];
  templates: SmsProviderFieldDef[];
  supportsLivePatternTest: boolean;
};

const commonTemplateLabels = {
  installmentDue7: 'قسط — ۷ روز قبل',
  installmentDue3: 'قسط — ۳ روز قبل',
  installmentDueToday: 'قسط — روز سررسید',
  checkDue7: 'چک — ۷ روز قبل',
  checkDue3: 'چک — ۳ روز قبل',
  checkDueToday: 'چک — روز سررسید',
  installmentReminder: 'یادآوری عمومی قسط',
  installmentCompleted: 'تسویه کامل اقساط',
  repairReceived: 'پذیرش تعمیر',
  repairCostEstimated: 'برآورد هزینه تعمیر',
  repairReady: 'آماده تحویل تعمیر',
};

export const buildSmsProviderDefinitions = (meliPatternDefs: SmsPatternDef[]): Record<string, SmsProviderDefinition> => ({
  meli_payamak: {
    key: 'meli_payamak',
    title: 'ملی‌پیامک',
    subtitle: 'ارسال پترنی با BodyId و SendByBaseNumber2',
    icon: 'fa-mobile-screen-button',
    credentials: [
      { key: 'meli_payamak_username', label: 'نام کاربری پنل', group: 'credentials', required: true, placeholder: 'نام کاربری ملی‌پیامک' },
      { key: 'meli_payamak_password', label: 'رمز عبور پنل', group: 'credentials', kind: 'secret', required: true, placeholder: 'رمز عبور ملی‌پیامک' },
    ],
    templates: meliPatternDefs.map((pattern) => ({
      key: String(pattern.key),
      label: pattern.label,
      group: pattern.category === 'اقساط'
        ? 'installments'
        : pattern.category === 'تعمیرات'
          ? 'repairs'
          : pattern.category === 'چک‌ها'
            ? 'checks'
            : 'installments',
      kind: 'numeric' as const,
      placeholder: 'BodyId',
    })),
    supportsLivePatternTest: true,
  },
  kavenegar: {
    key: 'kavenegar',
    title: 'کاوه‌نگار',
    subtitle: 'ارسال الگو محور با API Key و نام Template',
    icon: 'fa-bolt',
    credentials: [
      { key: 'kavenegar_api_key', label: 'کلید API کاوه‌نگار', group: 'credentials', kind: 'secret', required: true, placeholder: 'API Key' },
    ],
    templates: [
      { key: 'kavenegar_installment_due_7_template', label: commonTemplateLabels.installmentDue7, group: 'installments' },
      { key: 'kavenegar_installment_due_3_template', label: commonTemplateLabels.installmentDue3, group: 'installments' },
      { key: 'kavenegar_installment_due_today_template', label: commonTemplateLabels.installmentDueToday, group: 'installments' },
      { key: 'kavenegar_check_due_7_template', label: commonTemplateLabels.checkDue7, group: 'checks' },
      { key: 'kavenegar_check_due_3_template', label: commonTemplateLabels.checkDue3, group: 'checks' },
      { key: 'kavenegar_check_due_today_template', label: commonTemplateLabels.checkDueToday, group: 'checks' },
      { key: 'kavenegar_installment_template', label: commonTemplateLabels.installmentReminder, group: 'installments' },
      { key: 'kavenegar_installment_completed_template', label: commonTemplateLabels.installmentCompleted, group: 'installments' },
      { key: 'kavenegar_repair_received_template', label: commonTemplateLabels.repairReceived, group: 'repairs' },
      { key: 'kavenegar_repair_cost_estimated_template', label: commonTemplateLabels.repairCostEstimated, group: 'repairs' },
      { key: 'kavenegar_repair_ready_template', label: commonTemplateLabels.repairReady, group: 'repairs' },
    ],
    supportsLivePatternTest: false,
  },
  sms_ir: {
    key: 'sms_ir',
    title: 'SMS.ir',
    subtitle: 'ارسال پترنی با API Key و Template ID',
    icon: 'fa-envelope-open-text',
    credentials: [
      { key: 'sms_ir_api_key', label: 'کلید API SMS.ir', group: 'credentials', kind: 'secret', required: true, placeholder: 'API Key' },
    ],
    templates: [
      { key: 'sms_ir_installment_due_7_template_id', label: commonTemplateLabels.installmentDue7, group: 'installments', kind: 'numeric' },
      { key: 'sms_ir_installment_due_3_template_id', label: commonTemplateLabels.installmentDue3, group: 'installments', kind: 'numeric' },
      { key: 'sms_ir_installment_due_today_template_id', label: commonTemplateLabels.installmentDueToday, group: 'installments', kind: 'numeric' },
      { key: 'sms_ir_check_due_7_template_id', label: commonTemplateLabels.checkDue7, group: 'checks', kind: 'numeric' },
      { key: 'sms_ir_check_due_3_template_id', label: commonTemplateLabels.checkDue3, group: 'checks', kind: 'numeric' },
      { key: 'sms_ir_check_due_today_template_id', label: commonTemplateLabels.checkDueToday, group: 'checks', kind: 'numeric' },
      { key: 'sms_ir_installment_template_id', label: commonTemplateLabels.installmentReminder, group: 'installments', kind: 'numeric' },
      { key: 'sms_ir_installment_completed_template_id', label: commonTemplateLabels.installmentCompleted, group: 'installments', kind: 'numeric' },
      { key: 'sms_ir_repair_received_template_id', label: commonTemplateLabels.repairReceived, group: 'repairs', kind: 'numeric' },
      { key: 'sms_ir_repair_cost_estimated_template_id', label: commonTemplateLabels.repairCostEstimated, group: 'repairs', kind: 'numeric' },
      { key: 'sms_ir_repair_ready_template_id', label: commonTemplateLabels.repairReady, group: 'repairs', kind: 'numeric' },
    ],
    supportsLivePatternTest: false,
  },
  ippanel: {
    key: 'ippanel',
    title: 'IPPanel',
    subtitle: 'ارسال الگو محور با Token، شماره فرستنده و Pattern Code',
    icon: 'fa-satellite-dish',
    credentials: [
      { key: 'ippanel_token', label: 'توکن IPPanel', group: 'credentials', kind: 'secret', required: true, placeholder: 'Access Token' },
      { key: 'ippanel_from_number', label: 'شماره فرستنده', group: 'credentials', required: true, placeholder: 'شماره خط خدماتی' },
    ],
    templates: [
      { key: 'ippanel_installment_due_7_pattern_code', label: commonTemplateLabels.installmentDue7, group: 'installments' },
      { key: 'ippanel_installment_due_3_pattern_code', label: commonTemplateLabels.installmentDue3, group: 'installments' },
      { key: 'ippanel_installment_due_today_pattern_code', label: commonTemplateLabels.installmentDueToday, group: 'installments' },
      { key: 'ippanel_check_due_7_pattern_code', label: commonTemplateLabels.checkDue7, group: 'checks' },
      { key: 'ippanel_check_due_3_pattern_code', label: commonTemplateLabels.checkDue3, group: 'checks' },
      { key: 'ippanel_check_due_today_pattern_code', label: commonTemplateLabels.checkDueToday, group: 'checks' },
      { key: 'ippanel_installment_pattern_code', label: commonTemplateLabels.installmentReminder, group: 'installments' },
      { key: 'ippanel_installment_completed_pattern_code', label: commonTemplateLabels.installmentCompleted, group: 'installments' },
      { key: 'ippanel_repair_received_pattern_code', label: commonTemplateLabels.repairReceived, group: 'repairs' },
      { key: 'ippanel_repair_cost_estimated_pattern_code', label: commonTemplateLabels.repairCostEstimated, group: 'repairs' },
      { key: 'ippanel_repair_ready_pattern_code', label: commonTemplateLabels.repairReady, group: 'repairs' },
    ],
    supportsLivePatternTest: false,
  },
});
