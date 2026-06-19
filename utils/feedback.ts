import { appToast } from './toast';

export type FeedbackKind = 'create' | 'update' | 'delete' | 'save' | 'send' | 'load' | 'submit' | 'action';

const loadingMap: Record<FeedbackKind, string> = {
  create: 'در حال ثبت اطلاعات…',
  update: 'در حال به‌روزرسانی اطلاعات…',
  delete: 'در حال حذف اطلاعات…',
  save: 'در حال ذخیره تغییرات…',
  send: 'در حال ارسال درخواست…',
  load: 'در حال دریافت اطلاعات…',
  submit: 'در حال ثبت عملیات…',
  action: 'در حال پردازش عملیات…',
};

const successMap: Record<FeedbackKind, string> = {
  create: 'اطلاعات با موفقیت ثبت شد.',
  update: 'تغییرات با موفقیت ذخیره شد.',
  delete: 'مورد انتخابی با موفقیت حذف شد.',
  save: 'تغییرات با موفقیت ذخیره شد.',
  send: 'درخواست با موفقیت ارسال شد.',
  load: 'اطلاعات با موفقیت دریافت شد.',
  submit: 'عملیات با موفقیت انجام شد.',
  action: 'عملیات با موفقیت انجام شد.',
};

const fieldNameMap: Record<string, string> = {
  customerId: 'مشتری',
  partnerId: 'همکار',
  fullName: 'نام و نام خانوادگی',
  phoneNumber: 'شماره تماس',
  mobile: 'شماره موبایل',
  username: 'نام کاربری',
  password: 'رمز عبور',
  role: 'نقش کاربر',
  name: 'نام',
  title: 'عنوان',
  amount: 'مبلغ',
  downPayment: 'پیش‌پرداخت',
  numberOfInstallments: 'تعداد اقساط',
  saleDate: 'تاریخ فروش',
  dueDate: 'تاریخ سررسید',
  items: 'اقلام',
  productId: 'کالا',
  qty: 'تعداد',
  quantity: 'تعداد',
  sellPrice: 'قیمت فروش',
  buyPrice: 'قیمت خرید',
  supplierId: 'تامین‌کننده',
  categoryId: 'دسته‌بندی',
  serialNumber: 'شماره سریال',
  deviceModel: 'مدل دستگاه',
  issueDescription: 'شرح مشکل',
  estimatedCost: 'هزینه تخمینی',
  token: 'توکن ربات',
  chatId: 'شناسه مقصد',
};

const actionContextMap: Array<{ match: RegExp; title: string; hint?: string }> = [
  { match: /افزودن محصول|ثبت کالا/i, title: 'ثبت کالا انجام نشد.', hint: 'نام کالا، قیمت فروش، قیمت خرید و تامین‌کننده را بررسی کنید.' },
  { match: /ویرایش محصول|به‌روزرسانی کالا/i, title: 'به‌روزرسانی کالا انجام نشد.', hint: 'قیمت‌ها، موجودی و دسته‌بندی کالا را بررسی کنید.' },
  { match: /افزودن دسته‌بندی|ثبت دسته‌بندی/i, title: 'ثبت دسته‌بندی انجام نشد.', hint: 'نام دسته‌بندی را بررسی کنید؛ اگر مورد مشابهی وجود دارد، از همان دسته استفاده کنید.' },
  { match: /افزودن تامین‌کننده|ثبت تامین‌کننده/i, title: 'ثبت تامین‌کننده انجام نشد.', hint: 'نام تامین‌کننده و اطلاعات تماس را بررسی کنید.' },
  { match: /ثبت خرید|افزایش موجودی/i, title: 'ثبت خرید انجام نشد.', hint: 'تامین‌کننده، اقلام خرید و قیمت واحد هر ردیف را بررسی کنید.' },
  { match: /ثبت پرداخت همکار|دفتر همکار/i, title: 'ثبت پرداخت همکار انجام نشد.', hint: 'شرح پرداخت، مبلغ و تاریخ ثبت را بررسی کنید.' },
  { match: /ویرایش همکار/i, title: 'به‌روزرسانی اطلاعات همکار انجام نشد.', hint: 'نام، نوع همکار و اطلاعات تماس را بررسی کنید.' },
  { match: /حذف همکار/i, title: 'حذف همکار انجام نشد.', hint: 'ممکن است برای این همکار تراکنش، بدهی یا سابقه ثبت شده باشد.' },
  { match: /ذخیره تنظیمات کسب‌وکار|ذخیره تنظیمات/i, title: 'ذخیره تنظیمات انجام نشد.', hint: 'فیلدهای ضروری، مسیر لوگو و تنظیمات ارتباطی را بررسی کنید.' },
  { match: /آپلود لوگو/i, title: 'آپلود لوگو انجام نشد.', hint: 'فرمت فایل، حجم تصویر و دسترسی پوشه آپلود را بررسی کنید.' },
  { match: /ایجاد بکاپ|ساخت بکاپ/i, title: 'ایجاد نسخه پشتیبان انجام نشد.', hint: 'دسترسی فایل‌ها و وضعیت دیتابیس را بررسی کنید.' },
  { match: /حذف بکاپ/i, title: 'حذف نسخه پشتیبان انجام نشد.', hint: 'ممکن است فایل موردنظر در دسترس نباشد یا دسترسی حذف نداشته باشید.' },
  { match: /بازیابی بکاپ|بازیابی پایگاه‌داده/i, title: 'بازیابی نسخه پشتیبان انجام نشد.', hint: 'سازگاری فایل بکاپ، دسترسی فایل و فضای ذخیره‌سازی را بررسی کنید.' },
  { match: /ذخیره زمان‌بندی بکاپ/i, title: 'ذخیره زمان‌بندی بکاپ انجام نشد.', hint: 'عبارت cron، منطقه زمانی و تنظیمات فعال‌سازی را بررسی کنید.' },
  { match: /ایجاد کاربر/i, title: 'ایجاد کاربر جدید انجام نشد.', hint: 'نام کاربری، رمز عبور و نقش انتخاب‌شده را بررسی کنید.' },
  { match: /ویرایش نقش کاربر/i, title: 'ویرایش نقش کاربر انجام نشد.', hint: 'نقش انتخاب‌شده و سطح دسترسی کاربر را بررسی کنید.' },
  { match: /بازنشانی کلمه عبور/i, title: 'بازنشانی رمز عبور انجام نشد.', hint: 'حداقل طول رمز و یکسان بودن تکرار رمز را بررسی کنید.' },
  { match: /حذف کاربر/i, title: 'حذف کاربر انجام نشد.', hint: 'ممکن است این کاربر در حال استفاده باشد یا امکان حذف آن وجود نداشته باشد.' },
  { match: /آپلود آواتار/i, title: 'آپلود آواتار انجام نشد.', hint: 'فرمت فایل، حجم تصویر و دسترسی آپلود را بررسی کنید.' },
  { match: /تغییر کلمه عبور/i, title: 'تغییر کلمه عبور انجام نشد.', hint: 'رمز فعلی، حداقل طول رمز جدید و یکسان بودن تکرار آن را بررسی کنید.' },
  { match: /ذخیره تنظیمات تلگرام/i, title: 'ذخیره تنظیمات تلگرام انجام نشد.', hint: 'توکن ربات، chat_idها و قالب‌های پیام را بررسی کنید.' },
  { match: /ساخت certificate محلی|ساخت گواهی محلی/i, title: 'ساخت certificate محلی انجام نشد.', hint: 'PowerShell/OpenSSL، trust certificate و hostname محلی را بررسی کنید.' },
  { match: /ارسال بررسی تلگرام/i, title: 'ارسال بررسی تلگرام انجام نشد.', hint: 'توکن ربات، شناسه مقصد و اینترنت سرور را بررسی کنید.' },
  { match: /پیش‌نمایش تلگرام/i, title: 'پیش‌نمایش پیام تلگرام انجام نشد.', hint: 'متن قالب و متغیرهای استفاده‌شده در آن را بررسی کنید.' },
  { match: /گزارش/i, title: 'دریافت یا تولید گزارش انجام نشد.', hint: 'بازه زمانی، فیلترها و دسترسی این بخش را بررسی کنید.' },
];

const endpointContextMap: Array<{ match: RegExp; title: string; hint?: string }> = [
  { match: /installment-sales/i, title: 'ثبت فروش اقساطی انجام نشد.', hint: 'اطلاعات مشتری، اقلام فروش، مبلغ پیش‌پرداخت و اقساط را بررسی کنید.' },
  { match: /sales-orders\/(\d+)\/cancel/i, title: 'ابطال فاکتور انجام نشد.', hint: 'وضعیت فاکتور، موجودی اقلام و دسترسی کاربر را بررسی کنید.' },
  { match: /\/api\/sales(\/|$)/i, title: 'ثبت فاکتور انجام نشد.', hint: 'قلم‌های فاکتور، قیمت‌ها و موجودی انبار را بررسی کنید.' },
  { match: /\/api\/repairs(\/|$)/i, title: 'ثبت پذیرش تعمیر انجام نشد.', hint: 'مشتری، اطلاعات دستگاه و مبلغ‌های واردشده را بررسی کنید.' },
  { match: /\/api\/customers(\/|$)/i, title: 'ثبت اطلاعات مشتری انجام نشد.', hint: 'نام، شماره تماس و تکراری نبودن اطلاعات را بررسی کنید.' },
  { match: /\/api\/partners(\/|$)/i, title: 'ثبت اطلاعات همکار انجام نشد.', hint: 'نام، نوع همکار و اطلاعات تماس را بررسی کنید.' },
  { match: /\/api\/products(\/|$)/i, title: 'ثبت یا به‌روزرسانی کالا انجام نشد.', hint: 'نام کالا، قیمت‌ها، موجودی و تامین‌کننده را بررسی کنید.' },
  { match: /\/api\/categories(\/|$)/i, title: 'عملیات دسته‌بندی انجام نشد.', hint: 'نام دسته‌بندی را بررسی کنید یا از تکراری نبودن آن مطمئن شوید.' },
  { match: /\/api\/purchases(\/|$)/i, title: 'ثبت خرید انجام نشد.', hint: 'تامین‌کننده، اقلام خرید و قیمت‌های واردشده را بررسی کنید.' },
  { match: /\/api\/partners\/\d+\/ledger/i, title: 'عملیات دفتر همکار انجام نشد.', hint: 'شرح پرداخت، مبلغ و تاریخ ثبت را بررسی کنید.' },
  { match: /\/api\/settings(\/|$)/i, title: 'ذخیره تنظیمات انجام نشد.', hint: 'فیلدهای الزامی و مقادیر اتصال را بررسی کنید.' },
  { match: /\/api\/settings\/local-domain\/generate-cert/i, title: 'ساخت certificate محلی انجام نشد.', hint: 'PowerShell/OpenSSL، hostname، suffix و trust certificate را بررسی کنید.' },
  { match: /\/api\/telegram\/topic-config/i, title: 'تنظیمات یا بررسی تلگرام انجام نشد.', hint: 'توکن ربات، chat_idها و متن قالب را بررسی کنید.' },
  { match: /\/api\/telegram/i, title: 'عملیات تلگرام انجام نشد.', hint: 'توکن ربات، chat_id یا تنظیمات اتصال را بررسی کنید.' },
  { match: /\/api\/sms/i, title: 'عملیات پیامکی انجام نشد.', hint: 'تنظیمات پنل پیامکی، الگو یا شماره مقصد را بررسی کنید.' },
  { match: /\/api\/backup/i, title: 'عملیات نسخه پشتیبان انجام نشد.', hint: 'مسیر ذخیره‌سازی، دسترسی فایل و وضعیت دیتابیس را بررسی کنید.' },
  { match: /\/api\/users(\/|$)/i, title: 'عملیات کاربر انجام نشد.', hint: 'نام کاربری، نقش و محدودیت‌های دسترسی را بررسی کنید.' },
  { match: /\/api\/me\/(upload-avatar|change-password)/i, title: 'عملیات حساب کاربری انجام نشد.', hint: 'فایل انتخابی یا اطلاعات رمز عبور را بررسی کنید.' },
  { match: /\/api\/reports/i, title: 'دریافت گزارش انجام نشد.', hint: 'بازه زمانی، فیلترها و داده‌های مبنا را بررسی کنید.' },
];

function sentence(value: string) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /[.!؟…]$/.test(text) ? text : `${text}.`;
}

function getContextMessage(context?: { endpoint?: string; action?: string }) {
  const actionMatched = actionContextMap.find((item) => item.match.test(context?.action || ''));
  const endpointMatched = endpointContextMap.find((item) => item.match.test(context?.endpoint || ''));
  return actionMatched || endpointMatched || null;
}

export function humanizeValidationIssue(raw: string): string {
  const text = String(raw || '').trim();
  const lower = text.toLowerCase();

  const fieldKey = Object.keys(fieldNameMap).find((key) => lower.includes(key.toLowerCase()));
  const field = fieldKey ? fieldNameMap[fieldKey] : 'این فیلد';

  if (/required|not null|is required|الزامی/.test(lower)) {
    return `${field} الزامی است؛ قبل از ثبت این مقدار را کامل کنید.`;
  }
  if (/must be positive|greater than 0|positive/.test(lower)) {
    return `${field} باید بیشتر از صفر باشد.`;
  }
  if (/must be a number|invalid number|numeric/.test(lower)) {
    return `${field} باید به‌صورت عدد معتبر وارد شود.`;
  }
  if (/min length|too short|حداقل/.test(lower)) {
    return `${field} کوتاه است؛ حداقل طول موردنیاز را رعایت کنید.`;
  }
  if (/max length|too long|بیش از حد/.test(lower)) {
    return `${field} طول زیادی دارد؛ مقدار کوتاه‌تری وارد کنید.`;
  }
  if (/phone|mobile/.test(lower)) {
    return `${field} معتبر نیست؛ شماره تماس را با فرمت درست وارد کنید.`;
  }
  if (/date|invalid datetime|invalid date/.test(lower)) {
    return `${field} معتبر نیست؛ تاریخ را دوباره بررسی کنید.`;
  }
  if (/amount|price|cost|discount/.test(lower)) {
    return `${field} معتبر نیست؛ مبلغ یا قیمت واردشده را بررسی کنید.`;
  }

  return sentence(text);
}

export function getRecoveryHint(raw: unknown, context?: { endpoint?: string; action?: string }): string {
  const text = String(raw || '').trim().toLowerCase();
  const matched = getContextMessage(context);

  if (/failed to fetch|networkerror|load failed|network request failed|خطا در عملیاتی شبکه|اتصال/.test(text)) {
    return 'اتصال شبکه، آدرس سرور یا گواهی HTTPS را بررسی کنید و دوباره تلاش کنید.';
  }
  if (/401|unauthorized|invalid token/.test(text)) {
    return 'یک‌بار از حساب خارج شوید و دوباره وارد شوید؛ سپس عملیات را تکرار کنید.';
  }
  if (/403|forbidden/.test(text)) {
    return 'سطح دسترسی این کاربر را بررسی کنید یا عملیات را با حساب مدیر انجام دهید.';
  }
  if (/404|not found|یافت نشد/.test(text)) {
    return 'صفحه را تازه‌سازی کنید؛ ممکن است این مورد حذف یا منتقل شده باشد.';
  }
  if (/unique constraint|already exists|تکراری|قبلا ثبت شده/.test(text)) {
    return 'مقدار تکراری را تغییر دهید یا رکورد قبلی را ویرایش کنید.';
  }
  if (/required|validation|نامعتبر|invalid|الزامی/.test(text)) {
    return 'فیلدهای مشخص‌شده را اصلاح کنید و دوباره دکمه ثبت را بزنید.';
  }
  if (/db connection failed|sqlite|foreign key|constraint failed/i.test(text)) {
    return matched?.hint || 'ارتباط دیتابیس یا وابستگی داده‌ها را بررسی کنید و دوباره تلاش کنید.';
  }
  return matched?.hint || 'اطلاعات واردشده را مرور کنید و چند لحظه بعد دوباره تلاش کنید.';
}

export function humanizeErrorMessage(raw: unknown, context?: { endpoint?: string; action?: string }): string {
  const text = String(raw || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return context?.action
      ? `${context.action} انجام نشد. لطفاً دوباره تلاش کنید.`
      : 'عملیات کامل نشد. لطفاً دوباره تلاش کنید.';
  }

  if (/failed to fetch|networkerror|load failed|network request failed|خطا در عملیاتی شبکه|اتصال/.test(lower)) {
    return 'ارتباط با سرور برقرار نشد؛ اتصال شبکه یا آدرس سرور را بررسی کنید.';
  }

  if (/401|unauthorized|invalid token/.test(lower)) {
    return 'نشست شما منقضی شده است؛ یک‌بار دوباره وارد حساب شوید.';
  }

  if (/403|forbidden/.test(lower)) {
    return 'شما اجازه انجام این عملیات را ندارید.';
  }

  if (/404|not found|یافت نشد/.test(lower)) {
    return text.includes('یافت نشد') ? sentence(text) : 'اطلاعات موردنظر پیدا نشد یا قبلاً حذف شده است.';
  }

  if (/required|validation|نامعتبر|invalid|الزامی/.test(lower)) {
    return humanizeValidationIssue(text);
  }

  if (/openssl|certificate|pkcs|x509/i.test(text)) {
    return 'ساخت certificate محلی با خطا در عملیات مواجه شد؛ PowerShell/OpenSSL، trust certificate و نام دامنه را بررسی کنید.';
  }

  if (/500|internal server error|syntaxerror: unexpected token/i.test(text)) {
    const matched = getContextMessage(context);
    if (matched) {
      return `${matched.title}${matched.hint ? ` ${matched.hint}` : ''}`;
    }
    return 'در پردازش درخواست روی سرور مشکلی پیش آمد؛ لطفاً اطلاعات را بررسی کرده و دوباره تلاش کنید.';
  }

  if (/unique constraint|already exists|تکراری|قبلا ثبت شده/.test(lower)) {
    return 'این اطلاعات قبلاً در سیستم ثبت شده است؛ مورد تکراری را بررسی کنید.';
  }

  if (/db connection failed|sqlite|foreign key|constraint failed/i.test(lower)) {
    const matched = getContextMessage(context);
    if (matched) {
      return `${matched.title}${matched.hint ? ` ${matched.hint}` : ''}`;
    }
    return 'عملیات به‌دلیل خطا در عملیاتی پایگاه‌داده کامل نشد؛ اطلاعات و ساختار دیتابیس را بررسی کنید.';
  }

  return sentence(text);
}

export async function parseApiResult<T = any>(response: Response, context?: { endpoint?: string; action?: string }): Promise<T> {
  const payload = await response.json().catch(() => ({} as any));
  if (!response.ok || payload?.success === false) {
    throw new Error(humanizeErrorMessage(payload?.message || payload?.error || response.statusText || '', context));
  }
  return payload as T;
}

export async function runWithFeedback<T>(
  work: Promise<T>,
  options: {
    kind?: FeedbackKind;
    loading?: string;
    success?: string | ((result: T) => string);
    error?: string;
    endpoint?: string;
    action?: string;
    silentSuccess?: boolean;
  } = {}
): Promise<T> {
  const toastId = appToast.loading(options.loading || loadingMap[options.kind || 'action']);
  let toastDismissed = false;
  const dismissLoadingToast = () => {
    if (toastDismissed) return;
    toastDismissed = true;
    appToast.dismiss(toastId);
  };

  try {
    const result = await work;
    dismissLoadingToast();
    if (!options.silentSuccess) {
      appToast.success(typeof options.success === 'function' ? options.success(result) : options.success || successMap[options.kind || 'action']);
    }
    return result;
  } catch (error: any) {
    dismissLoadingToast();
    const message = options.error || humanizeErrorMessage(error?.message || error, { endpoint: options.endpoint, action: options.action });
    appToast.error(message);
    throw new Error(message);
  } finally {
    dismissLoadingToast();
  }
}
