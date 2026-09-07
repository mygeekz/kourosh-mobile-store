export const MESSAGE_BRAND_NAME = 'فروشگاه کوروش' as const;

export type TelegramMessageAudience = 'customer' | 'partner' | 'manager';
export type TelegramTemplatePolicy = 'formal' | 'friendly' | 'short';
export type MessageTemplateVars = Record<string, unknown>;

export type SmsPatternTemplateDefinition = {
  key: string;
  label: string;
  category: 'اقساط' | 'تعمیرات' | 'حساب' | 'چک‌ها' | 'فاکتورها';
  accent: 'emerald' | 'blue' | 'amber' | 'gray';
  iconClass: string;
  tokenKeys: string[];
  tokens: string[];
  previewTemplate: string;
};

export type TelegramTemplateDefinition = {
  key: string;
  label: string;
  category: 'اقساط' | 'تعمیرات' | 'حساب' | 'چک‌ها' | 'فاکتورها';
  iconClass: string;
  preview: string;
};

const telegramCard = (
  title: string,
  icon: string,
  lines: string[],
  footer: string,
  audience: TelegramMessageAudience,
  policy: TelegramTemplatePolicy,
) => {
  const headline = policy === 'short' ? `<b>${title}</b>` : `<b>${icon} ${title}</b>`;
  const intro = policy === 'friendly' && audience === 'customer' ? ['سلام 🌿'] : [];
  const divider = policy === 'short' ? [] : ['────────────'];
  const tail = policy === 'short' ? [] : ['', footer];
  return [...intro, headline, ...divider, ...lines, ...tail].filter(Boolean).join('\n');
};

export const MELI_PAYAMAK_PATTERN_DEFINITIONS: SmsPatternTemplateDefinition[] = [
  {
    key: 'meli_payamak_installment_settlement_pattern_id',
    label: 'تسویه اقساط',
    category: 'اقساط',
    accent: 'emerald',
    iconClass: 'fa-solid fa-circle-check',
    tokenKeys: ['name'],
    tokens: ['نام مشتری'],
    previewTemplate: `مشتری گرامی {1}، همه اقساط خرید شما تسویه شد. از اعتماد شما به ${MESSAGE_BRAND_NAME} سپاسگزاریم.`,
  },
  {
    key: 'meli_payamak_installment_overdue_pattern_id',
    label: 'اطلاع‌رسانی دیرکرد اقساط',
    category: 'اقساط',
    accent: 'emerald',
    iconClass: 'fa-solid fa-triangle-exclamation',
    tokenKeys: ['name', 'amount', 'dueDate'],
    tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
    previewTemplate: `مشتری گرامی {1}، پرداخت این قسط به مبلغ {2} تومان با سررسید {3} هنوز در سیستم ثبت نشده است. لطفاً برای پیگیری با فروشگاه هماهنگ کنید. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_installment_sale_created_pattern_id',
    label: 'ثبت فروش اقساطی',
    category: 'اقساط',
    accent: 'emerald',
    iconClass: 'fa-solid fa-file-invoice-dollar',
    tokenKeys: ['name', 'saleId', 'total'],
    tokens: ['نام مشتری', 'شماره قرارداد', 'مبلغ کل'],
    previewTemplate: `مشتری گرامی {1}، فروش اقساطی شما ثبت شد. شماره قرارداد: {2}. مبلغ کل: {3} تومان. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_installment_due_notice_pattern_id',
    label: 'سررسید قسط',
    category: 'اقساط',
    accent: 'emerald',
    iconClass: 'fa-solid fa-calendar-day',
    tokenKeys: ['name', 'dueDate', 'amount'],
    tokens: ['نام مشتری', 'تاریخ سررسید', 'مبلغ'],
    previewTemplate: `مشتری گرامی {1}، سررسید قسط شما {2} است. مبلغ قابل پرداخت: {3} تومان. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_payment_confirmation_pattern_id',
    label: 'تأیید دریافت قسط',
    category: 'اقساط',
    accent: 'emerald',
    iconClass: 'fa-solid fa-hand-holding-dollar',
    tokenKeys: ['name', 'amount'],
    tokens: ['نام مشتری', 'مبلغ'],
    previewTemplate: `مشتری گرامی {1}، پرداخت قسط شما به مبلغ {2} تومان ثبت شد. از پرداخت به‌موقع شما سپاسگزاریم. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_repair_received_pattern_id',
    label: 'تأیید پذیرش دستگاه تعمیری',
    category: 'تعمیرات',
    accent: 'blue',
    iconClass: 'fa-solid fa-inbox',
    tokenKeys: ['name', 'deviceModel', 'repairId'],
    tokens: ['نام مشتری', 'مدل دستگاه', 'کد رهگیری'],
    previewTemplate: `مشتری گرامی {1}، دستگاه {2} شما برای تعمیر پذیرش شد. کد رهگیری: {3}. برای پیگیری وضعیت تعمیر با فروشگاه تماس بگیرید. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_repair_cost_notice_pattern_id',
    label: 'اعلام هزینه تعمیر',
    category: 'تعمیرات',
    accent: 'blue',
    iconClass: 'fa-solid fa-sack-dollar',
    tokenKeys: ['name', 'deviceModel', 'estimatedCost'],
    tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ'],
    previewTemplate: `مشتری گرامی {1}، هزینه تعمیر دستگاه {2} مبلغ {3} تومان برآورد شده است. برای تأیید ادامه تعمیر با فروشگاه تماس بگیرید. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_repair_ready_pattern_id',
    label: 'دستگاه تعمیری آماده تحویل',
    category: 'تعمیرات',
    accent: 'blue',
    iconClass: 'fa-solid fa-box-open',
    tokenKeys: ['name', 'deviceModel', 'finalCost'],
    tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ قابل پرداخت'],
    previewTemplate: `مشتری گرامی {1}، تعمیر دستگاه {2} به پایان رسیده و آماده تحویل است. مبلغ قابل پرداخت: {3} تومان. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_repair_delivered_pattern_id',
    label: 'تحویل دستگاه تعمیری',
    category: 'تعمیرات',
    accent: 'blue',
    iconClass: 'fa-solid fa-mobile-screen-button',
    tokenKeys: ['name', 'deviceModel', 'repairId'],
    tokens: ['نام مشتری', 'مدل دستگاه', 'شماره رسید'],
    previewTemplate: `مشتری گرامی {1}، دستگاه {2} تحویل شما شد. شماره رسید: {3}. از همراهی شما سپاسگزاریم. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_repair_status_pattern_id',
    label: 'وضعیت تعمیرات',
    category: 'تعمیرات',
    accent: 'blue',
    iconClass: 'fa-solid fa-screwdriver-wrench',
    tokenKeys: ['deviceModel', 'status'],
    tokens: ['مدل دستگاه', 'وضعیت'],
    previewTemplate: `وضعیت تعمیر دستگاه {1}: {2}. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_account_balance_pattern_id',
    label: 'بدهی/طلب',
    category: 'حساب',
    accent: 'gray',
    iconClass: 'fa-solid fa-scale-balanced',
    tokenKeys: ['status', 'amount'],
    tokens: ['وضعیت', 'مبلغ'],
    previewTemplate: `وضعیت حساب شما: {1}. مبلغ: {2} تومان. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_check_failed_pattern_id',
    label: 'چک برگشتی',
    category: 'چک‌ها',
    accent: 'amber',
    iconClass: 'fa-solid fa-file-circle-xmark',
    tokenKeys: ['name', 'dueDate', 'amount'],
    tokens: ['نام مشتری', 'تاریخ سررسید', 'مبلغ'],
    previewTemplate: `مشتری گرامی {1}، چک شما با سررسید {2} به‌عنوان چک برگشتی ثبت شده است. مبلغ چک: {3} تومان. لطفاً برای پیگیری با فروشگاه هماهنگ کنید. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_invoice_created_pattern_id',
    label: 'ثبت فاکتور',
    category: 'فاکتورها',
    accent: 'gray',
    iconClass: 'fa-solid fa-file-invoice',
    tokenKeys: ['name', 'invoiceNo', 'total'],
    tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ قابل پرداخت'],
    previewTemplate: `مشتری گرامی {1}، فاکتور شما ثبت شد. شماره فاکتور: {2}. مبلغ قابل پرداخت: {3} تومان. ${MESSAGE_BRAND_NAME}`,
  },
  {
    key: 'meli_payamak_invoice_payment_received_pattern_id',
    label: 'پرداخت فاکتور',
    category: 'فاکتورها',
    accent: 'gray',
    iconClass: 'fa-solid fa-receipt',
    tokenKeys: ['name', 'invoiceNo', 'amount'],
    tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ'],
    previewTemplate: `مشتری گرامی {1}، پرداخت فاکتور شماره {2} به مبلغ {3} تومان ثبت شد. ${MESSAGE_BRAND_NAME}`,
  },
];

const smsPatternByKey = new Map(MELI_PAYAMAK_PATTERN_DEFINITIONS.map((item) => [item.key, item]));

export const buildMeliPayamakPatternTokens = (patternKey: string, vars: MessageTemplateVars): string[] => {
  const definition = smsPatternByKey.get(String(patternKey || '').trim());
  if (!definition) return [];
  return definition.tokenKeys.map((key) => String(vars?.[key] ?? '').trim());
};

export const TELEGRAM_TEMPLATE_DEFINITIONS: TelegramTemplateDefinition[] = [
  { key: 'telegram_installment_settlement_message', label: 'تسویه اقساط', category: 'اقساط', iconClass: 'fa-solid fa-circle-check', preview: '✅ تسویه کامل اقساط\nمشتری: {name}\nشماره قرارداد: {saleId}\nجمع کل: {total} تومان' },
  { key: 'telegram_installment_overdue_message', label: 'اطلاع‌رسانی دیرکرد اقساط', category: 'اقساط', iconClass: 'fa-solid fa-triangle-exclamation', preview: '⚠️ یادآوری پرداخت معوق\nمشتری: {name}\nمبلغ قسط: {amount} تومان\nسررسید: {dueDate}' },
  { key: 'telegram_installment_sale_created_message', label: 'ثبت فروش اقساطی', category: 'اقساط', iconClass: 'fa-solid fa-file-invoice-dollar', preview: '🧾 ثبت فروش اقساطی\nمشتری: {name}\nشماره قرارداد: {saleId}\nمبلغ کل: {total} تومان' },
  { key: 'telegram_installment_due_notice_message', label: 'سررسید قسط', category: 'اقساط', iconClass: 'fa-solid fa-calendar-day', preview: '⏳ سررسید قسط\nمشتری: {name}\nمبلغ: {amount} تومان\nسررسید: {dueDate}' },
  { key: 'telegram_installment_payment_received_message', label: 'تأیید دریافت قسط', category: 'اقساط', iconClass: 'fa-solid fa-hand-holding-dollar', preview: '✅ تأیید دریافت قسط\nمشتری: {name}\nمبلغ پرداختی: {amount} تومان' },
  { key: 'telegram_repair_received_message', label: 'تأیید پذیرش دستگاه تعمیری', category: 'تعمیرات', iconClass: 'fa-solid fa-inbox', preview: '📥 پذیرش تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}' },
  { key: 'telegram_repair_cost_notice_message', label: 'اعلام هزینه تعمیر', category: 'تعمیرات', iconClass: 'fa-solid fa-sack-dollar', preview: '🧮 اعلام هزینه تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه برآوردی: {estimatedCost} تومان' },
  { key: 'telegram_repair_ready_message', label: 'دستگاه تعمیری آماده تحویل', category: 'تعمیرات', iconClass: 'fa-solid fa-box-open', preview: '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه نهایی: {finalCost} تومان' },
  { key: 'telegram_repair_delivered_message', label: 'تحویل دستگاه تعمیری', category: 'تعمیرات', iconClass: 'fa-solid fa-mobile-screen-button', preview: '📦 تحویل تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}' },
  { key: 'telegram_repair_status_message', label: 'وضعیت تعمیرات', category: 'تعمیرات', iconClass: 'fa-solid fa-screwdriver-wrench', preview: '🛠 وضعیت تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nوضعیت: {status}' },
  { key: 'telegram_account_balance_message', label: 'بدهی/طلب', category: 'حساب', iconClass: 'fa-solid fa-scale-balanced', preview: '📌 وضعیت حساب\nمشتری: {name}\nوضعیت: {status}\nمبلغ: {amount} تومان' },
  { key: 'telegram_check_failed_message', label: 'چک برگشتی', category: 'چک‌ها', iconClass: 'fa-solid fa-file-circle-xmark', preview: '🧾 چک برگشتی\nمشتری: {name}\nسررسید: {dueDate}\nمبلغ: {amount} تومان' },
  { key: 'telegram_invoice_created_message', label: 'ثبت فاکتور', category: 'فاکتورها', iconClass: 'fa-solid fa-file-invoice', preview: '🧾 ثبت فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {total} تومان' },
  { key: 'telegram_invoice_payment_received_message', label: 'پرداخت فاکتور', category: 'فاکتورها', iconClass: 'fa-solid fa-receipt', preview: '💳 پرداخت فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {amount} تومان' },
];

export const buildTelegramTemplatePreset = (
  key: string,
  audience: TelegramMessageAudience,
  policy: TelegramTemplatePolicy = 'formal',
): string => {
  const card = (title: string, icon: string, lines: string[], footer: string) => telegramCard(title, icon, lines, footer, audience, policy);
  const presets: Record<string, Record<TelegramMessageAudience, string>> = {
    telegram_installment_settlement_message: {
      customer: card('تسویه کامل اقساط', '✅', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>جمع کل پرونده:</b> {total} تومان'], `🙏 از اعتماد شما به ${MESSAGE_BRAND_NAME} سپاسگزاریم.`),
      partner: card('تسویه پرونده اقساط', '✅', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>جمع کل پرونده:</b> {total} تومان'], 'ℹ️ پرونده به‌طور کامل تسویه شد.'),
      manager: card('گزارش مدیریتی تسویه', '📊', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>جمع کل پرونده:</b> {total} تومان'], '📌 وضعیت: تسویه کامل'),
    },
    telegram_installment_overdue_message: {
      customer: card('یادآوری پرداخت معوق', '⚠️', ['👤 <b>{name}</b>', '💰 <b>مبلغ قسط:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], 'پرداخت این قسط هنوز در سیستم ثبت نشده است. لطفاً برای پیگیری با فروشگاه هماهنگ کنید.'),
      partner: card('پیگیری قسط معوق', '⚠️', ['👤 <b>{name}</b>', '💰 <b>مبلغ قسط:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '🔔 این پرونده نیاز به پیگیری دارد.'),
      manager: card('هشدار مدیریتی اقساط', '🚨', ['👤 <b>{name}</b>', '💰 <b>مبلغ قسط:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '📌 وضعیت: پرداخت ثبت نشده'),
    },
    telegram_installment_sale_created_message: {
      customer: card('ثبت فروش اقساطی', '🧾', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>مبلغ کل:</b> {total} تومان'], 'فروش اقساطی شما با موفقیت ثبت شد.'),
      partner: card('فروش اقساطی جدید', '🧾', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>مبلغ کل:</b> {total} تومان'], 'ℹ️ پرونده در سیستم ثبت شد.'),
      manager: card('گزارش ثبت فروش', '📈', ['👤 <b>{name}</b>', '🧾 <b>شماره قرارداد:</b> {saleId}', '💰 <b>مبلغ کل:</b> {total} تومان'], '📌 فروش جدید ثبت شد.'),
    },
    telegram_installment_due_notice_message: {
      customer: card('سررسید قسط', '⏳', ['👤 <b>{name}</b>', '💰 <b>مبلغ:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], 'لطفاً پرداخت را تا تاریخ سررسید انجام دهید.'),
      partner: card('سررسید پیش‌رو', '⏳', ['👤 <b>{name}</b>', '💰 <b>مبلغ:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '🔔 برای پیگیری آماده باشید.'),
      manager: card('گزارش سررسید اقساط', '📅', ['👤 <b>{name}</b>', '💰 <b>مبلغ:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '📌 سررسید جهت پیگیری ثبت شده است.'),
    },
    telegram_installment_payment_received_message: {
      customer: card('تأیید پرداخت قسط', '✅', ['👤 <b>{name}</b>', '💰 <b>مبلغ پرداختی:</b> {amount} تومان'], 'از پرداخت به‌موقع شما سپاسگزاریم.'),
      partner: card('ثبت پرداخت قسط', '💳', ['👤 <b>{name}</b>', '💰 <b>مبلغ پرداختی:</b> {amount} تومان'], 'ℹ️ پرداخت در پرونده ثبت شد.'),
      manager: card('گزارش دریافت قسط', '💳', ['👤 <b>{name}</b>', '💰 <b>مبلغ پرداختی:</b> {amount} تومان'], '📌 پرداخت ثبت شد.'),
    },
    telegram_repair_received_message: {
      customer: card('پذیرش تعمیر', '📥', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], 'دستگاه شما برای تعمیر پذیرش شد.'),
      partner: card('ثبت پذیرش تعمیر', '📥', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], 'ℹ️ پرونده تعمیر در سیستم ثبت شد.'),
      manager: card('گزارش پذیرش تعمیر', '🛠', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], '📌 پذیرش تعمیر ثبت شد.'),
    },
    telegram_repair_cost_notice_message: {
      customer: card('اعلام هزینه تعمیر', '🧮', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان'], 'برای تأیید ادامه تعمیر با فروشگاه تماس بگیرید.'),
      partner: card('هزینه برآوردی تعمیر', '🧮', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان'], '🔔 در انتظار تأیید مشتری.'),
      manager: card('گزارش هزینه تعمیر', '🧮', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان'], '📌 وضعیت: در انتظار تأیید'),
    },
    telegram_repair_ready_message: {
      customer: card('آماده تحویل', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>مبلغ قابل پرداخت:</b> {finalCost} تومان'], 'دستگاه شما آماده تحویل است. لطفاً برای دریافت هماهنگ کنید.'),
      partner: card('آماده تحویل تعمیر', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>مبلغ قابل پرداخت:</b> {finalCost} تومان'], 'ℹ️ دستگاه آماده تحویل است.'),
      manager: card('گزارش آماده تحویل', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '💰 <b>مبلغ قابل پرداخت:</b> {finalCost} تومان'], '📌 وضعیت: آماده تحویل'),
    },
    telegram_repair_delivered_message: {
      customer: card('تحویل دستگاه', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], 'دستگاه تحویل شما شد. از همراهی شما سپاسگزاریم.'),
      partner: card('تحویل تعمیر', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], 'ℹ️ تحویل ثبت شد.'),
      manager: card('گزارش تحویل تعمیر', '📦', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', '🧾 <b>کد تعمیر:</b> {repairId}'], '📌 تحویل تعمیر ثبت شد.'),
    },
    telegram_repair_status_message: {
      customer: card('به‌روزرسانی وضعیت تعمیر', '🛠', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', 'ℹ️ <b>وضعیت:</b> {status}'], 'وضعیت تعمیر دستگاه شما به‌روز شد.'),
      partner: card('وضعیت تعمیر به‌روز شد', '🛠', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', 'ℹ️ <b>وضعیت:</b> {status}'], '📌 پرونده را بررسی و ادامه دهید.'),
      manager: card('گزارش وضعیت تعمیر', '🛠', ['👤 <b>{name}</b>', '📱 <b>دستگاه:</b> {deviceModel}', 'ℹ️ <b>وضعیت:</b> {status}'], '📌 تغییر وضعیت ثبت شد.'),
    },
    telegram_account_balance_message: {
      customer: card('وضعیت حساب', '📌', ['👤 <b>{name}</b>', '💳 <b>وضعیت:</b> {status}', '💰 <b>مبلغ:</b> {amount} تومان'], 'برای مشاهده جزئیات حساب از منوی تلگرام استفاده کنید.'),
      partner: card('وضعیت حساب مشتری', '📌', ['👤 <b>{name}</b>', '💳 <b>وضعیت:</b> {status}', '💰 <b>مبلغ:</b> {amount} تومان'], 'ℹ️ برای پیگیری مالی.'),
      manager: card('گزارش وضعیت حساب', '📊', ['👤 <b>{name}</b>', '💳 <b>وضعیت:</b> {status}', '💰 <b>مبلغ:</b> {amount} تومان'], '📌 گزارش وضعیت حساب مشتری'),
    },
    telegram_check_failed_message: {
      customer: card('چک برگشتی', '⚠️', ['👤 <b>{name}</b>', '💰 <b>مبلغ چک:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], 'این چک به‌عنوان چک برگشتی ثبت شده است. لطفاً برای پیگیری با فروشگاه هماهنگ کنید.'),
      partner: card('هشدار چک برگشتی', '⚠️', ['👤 <b>{name}</b>', '💰 <b>مبلغ چک:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '🔔 این مورد نیاز به پیگیری مالی دارد.'),
      manager: card('گزارش چک برگشتی', '⚠️', ['👤 <b>{name}</b>', '💰 <b>مبلغ چک:</b> {amount} تومان', '📅 <b>سررسید:</b> {dueDate}'], '📌 وضعیت: برگشتی'),
    },
    telegram_invoice_created_message: {
      customer: card('ثبت فاکتور', '🧾', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ قابل پرداخت:</b> {total} تومان'], 'فاکتور شما ثبت شد.'),
      partner: card('فاکتور جدید', '🧾', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ:</b> {total} تومان'], 'ℹ️ فاکتور در سیستم ثبت شد.'),
      manager: card('گزارش ثبت فاکتور', '🧾', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ:</b> {total} تومان'], '📌 فاکتور ثبت شد.'),
    },
    telegram_invoice_payment_received_message: {
      customer: card('تأیید پرداخت فاکتور', '💳', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ پرداختی:</b> {amount} تومان'], 'پرداخت فاکتور شما ثبت شد. از شما سپاسگزاریم.'),
      partner: card('پرداخت فاکتور', '💳', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ پرداختی:</b> {amount} تومان'], 'ℹ️ پرداخت در سیستم ثبت شد.'),
      manager: card('گزارش دریافت وجه فاکتور', '💳', ['👤 <b>{name}</b>', '🔢 <b>شماره فاکتور:</b> {invoiceNo}', '💰 <b>مبلغ دریافتی:</b> {amount} تومان'], '📌 دریافت وجه فاکتور ثبت شد.'),
    },
  };
  return presets[key]?.[audience] || '';
};


export const buildTelegramRuntimeDefault = (eventType: string): string => {
  const card = (title: string, icon: string, lines: string[], footer: string) =>
    telegramCard(title, icon, lines, footer, 'customer', 'formal');
  switch (String(eventType || '').trim()) {
    case 'INSTALLMENT_REMINDER':
      return card('یادآوری قسط', '🔔', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'لطفاً پرداخت را تا تاریخ سررسید انجام دهید.');
    case 'INSTALLMENT_DUE_7':
      return card('۷ روز مانده تا سررسید قسط', '⏳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'این پیام جهت یادآوری سررسید ارسال شده است.');
    case 'INSTALLMENT_DUE_3':
      return card('۳ روز مانده تا سررسید قسط', '⏳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'این پیام جهت یادآوری سررسید ارسال شده است.');
    case 'INSTALLMENT_DUE_TODAY':
      return card('سررسید قسط امروز', '⏰', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'امروز تاریخ سررسید این قسط است.');
    case 'INSTALLMENT_OVERDUE':
    case 'INSTALLMENT_OVERDUE_NOTICE':
      return buildTelegramTemplatePreset('telegram_installment_overdue_message', 'customer', 'formal');
    case 'INSTALLMENT_COMPLETED':
    case 'INSTALLMENT_SETTLED':
      return buildTelegramTemplatePreset('telegram_installment_settlement_message', 'customer', 'formal');
    case 'INSTALLMENT_PAYMENT_RECEIVED':
      return buildTelegramTemplatePreset('telegram_installment_payment_received_message', 'customer', 'formal');
    case 'CHECK_DUE_7':
      return card('۷ روز مانده تا سررسید چک', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره چک:</b> {checkNumber}',
        '📅 <b>سررسید:</b> {dueDate}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'لطفاً برای تأمین موجودی و پیگیری چک برنامه‌ریزی کنید.');
    case 'CHECK_DUE_3':
      return card('۳ روز مانده تا سررسید چک', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره چک:</b> {checkNumber}',
        '📅 <b>سررسید:</b> {dueDate}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'لطفاً برای تأمین موجودی و پیگیری چک برنامه‌ریزی کنید.');
    case 'CHECK_DUE_TODAY':
      return card('سررسید چک امروز', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره چک:</b> {checkNumber}',
        '📅 <b>سررسید:</b> {dueDate}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'امروز تاریخ سررسید این چک است.');
    case 'REPAIR_RECEIVED':
    case 'REPAIR_RECEIVED_CONFIRMATION':
      return buildTelegramTemplatePreset('telegram_repair_received_message', 'customer', 'formal');
    case 'REPAIR_COST_ESTIMATED':
      return buildTelegramTemplatePreset('telegram_repair_cost_notice_message', 'customer', 'formal');
    case 'REPAIR_READY_FOR_PICKUP':
      return buildTelegramTemplatePreset('telegram_repair_ready_message', 'customer', 'formal');
    case 'REPAIR_DELIVERED':
      return buildTelegramTemplatePreset('telegram_repair_delivered_message', 'customer', 'formal');
    case 'REPAIR_STATUS_UPDATED':
      return buildTelegramTemplatePreset('telegram_repair_status_message', 'customer', 'formal');
    case 'CHECK_FAILED':
      return buildTelegramTemplatePreset('telegram_check_failed_message', 'customer', 'formal');
    case 'ACCOUNT_BALANCE_STATUS':
      return buildTelegramTemplatePreset('telegram_account_balance_message', 'customer', 'formal');
    case 'INVOICE_CREATED':
      return buildTelegramTemplatePreset('telegram_invoice_created_message', 'customer', 'formal');
    case 'INVOICE_PAYMENT_RECEIVED':
      return buildTelegramTemplatePreset('telegram_invoice_payment_received_message', 'customer', 'formal');
    default:
      return '';
  }
};

export const resolveTelegramTemplateSetting = (
  settings: MessageTemplateVars,
  key: string,
  legacyKeys: string[] = [],
): string => {
  for (const candidate of [key, ...legacyKeys]) {
    const value = String(settings?.[candidate] ?? '').trim();
    if (value) return value;
  }
  return '';
};

export const APP_MESSAGES = {
  success: {
    saved: 'با موفقیت ذخیره شد.',
    created: 'با موفقیت ثبت شد.',
    updated: 'با موفقیت ویرایش شد.',
    deleted: 'با موفقیت حذف شد.',
    operationDone: 'عملیات با موفقیت انجام شد.',
  },
  error: {
    operationFailed: 'عملیات ناموفق بود.',
    serverConnection: 'ارتباط با سرور ناموفق بود.',
  },
  notification: {
    successTitle: 'با موفقیت انجام شد',
    successKicker: 'عملیات موفق',
    successActionHint: 'نسخه تازه اطلاعات همین حالا در سیستم ذخیره شد.',
    errorTitle: 'در انجام عملیات مشکلی ایجاد شد',
    errorKicker: 'نیاز به بررسی',
    errorActionHint: 'ورودی‌ها را بررسی کنید و دوباره تلاش کنید.',
    warningTitle: 'هشدار سیستم',
    warningKicker: 'هشدار',
    warningActionHint: 'قبل از ادامه، جزئیات این بخش را با دقت مرور کنید.',
    infoTitle: 'اطلاع‌رسانی سیستم',
    infoKicker: 'اطلاع‌رسانی',
    infoActionHint: 'برای ادامه می‌توانید از اکشن‌های همین بخش استفاده کنید.',
    serverProcessingFailedTitle: 'سرور هنگام پردازش درخواست با خطا روبه‌رو شد.',
    serverProcessingFailedDetail: 'درخواست شما به سرور رسید اما پردازش آن کامل نشد.',
    accessDeniedTitle: 'شما به این عملیات دسترسی ندارید یا نشست شما منقضی شده است.',
    accessDeniedDetail: 'برای ادامه لازم است دوباره وارد حساب شوید یا سطح دسترسی کاربر را بررسی کنید.',
    accessDeniedNextStep: 'یک‌بار خروج و ورود مجدد را امتحان کنید.',
    connectionFailedTitle: 'ارتباط با سرور برقرار نشد.',
    connectionFailedDetail: 'اتصال شبکه، آدرس سرور یا تنظیمات HTTPS را بررسی کنید.',
    connectionFailedNextStep: 'پس از اطمینان از اتصال، عملیات را دوباره انجام دهید.',
    validationTitle: 'بخشی از اطلاعات واردشده نیاز به اصلاح دارد.',
    validationNextStep: 'فیلدهای علامت‌گذاری‌شده را اصلاح کنید و دوباره ثبت را بزنید.',
    duplicateTitle: 'این مورد قبلاً در سیستم ثبت شده است.',
    duplicateDetail: 'اطلاعات تکراری را بررسی کنید یا رکورد قبلی را ویرایش کنید.',
    duplicateNextStep: 'اگر این مورد باید جدید باشد، یکی از مقادیر کلیدی را تغییر دهید.',
  },
  button: {
    permissionDenied: 'شما اجازه انجام این عملیات را ندارید',
    completed: 'تکمیل شد',
    successHint: 'عملیات با موفقیت ثبت شد.',
  },
  toast: {
    loading: 'در حال انجام عملیات…',
  },
  labels: {
    costBasis: 'مبنای بها',
    costBasisCurrentPurchasePrice: 'قیمت خرید روز',
    costBasisSaleItemBuyPrice: 'قیمت خرید سند',
    costBasisOriginalPurchasePrice: 'قیمت خرید اصلی',
    costBasisProductPurchasePrice: 'قیمت خرید کالا',
  },
} as const;

const BROKEN_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/ثبت اطلاعات شما با تغییرات با موفقیت ثبت شدیت انجام شد/g, buildTelegramTemplatePreset('telegram_installment_sale_created_message', 'customer', 'formal')],
  [/با عملیات با موفقیت انجام شدیت تسویه گردید/g, 'با موفقیت تسویه شد'],
  [/عملیات ناتغییرات با موفقیت ثبت شد بود/g, APP_MESSAGES.success.operationDone],
  [/عملیات ناعملیات با موفقیت انجام شد بود(?: ثبت شد| شد)?/g, 'به‌عنوان چک برگشتی'],
  [/با موفقیت ثبت اطلاعات شد/g, APP_MESSAGES.success.created],
  [/ثبت اطلاعات شدیت/g, 'ثبت شد'],
  [/ویرایش اطلاعات شد/g, 'ویرایش شد'],
  [/ثبت اطلاعات شد/g, 'ثبت شد'],
];

export const cleanAppMessage = (value: unknown): string => {
  let text = String(value || '').trim();
  for (const [pattern, replacement] of BROKEN_TEXT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s{2,}/g, ' ').trim();
};

export const getCostBasisLabel = (source?: string | null): string => {
  const s = String(source || '').trim();
  if (s === 'current_purchase_price') return APP_MESSAGES.labels.costBasisCurrentPurchasePrice;
  if (s === 'sale_item_buy_price') return APP_MESSAGES.labels.costBasisSaleItemBuyPrice;
  if (s === 'original_purchase_price') return APP_MESSAGES.labels.costBasisOriginalPurchasePrice;
  if (s === 'product_purchase_price') return APP_MESSAGES.labels.costBasisProductPurchasePrice;
  return '';
};
