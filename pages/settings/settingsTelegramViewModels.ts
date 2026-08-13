import { APP_MESSAGES } from '../../shared/messages';
import type {
  TelegramAudience,
  TelegramAudienceStatus,
  TelegramBusinessInfo,
  TelegramCategoryStatus,
  TelegramGlobalSummary,
  TelegramGroupedTemplateDefs,
  TelegramItemStatus,
  TelegramPriorityMeta,
  TelegramProgressTone,
  TelegramTemplateDef,
  TelegramTodoEntry,
  TelegramTodoSummary,
} from './settingsPanelTypes';

export const TG_VARS_COMMON = [
  { key: 'name', label: 'نام مشتری', example: 'بهزاد' },
  { key: 'phone', label: 'موبایل مشتری', example: '09xxxxxxxxx' },
  { key: 'link', label: 'لینک اپ', example: 'https://example.com/#/installments' },
  { key: 'now', label: 'زمان فعلی', example: '1404/12/10 12:00' },
];
export const TG_VARS_INSTALLMENTS = [
  ...TG_VARS_COMMON,
  { key: 'amount', label: 'مبلغ قسط', example: '1,250,000' },
  { key: 'dueDate', label: 'تاریخ سررسید', example: '1404/12/15' },
  { key: 'days', label: 'تعداد روز', example: '3' },
  { key: 'saleId', label: 'شماره فروش', example: '1024' },
  { key: 'total', label: 'مبلغ کل', example: '12,500,000' },
];
export const TG_VARS_CHECKS = [
  ...TG_VARS_COMMON,
  { key: 'checkNumber', label: 'شماره چک', example: 'A-55822' },
  { key: 'dueDate', label: 'تاریخ سررسید', example: '1404/12/15' },
  { key: 'amount', label: 'مبلغ', example: '3,000,000' },
  { key: 'days', label: 'تعداد روز', example: '7' },
];
export const TG_VARS_REPAIRS = [
  ...TG_VARS_COMMON,
  { key: 'deviceModel', label: 'مدل/نام دستگاه', example: 'iPhone 13 Pro' },
  { key: 'repairId', label: 'کد تعمیر', example: 'R-2025' },
  { key: 'status', label: 'وضعیت', example: 'آماده تحویل' },
  { key: 'estimatedCost', label: 'هزینه برآوردی', example: '850,000' },
  { key: 'finalCost', label: 'هزینه نهایی', example: '920,000' },
];
export const TG_VARS_ACCOUNT = [
  ...TG_VARS_COMMON,
  { key: 'status', label: 'وضعیت حساب', example: 'بدهکار' },
  { key: 'amount', label: 'مبلغ', example: '2,150,000' },
];

// تعریف مرکزی قالب‌های تلگرام برای پیش‌نمایش و بررسی و ادامه ارسال
export const tgAudienceMeta: Record<TelegramAudience, { label: string; icon: string; chip: string }> = {
  customer: { label: 'مشتری', icon: 'fa-user', chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200' },
  partner: { label: 'همکار', icon: 'fa-users-gear', chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200' },
  manager: { label: 'مدیر', icon: 'fa-user-tie', chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200' },
};

export const tgCategoryMeta: Record<string, { icon: string; tone: string; description: string; quickHint: string; heroChip: string; heroBar: string }> = {
  'اقساط': {
    icon: 'fa-receipt',
    tone: 'from-sky-500/10 via-cyan-500/10 to-transparent',
    description: 'قالب‌های فروش اقساطی، سررسید، دیرکرد، دریافت قسط و تسویه را از اینجا یکجا مدیریت کن.',
    quickHint: 'اول سررسید و دیرکرد را کامل کن تا پیگیری‌ها عقب نماند.',
    heroChip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
    heroBar: 'from-sky-500 via-cyan-500 to-teal-500',
  },
  'تعمیرات': {
    icon: 'fa-screwdriver-wrench',
    tone: 'from-violet-500/10 via-fuchsia-500/10 to-transparent',
    description: 'پذیرش، اعلام هزینه، آماده تحویل، تحویل نهایی و وضعیت تعمیرات را با پیام‌های هماهنگ نگه دار.',
    quickHint: 'اعلام هزینه و آماده تحویل بیشترین اثر را روی تجربه مشتری دارند.',
    heroChip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200',
    heroBar: 'from-violet-500 via-fuchsia-500 to-pink-500',
  },
  'حساب': {
    icon: 'fa-scale-balanced',
    tone: 'from-slate-500/10 via-zinc-500/10 to-transparent',
    description: 'پیام‌های بدهی و طلب مشتری را در این بخش برای مشتری، همکار و مدیر یکدست کن.',
    quickHint: 'این دسته کم‌رویداد است اما برای شفافیت مالی خیلی مهم است.',
    heroChip: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
    heroBar: 'from-slate-500 via-zinc-500 to-neutral-500',
  },
  'چک‌ها': {
    icon: 'fa-file-circle-xmark',
    tone: 'from-amber-500/10 via-orange-500/10 to-transparent',
    description: 'اعلان‌های چک برگشتی و موارد پیگیری مالی را متمرکز و سریع بررسی و ادامه کن.',
    quickHint: 'اگر ناقص ماند، حتماً اولویت بالا بده چون اثر مالی مستقیم دارد.',
    heroChip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
    heroBar: 'from-amber-500 via-orange-500 to-rose-500',
  },
  'فاکتورها': {
    icon: 'fa-file-invoice',
    tone: 'from-emerald-500/10 via-teal-500/10 to-transparent',
    description: 'ثبت اطلاعات فاکتور و پرداخت فاکتور را با پیام‌های استاندارد و قابل اتکا نگه دار.',
    quickHint: 'فاکتور و پرداخت آن را کنار هم کامل کن تا جریان مالی کامل شود.',
    heroChip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
    heroBar: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
};

export const getTelegramAllowedVars = (key: string) => {
  if (key.includes('repair')) return TG_VARS_REPAIRS;
  if (key.includes('account')) return TG_VARS_ACCOUNT;
  if (key.includes('check')) return TG_VARS_CHECKS;
  if (key.includes('invoice')) return [...TG_VARS_COMMON, { key: 'invoiceNo', label: 'شماره فاکتور', example: '1542' }, { key: key.includes('created') ? 'total' : 'amount', label: 'مبلغ', example: key.includes('created') ? '7,800,000' : '2,500,000' }];
  return TG_VARS_INSTALLMENTS;
};

export const getTelegramFormatKey = (key: string) => `${key}_format`;
export const getTelegramAudienceKey = (key: string, audience: TelegramAudience) => (audience === 'customer' ? key : `${key}_${audience}`);
export const getTelegramAudienceFormatKey = (key: string, audience: TelegramAudience) => (audience === 'customer' ? `${key}_format` : `${key}_${audience}_format`);


export const buildTelegramAudiencePresetValue = (telegramInfo: TelegramBusinessInfo, key: string, audience: TelegramAudience) => {
  const policy = String(telegramInfo.telegram_template_policy || 'formal').trim() as 'formal' | 'friendly' | 'short';
  const card = (title: string, icon: string, lines: string[], footer: string) => {
    const headline = policy === 'short' ? `<b>${title}</b>` : `<b>${icon} ${title}</b>`;
    const intro = policy === 'friendly' && audience === 'customer' ? ['سلام 🌿'] : [];
    const divider = policy === 'short' ? [] : ['────────────'];
    const tail = policy === 'short' ? [] : ['', footer];
    return [
      ...intro,
      headline,
      ...divider,
      ...lines,
      ...tail,
    ].filter(Boolean).join('\n');
  };

  const presets: Record<string, Record<TelegramAudience, string>> = {
    telegram_installment_settlement_message: {
      customer: card('تسویه کامل اقساط', '✅', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>جمع کل پرونده:</b> {total} تومان',
      ], '🙏 از اعتماد شما سپاسگزاریم.'),
      partner: card('تسویه پرونده اقساط', '✅', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>جمع کل پرونده:</b> {total} تومان',
      ], 'ℹ️ پرونده با موفقیت تسویه شده است.'),
      manager: card('گزارش مدیریتی تسویه', '📊', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>جمع کل پرونده:</b> {total} تومان',
      ], '📌 وضعیت: تسویه کامل'),
    },
    telegram_installment_overdue_message: {
      customer: card('یادآوری پرداخت معوق', '⚠️', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ قسط:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'لطفاً در اولین فرصت جهت پیگیری اقدام فرمایید.'),
      partner: card('پیگیری قسط معوق', '⚠️', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ قسط:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], '🔔 این پرونده نیاز به پیگیری دارد.'),
      manager: card('هشدار مدیریتی اقساط', '🚨', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ قسط:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], '📌 وضعیت: پرداخت نشده'),
    },
    telegram_installment_sale_created_message: {
      customer: card('ثبت فروش اقساطی', '🧾', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>مبلغ کل:</b> {total} تومان',
      ], APP_MESSAGES.success.created),
      partner: card('فروش اقساطی جدید', '🧾', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>مبلغ کل:</b> {total} تومان',
      ], 'ℹ️ پرونده در سیستم ثبت شد.'),
      manager: card('گزارش ثبت اطلاعات فروش', '📈', [
        '👤 <b>{name}</b>',
        '🧾 <b>شماره قرارداد:</b> {saleId}',
        '💰 <b>مبلغ کل:</b> {total} تومان',
      ], '📌 فروش جدید با موفقیت ثبت شد.'),
    },
    telegram_installment_due_notice_message: {
      customer: card('سررسید قسط', '⏳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], 'لطفاً پرداخت را در موعد مقرر انجام دهید.'),
      partner: card('سررسید پیش‌رو', '⏳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], '🔔 برای پیگیری آماده باشید.'),
      manager: card('گزارش سررسید اقساط', '📅', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>سررسید:</b> {dueDate}',
      ], '📌 این پیام جهت کنترل مدیریتی است.'),
    },
    telegram_installment_payment_received_message: {
      customer: card('تأیید پرداخت قسط', '✅', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
      ], 'از پرداخت به‌موقع شما سپاسگزاریم.'),
      partner: card('ثبت اطلاعات پرداخت قسط', '💳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
      ], 'ℹ️ وضعیت پرونده را به‌روزرسانی کنید.'),
      manager: card('گزارش دریافت قسط', '💳', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
      ], '📌 پرداخت با موفقیت ثبت شد.'),
    },
    telegram_repair_received_message: {
      customer: card('پذیرش تعمیر', '📥', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], 'وضعیت از بخش تعمیرات قابل پیگیری است.'),
      partner: card('ثبت اطلاعات پذیرش تعمیر', '📥', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], 'ℹ️ سفارش در صف تعمیرات قرار گرفت.'),
      manager: card('گزارش پذیرش تعمیر', '🛠', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], '📌 پذیرش با موفقیت ثبت شد.'),
    },
    telegram_repair_cost_notice_message: {
      customer: card('اعلام هزینه تعمیر', '🧮', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
      ], 'لطفاً برای تأیید ادامه فرآیند با فروشگاه تماس بگیرید.'),
      partner: card('هزینه برآوردی تعمیر', '🧮', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
      ], '🔔 منتظر تأیید مشتری بمانید.'),
      manager: card('گزارش هزینه تعمیر', '🧮', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
      ], '📌 وضعیت: در انتظار تأیید'),
    },
    telegram_repair_ready_message: {
      customer: card('آماده تحویل', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
      ], 'برای تحویل دستگاه هماهنگ کنید.'),
      partner: card('آماده تحویل تعمیر', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
      ], 'ℹ️ دستگاه آماده تحویل است.'),
      manager: card('گزارش آماده تحویل', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
      ], '📌 وضعیت: تکمیل شده'),
    },
    telegram_repair_delivered_message: {
      customer: card('تحویل دستگاه', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], 'از همراهی شما سپاسگزاریم.'),
      partner: card('تعمیر تحویل شد', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], 'ℹ️ پرونده بسته شد.'),
      manager: card('گزارش تحویل تعمیر', '📦', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        '🧾 <b>کد تعمیر:</b> {repairId}',
      ], '📌 تحویل با موفقیت انجام شد.'),
    },
    telegram_repair_status_message: {
      customer: card('به‌روزرسانی وضعیت تعمیر', '🛠', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        'ℹ️ <b>وضعیت:</b> {status}',
      ], 'وضعیت دستگاه شما به‌روز شد.'),
      partner: card('وضعیت تعمیر به‌روز شد', '🛠', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        'ℹ️ <b>وضعیت:</b> {status}',
      ], '📌 پرونده را بررسی و ادامه کنید.'),
      manager: card('گزارش وضعیت تعمیر', '🛠', [
        '👤 <b>{name}</b>',
        '📱 <b>دستگاه:</b> {deviceModel}',
        'ℹ️ <b>وضعیت:</b> {status}',
      ], '📌 تغییر وضعیت ثبت شد.'),
    },
    telegram_account_balance_message: {
      customer: card('وضعیت حساب', '📌', [
        '👤 <b>{name}</b>',
        '💳 <b>وضعیت:</b> {status}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'از منوی تلگرام می‌توانید جزئیات بیشتری ببینید.'),
      partner: card('وضعیت حساب مشتری', '📌', [
        '👤 <b>{name}</b>',
        '💳 <b>وضعیت:</b> {status}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'ℹ️ برای پیگیری مالی استفاده شود.'),
      manager: card('گزارش وضعیت حساب', '📊', [
        '👤 <b>{name}</b>',
        '💳 <b>وضعیت:</b> {status}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], '📌 گزارش مدیریتی حساب مشتری'),
    },
    telegram_check_failed_message: {
      customer: card('وضعیت چک برگشتی', '🧾', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>تاریخ:</b> {dueDate}',
      ], 'لطفاً برای پیگیری اقدام فرمایید.'),
      partner: card('هشدار چک برگشتی', '🧾', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>تاریخ:</b> {dueDate}',
      ], '🔔 پیگیری لازم انجام شود.'),
      manager: card('گزارش چک برگشتی', '🧾', [
        '👤 <b>{name}</b>',
        '💰 <b>مبلغ:</b> {amount} تومان',
        '📅 <b>تاریخ:</b> {dueDate}',
      ], '📌 وضعیت: ناموفق'),
    },
    telegram_invoice_created_message: {
      customer: card('ثبت اطلاعات فاکتور', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {total} تومان',
      ], 'فاکتور شما با موفقیت ثبت شد.'),
      partner: card('فاکتور جدید', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {total} تومان',
      ], 'ℹ️ فاکتور در سیستم ثبت شد.'),
      manager: card('گزارش ثبت اطلاعات فاکتور', '🧾', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {total} تومان',
      ], '📌 ثبت اطلاعات فاکتور با موفقیت انجام شد.'),
    },
    telegram_invoice_payment_received_message: {
      customer: card('تأیید پرداخت فاکتور', '💳', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'از پرداخت شما سپاسگزاریم.'),
      partner: card('پرداخت فاکتور', '💳', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], 'ℹ️ وضعیت مالی به‌روز شد.'),
      manager: card('گزارش دریافت فاکتور', '💳', [
        '👤 <b>{name}</b>',
        '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
        '💰 <b>مبلغ:</b> {amount} تومان',
      ], '📌 پرداخت با موفقیت ثبت شد.'),
    },
  };
  return presets[key]?.[audience] || '';
};

export const buildTelegramTemplateDefs = (): TelegramTemplateDef[] => ([
  {
    key: 'telegram_installment_settlement_message',
    label: 'تسویه اقساط',
    category: 'اقساط',
    iconClass: 'fa-solid fa-circle-check',
    preview: '✅ تسویه کامل اقساط\nمشتری: {name}\nشماره قرارداد: {saleId}\nجمع کل: {total} تومان',
  },
  {
    key: 'telegram_installment_overdue_message',
    label: 'اطلاع‌رسانی دیرکرد اقساط',
    category: 'اقساط',
    iconClass: 'fa-solid fa-triangle-exclamation',
    preview: '⚠️ یادآوری پرداخت معوق\nمشتری: {name}\nمبلغ قسط: {amount} تومان\nسررسید: {dueDate}',
  },
  {
    key: 'telegram_installment_sale_created_message',
    label: 'ثبت فروش اقساطی',
    category: 'اقساط',
    iconClass: 'fa-solid fa-file-invoice-dollar',
    preview: '🧾 ثبت فروش اقساطی\nمشتری: {name}\nشماره قرارداد: {saleId}\nمبلغ کل: {total} تومان',
  },
  {
    key: 'telegram_installment_due_notice_message',
    label: 'سررسید قسط',
    category: 'اقساط',
    iconClass: 'fa-solid fa-calendar-day',
    preview: '⏳ سررسید قسط\nمشتری: {name}\nمبلغ: {amount} تومان\nسررسید: {dueDate}',
  },
  {
    key: 'telegram_installment_payment_received_message',
    label: 'تأیید دریافت قسط',
    category: 'اقساط',
    iconClass: 'fa-solid fa-hand-holding-dollar',
    preview: '✅ تأیید دریافت قسط\nمشتری: {name}\nمبلغ پرداختی: {amount} تومان',
  },
  {
    key: 'telegram_repair_received_message',
    label: 'تأیید پذیرش گوشی تعمیری',
    category: 'تعمیرات',
    iconClass: 'fa-solid fa-inbox',
    preview: '📥 پذیرش تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}',
  },
  {
    key: 'telegram_repair_cost_notice_message',
    label: 'اعلام هزینه',
    category: 'تعمیرات',
    iconClass: 'fa-solid fa-sack-dollar',
    preview: '🧮 اعلام هزینه\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه برآوردی: {estimatedCost} تومان',
  },
  {
    key: 'telegram_repair_ready_message',
    label: 'گوشی تعمیری آماده تحویل',
    category: 'تعمیرات',
    iconClass: 'fa-solid fa-box-open',
    preview: '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه نهایی: {finalCost} تومان',
  },
  {
    key: 'telegram_repair_delivered_message',
    label: 'تحویل گوشی تعمیری',
    category: 'تعمیرات',
    iconClass: 'fa-solid fa-mobile-screen-button',
    preview: '📦 تحویل تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}',
  },
  {
    key: 'telegram_repair_status_message',
    label: 'وضعیت تعمیرات',
    category: 'تعمیرات',
    iconClass: 'fa-solid fa-screwdriver-wrench',
    preview: '🛠 وضعیت تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nوضعیت: {status}',
  },
  {
    key: 'telegram_account_balance_message',
    label: 'بدهی/طلب',
    category: 'حساب',
    iconClass: 'fa-solid fa-scale-balanced',
    preview: '📌 وضعیت حساب\nمشتری: {name}\nوضعیت: {status}\nمبلغ: {amount} تومان',
  },
  {
    key: 'telegram_check_failed_message',
    label: 'چک برگشتی',
    category: 'چک‌ها',
    iconClass: 'fa-solid fa-file-circle-xmark',
    preview: '🧾 چک برگشتی\nمشتری: {name}\nتاریخ: {dueDate}\nمبلغ: {amount} تومان',
  },
  {
    key: 'telegram_invoice_created_message',
    label: 'ثبت اطلاعات فاکتور',
    category: 'فاکتورها',
    iconClass: 'fa-solid fa-file-invoice',
    preview: '🧾 ثبت اطلاعات فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {total} تومان',
  },
  {
    key: 'telegram_invoice_payment_received_message',
    label: 'پرداخت فاکتور',
    category: 'فاکتورها',
    iconClass: 'fa-solid fa-receipt',
    preview: '💳 پرداخت فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {amount} تومان',
  },
].map((item) => ({
  ...item,
  formatKey: getTelegramFormatKey(item.key),
  allowedVars: getTelegramAllowedVars(item.key),
})));

export type BuildTelegramStudioViewModelArgs = {
  telegramInfo: TelegramBusinessInfo;
  telegramTemplateSearch: string;
  telegramTemplateFilter: 'all' | 'configured' | 'incomplete';
  telegramStudioMode: 'quick' | 'all' | 'incomplete' | 'todo';
  telegramTodoDoneMap: Record<string, boolean>;
  telegramTodoLaterMap: Record<string, string>;
  buildTelegramAudiencePreset: (key: string, audience: TelegramAudience) => string;
};

export type TelegramStudioViewModel = {
  telegramTemplateDefs: TelegramTemplateDef[];
  telegramGroupedDefs: TelegramGroupedTemplateDefs;
  telegramEffectiveFilter: 'all' | 'configured' | 'incomplete';
  filteredTelegramGroupedDefs: TelegramGroupedTemplateDefs;
  visibleTelegramItemsCount: number;
  telegramTodoItems: TelegramTodoEntry[];
  telegramTodoSummary: TelegramTodoSummary;
  telegramTodoTopItems: TelegramTodoEntry[];
  getTelegramAudienceStatus: (itemKey: string, audience: TelegramAudience) => TelegramAudienceStatus;
  getTelegramItemStatus: (itemKey: string) => TelegramItemStatus;
  getTelegramCategoryStatus: (items: TelegramTemplateDef[]) => TelegramCategoryStatus;
  getTelegramPriorityMeta: (itemKey: string) => TelegramPriorityMeta;
  getTelegramProgressTone: (ratio: number) => TelegramProgressTone;
  telegramسراسریSummary: TelegramGlobalSummary;
  telegramسراسریCompletionPercent: number;
  telegramReadinessScore: number;
  telegramCoachMessage: string;
};

export const buildTelegramStudioViewModel = ({
  telegramInfo,
  telegramTemplateSearch,
  telegramTemplateFilter,
  telegramStudioMode,
  telegramTodoDoneMap,
  telegramTodoLaterMap,
  buildTelegramAudiencePreset,
}: BuildTelegramStudioViewModelArgs): TelegramStudioViewModel => {
  const telegramTemplateDefs = buildTelegramTemplateDefs();
const telegramGroupedDefs = Object.entries(telegramTemplateDefs.reduce<Record<string, TelegramTemplateDef[]>>((acc, item) => {
  (acc[item.category] ||= []).push(item);
  return acc;
}, {}));

const telegramQuickSetupKeys = new Set([
  'telegram_installment_sale_created_message',
  'telegram_installment_due_notice_message',
  'telegram_installment_overdue_message',
  'telegram_repair_received_message',
  'telegram_repair_cost_notice_message',
  'telegram_repair_ready_message',
  'telegram_account_balance_message',
  'telegram_invoice_created_message',
]);

const telegramPriorityMap: Record<string, number> = {
  telegram_installment_due_notice_message: 1,
  telegram_installment_overdue_message: 1,
  telegram_account_balance_message: 1,
  telegram_repair_ready_message: 1,
  telegram_repair_cost_notice_message: 1,
  telegram_invoice_created_message: 2,
  telegram_installment_sale_created_message: 2,
  telegram_repair_received_message: 2,
  telegram_check_failed_message: 2,
  telegram_installment_payment_received_message: 3,
  telegram_installment_settlement_message: 3,
  telegram_invoice_payment_received_message: 3,
  telegram_repair_status_message: 3,
  telegram_repair_delivered_message: 3,
};

const getTelegramPriorityMeta = (itemKey: string) => {
  const level = telegramPriorityMap[itemKey] ?? 3;
  if (level === 1) {
    return {
      level,
      label: 'اولویت بالا',
      icon: 'fa-bolt',
      chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
    };
  }
  if (level === 2) {
    return {
      level,
      label: 'اولویت متوسط',
      icon: 'fa-layer-group',
      chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }
  return {
    level,
    label: 'اولویت معمولی',
    icon: 'fa-list-check',
    chip: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
  };
};

const resolveTelegramFilterMode = (): 'all' | 'configured' | 'incomplete' => {
  if (telegramStudioMode === 'incomplete' || telegramStudioMode === 'todo') return 'incomplete';
  return telegramTemplateFilter;
};

const telegramEffectiveFilter = resolveTelegramFilterMode();

const filteredTelegramGroupedDefs = telegramGroupedDefs
  .map(([category, items]) => {
    const nextItems = items
      .filter((item) => {
        const itemStatus = getTelegramItemStatus(item.key);
        const audienceConfigured = itemStatus.anyConfigured;
        const matchesMode =
          telegramStudioMode === 'quick'
            ? telegramQuickSetupKeys.has(item.key)
            : telegramStudioMode === 'todo'
              ? !itemStatus.allConfigured
              : true;
        const matchesFilter = telegramEffectiveFilter === 'all'
          ? true
          : telegramEffectiveFilter === 'configured'
            ? audienceConfigured
            : !itemStatus.allConfigured;
        const haystack = [category, item.label, item.preview, ...item.allowedVars.map((v) => v.key), ...item.allowedVars.map((v) => v.label || '')]
          .join(' ')
          .toLowerCase();
        const needle = telegramTemplateSearch.trim().toLowerCase();
        const matchesSearch = !needle || haystack.includes(needle);
        return matchesMode && matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const statusA = getTelegramItemStatus(a.key);
        const statusB = getTelegramItemStatus(b.key);
        const priorityA = getTelegramPriorityMeta(a.key).level;
        const priorityB = getTelegramPriorityMeta(b.key).level;

        if (telegramStudioMode === 'todo') {
          if (statusA.configuredCount !== statusB.configuredCount) return statusA.configuredCount - statusB.configuredCount;
          if (priorityA !== priorityB) return priorityA - priorityB;
        } else if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return a.label.localeCompare(b.label, 'fa');
      });
    return [category, nextItems] as const;
  })
  .filter(([, items]) => items.length > 0)
  .sort((a, b) => {
    if (telegramStudioMode !== 'todo') return 0;
    const [categoryA, itemsA] = a;
    const [categoryB, itemsB] = b;
    const topA = itemsA[0];
    const topB = itemsB[0];
    const incompleteA = itemsA.filter((item) => !getTelegramItemStatus(item.key).allConfigured).length;
    const incompleteB = itemsB.filter((item) => !getTelegramItemStatus(item.key).allConfigured).length;

    if (incompleteA !== incompleteB) return incompleteB - incompleteA;
    if (topA && topB) {
      const priorityA = getTelegramPriorityMeta(topA.key).level;
      const priorityB = getTelegramPriorityMeta(topB.key).level;
      if (priorityA !== priorityB) return priorityA - priorityB;
    }
    return categoryA.localeCompare(categoryB, 'fa');
  });

const visibleTelegramItemsCount = filteredTelegramGroupedDefs.reduce((sum, [, items]) => sum + items.length, 0);

const telegramTodoItems = telegramTemplateDefs
  .map((item) => {
    const status = getTelegramItemStatus(item.key);
    const priority = getTelegramPriorityMeta(item.key);
    const missingAudiences = status.audiences.filter((entry) => !entry.configured);
    const firstMissing = missingAudiences[0];
    const suggestedPreset = firstMissing ? buildTelegramAudiencePreset(item.key, firstMissing.aud).trim() : '';
    const confidenceBase = 58 + (priority.level === 1 ? 18 : priority.level === 2 ? 12 : 8) + (suggestedPreset ? 10 : 0) + ((3 - missingAudiences.length) * 5);
    const aiConfidence = Math.max(62, Math.min(96, confidenceBase));
    const deferredUntil = telegramTodoLaterMap[item.key];
    const isDone = !!telegramTodoDoneMap[item.key];
    return {
      item,
      status,
      priority,
      missingAudiences,
      missingCount: missingAudiences.length,
      firstMissing,
      suggestedPreset,
      aiConfidence,
      deferredUntil,
      isDone,
    };
  })
  .filter((entry) => entry.missingCount > 0 && !entry.isDone)
  .sort((a, b) => {
    const deferredA = a.deferredUntil ? 1 : 0;
    const deferredB = b.deferredUntil ? 1 : 0;
    if (deferredA !== deferredB) return deferredA - deferredB;
    if (a.priority.level !== b.priority.level) return a.priority.level - b.priority.level;
    if (a.missingCount !== b.missingCount) return b.missingCount - a.missingCount;
    return a.item.label.localeCompare(b.item.label, 'fa');
  });

const telegramTodoSummary = telegramTodoItems.reduce((acc, entry) => {
  acc.open += 1;
  if (entry.priority.level === 1) acc.urgent += 1;
  if (entry.deferredUntil) acc.later += 1;
  return acc;
}, { open: 0, urgent: 0, later: 0 });

const telegramTodoTopItems = telegramTodoItems.filter((entry) => !entry.deferredUntil).slice(0, 5);

function getTelegramAudienceStatus(itemKey: string, audience: TelegramAudience): TelegramAudienceStatus {
  const audienceKey = getTelegramAudienceKey(itemKey, audience);
  const value = String(telegramInfo[audienceKey] || '').trim();
  return {
    aud: audience,
    configured: value.length > 0,
    label: value.length > 0 ? 'کامل' : 'ناقص',
  };
}

function getTelegramItemStatus(itemKey: string) {
  const audiences = (['customer','partner','manager'] as TelegramAudience[]).map((aud) => getTelegramAudienceStatus(itemKey, aud));
  const configuredCount = audiences.filter((entry) => entry.configured).length;
  return {
    audiences,
    configuredCount,
    percent: Math.round((configuredCount / audiences.length) * 100),
    allConfigured: configuredCount === audiences.length,
    anyConfigured: configuredCount > 0,
  };
}

function getTelegramCategoryStatus(items: typeof telegramTemplateDefs) {
  const totalAudiences = items.length * 3;
  const configuredAudiences = items.reduce((sum, item) => sum + getTelegramItemStatus(item.key).configuredCount, 0);
  return {
    configuredAudiences,
    totalAudiences,
    percent: totalAudiences ? Math.round((configuredAudiences / totalAudiences) * 100) : 0,
  };
}

function getTelegramProgressTone(ratio: number) {
  if (ratio >= 100) {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
      bar: 'from-emerald-500 via-teal-500 to-green-500',
      rail: 'bg-emerald-100/80 dark:bg-emerald-950/20',
      icon: 'fa-circle-check',
      label: 'کامل',
    };
  }
  if (ratio > 0) {
    return {
      badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
      bar: 'from-amber-500 via-yellow-500 to-orange-500',
      rail: 'bg-amber-100/80 dark:bg-amber-950/20',
      icon: 'fa-hourglass-half',
      label: 'نیمه‌کامل',
    };
  }
  return {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
    bar: 'from-rose-500 via-pink-500 to-red-500',
    rail: 'bg-rose-100/80 dark:bg-rose-950/20',
    icon: 'fa-circle-xmark',
    label: 'خالی',
  };
}

const telegramسراسریSummary = telegramTemplateDefs.reduce((acc, item) => {
  const status = getTelegramItemStatus(item.key);
  if (status.configuredCount === 3) acc.complete += 1;
  else if (status.configuredCount > 0) acc.partial += 1;
  else acc.empty += 1;
  acc.configuredAudiences += status.configuredCount;
  return acc;
}, { complete: 0, partial: 0, empty: 0, configuredAudiences: 0 });

const telegramسراسریCompletionPercent = telegramTemplateDefs.length
  ? Math.round((telegramسراسریSummary.configuredAudiences / (telegramTemplateDefs.length * 3)) * 100)
  : 0;

const telegramReadinessScore = Math.round((telegramسراسریCompletionPercent * 0.7) + ((Math.max(0, 100 - (telegramTodoSummary.urgent * 8))) * 0.3));
const telegramCoachMessage = telegramTodoSummary.urgent > 0
  ? `برای سریع‌ترین نتیجه، اول ${telegramTodoSummary.urgent.toLocaleString('fa-IR')} رویداد اولویت‌بالا را کامل کن تا پوشش اعلان‌ها پایدارتر شود.`
  : telegramسراسریSummary.empty > 0
    ? `پوشش کلی خوب است؛ حالا رویدادهای خالی را کامل کن تا تجربه تلگرام یکدست و حرفه‌ای شود.`
    : `مرکز قالب‌ها تقریباً آماده است؛ حالا روی بهینه‌سازی متن‌ها و بررسی و ادامه سناریوهای مهم تمرکز کن.`;

  return {
    telegramTemplateDefs,
    telegramGroupedDefs,
    telegramEffectiveFilter,
    filteredTelegramGroupedDefs,
    visibleTelegramItemsCount,
    telegramTodoItems,
    telegramTodoSummary,
    telegramTodoTopItems,
    getTelegramAudienceStatus,
    getTelegramItemStatus,
    getTelegramCategoryStatus,
    getTelegramPriorityMeta,
    getTelegramProgressTone,
    telegramسراسریSummary,
    telegramسراسریCompletionPercent,
    telegramReadinessScore,
    telegramCoachMessage,
  };
};
