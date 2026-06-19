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
  telegram: {
    installmentSaleCreated: 'مشتری گرامی {name}، اطلاعات فروش اقساطی شما با موفقیت ثبت شد. شماره قرارداد: {saleId}. مبلغ کل: {total} تومان. فروشگاه کوروش',
    installmentSaleCreatedPatternPreview: 'مشتری گرامی {1}، اطلاعات فروش اقساطی شما با موفقیت ثبت شد. شماره قرارداد: {2}. مبلغ کل: {3} تومان. فروشگاه کوروش',
    installmentSettled: 'مشتری گرامی {name}، همه اقساط خرید شما با موفقیت تسویه شد. از اعتماد شما به فروشگاه کوروش سپاسگزاریم.',
    invoiceCreated: 'مشتری گرامی {name}، فاکتور شما با موفقیت ثبت شد. شماره فاکتور: {invoiceId}. مبلغ قابل پرداخت: {total} تومان. فروشگاه کوروش',
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
  [/ثبت اطلاعات شما با تغییرات با موفقیت ثبت شدیت انجام شد/g, APP_MESSAGES.telegram.installmentSaleCreated],
  [/با عملیات با موفقیت انجام شدیت تسویه گردید/g, 'با موفقیت تسویه شد'],
  [/عملیات ناتغییرات با موفقیت ثبت شد بود/g, APP_MESSAGES.success.operationDone],
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
