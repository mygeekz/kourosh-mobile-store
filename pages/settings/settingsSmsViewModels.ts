import type { SmsPatternDef } from '../../components/SmsBulkTestModal';
import { APP_MESSAGES } from '../../shared/messages';
import type { SmsBusinessInfo } from './index';

import { buildSmsProviderDefinitions, type SmsProviderDefinition } from './settingsSmsProviderDefinitions';
export type { SmsProviderDefinition, SmsProviderFieldDef, SmsProviderFieldGroup } from './settingsSmsProviderDefinitions';
	// تعریف مرکزی پترن‌های ملی پیامک برای رابط کاربری و بررسی و ادامه سلامت
export const meliPatternDefs: SmsPatternDef[] = [
		{
			key: 'meli_payamak_installment_settlement_pattern_id',
			label: 'تسویه اقساط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-circle-check',
			tokens: ['نام مشتری'],
			previewTemplate: 'مشتری گرامی {1}، باعث افتخار است به اطلاع برسانیم تمام اقساط خرید شما با موفقیت تسویه گردید. از اعتماد شما به فروشگاه کوروش سپاسگزاریم.',
		},
		{
			key: 'meli_payamak_installment_overdue_pattern_id',
			label: 'اطلاع‌رسانی دیرکرد اقساط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-triangle-exclamation',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت قسط شما به مبلغ {2} تومان با سررسید {3} هنوز در سیستم ما ثبت اطلاعات نشده است. لطفاً جهت پیگیری اقدام فرمایید. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_installment_sale_created_pattern_id',
			label: 'ثبت فروش اقساطی',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-file-invoice-dollar',
			tokens: ['نام مشتری', 'شماره قرارداد', 'مبلغ کل'],
			previewTemplate: APP_MESSAGES.telegram.installmentSaleCreatedPatternPreview,
		},
		{
			key: 'meli_payamak_installment_due_notice_pattern_id',
			label: 'سررسید قسط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-calendar-day',
			tokens: ['نام مشتری', 'تاریخ سررسید', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، قسط شما با سررسید {2} آماده پرداخت است. مبلغ: {3} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_payment_confirmation_pattern_id',
			label: 'تأیید دریافت قسط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-hand-holding-dollar',
			tokens: ['نام مشتری', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت قسط شما به مبلغ {2} تومان با موفقیت ثبت شد. از پرداخت به موقع شما سپاسگزاریم. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_repair_received_pattern_id',
			label: 'تأیید پذیرش گوشی تعمیری',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-inbox',
			tokens: ['نام مشتری', 'مدل دستگاه', 'کد رهگیری'],
			previewTemplate: 'مشتری گرامی {1}، دستگاه {2} شما جهت تعمیرات در فروشگاه کوروش پذیرش و با کد رهگیری {3} ثبت اطلاعات گردید. وضعیت دستگاه از طریق تماس با فروشگاه قابل پیگیری است. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_cost_notice_pattern_id',
			label: 'اعلام هزینه',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-sack-dollar',
			tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، هزینه تعمیرات دستگاه {2} شما مبلغ {3} تومان برآورد شده است. لطفاً جهت تأیید و ادامه فرآیند تعمیر با فروشگاه تماس حاصل فرمایید. فروشگاه کوروش. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_ready_pattern_id',
			label: 'گوشی تعمیری آماده تحویل',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-box-open',
			tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ قابل پرداخت'],
			previewTemplate: 'مشتری گرامی {1}، تعمیرات دستگاه {2} شما به اتمام رسید و آماده تحویل است. مبلغ قابل پرداخت: {3} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_delivered_pattern_id',
			label: 'تحویل گوشی تعمیری',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-mobile-screen-button',
			tokens: ['نام مشتری', 'مدل دستگاه', 'شماره رسید'],
			previewTemplate: 'مشتری گرامی {1}، دستگاه {2} با موفقیت تحویل شد. شماره رسید: {3}. سپاس از همراهی شما. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_status_pattern_id',
			label: 'وضعیت تعمیرات',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-screwdriver-wrench',
			tokens: ['مدل دستگاه', 'وضعیت'],
			previewTemplate: 'تعمیرات کوروش: دستگاه شما {1} در وضعیت {2} است. موبایل کوروش',
		},
		{
			key: 'meli_payamak_account_balance_pattern_id',
			label: 'بدهی/طلب',
			category: 'حساب',
			accent: 'gray',
			iconClass: 'fa-solid fa-scale-balanced',
			tokens: ['وضعیت', 'مبلغ'],
			previewTemplate: 'وضعیت حساب کوروش: {1} {2} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_check_failed_pattern_id',
			label: 'چک برگشتی',
			category: 'چک‌ها',
			accent: 'amber',
			iconClass: 'fa-solid fa-file-circle-xmark',
			tokens: ['نام مشتری', 'تاریخ', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، چک شما در تاریخ {2} برگشتی ثبت شده است. مبلغ: {3} تومان. لطفاً برای پیگیری اقدام کنید. موبایل کوروش',
		},
		{
			key: 'meli_payamak_invoice_created_pattern_id',
			label: 'ثبت اطلاعات فاکتور',
			category: 'فاکتورها',
			accent: 'gray',
			iconClass: 'fa-solid fa-file-invoice',
			tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ قابل پرداخت'],
			previewTemplate: 'مشتری گرامی {1}، فاکتور شما با موفقیت ثبت شد. شماره فاکتور: {2}. مبلغ قابل پرداخت: {3} تومان. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_invoice_payment_received_pattern_id',
			label: 'پرداخت فاکتور',
			category: 'فاکتورها',
			accent: 'gray',
			iconClass: 'fa-solid fa-receipt',
			tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت فاکتور {2} به مبلغ {3} تومان با موفقیت ثبت شد. فروشگاه کوروش',
		},
	];


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
