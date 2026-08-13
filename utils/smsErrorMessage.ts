export type SmsHumanError = {
  title: string;
  message: string;
  action: string;
  technical: string;
  severity: 'warning' | 'danger' | 'info';
};

const normalize = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
};

const compact = (value: string): string => value
  .replace(/عملیات ناموفق بود/g, 'انجام نشد')
  .replace(/عملیات ناموفق بود/g, 'انجام نشد')
  .replace(/ثبت اطلاعات شد/g, 'ثبت شد')
  .replace(/\s+/g, ' ')
  .trim();

const includesAny = (text: string, patterns: Array<string | RegExp>): boolean =>
  patterns.some((pattern) => typeof pattern === 'string' ? text.includes(pattern.toLowerCase()) : pattern.test(text));

export const humanizeSmsError = (rawInput: unknown): SmsHumanError => {
  const raw = compact(normalize(rawInput));
  const text = raw.toLowerCase();

  if (!raw) {
    return {
      title: 'ارسال پیامک ناموفق بود',
      message: 'جزئیات خطا از سرویس پیامک ثبت نشده است.',
      action: 'یک بار دیگر ارسال تست را انجام بده؛ اگر دوباره خطا خالی بود، لاگ سرور را بررسی کن.',
      technical: 'EMPTY_SMS_ERROR',
      severity: 'warning',
    };
  }

  if (includesAny(text, ['bodyid', 'body id', 'pattern id', 'patternid', 'شناسه پترن', 'شناسه الگو', 'کد بدنه', 'الگو نامعتبر', 'bodyid نامعتبر', /(^|[^0-9])-108([^0-9]|$)/])) {
    return {
      title: 'شناسه پترن معتبر نیست',
      message: 'کد BodyId یا پترن پیامک با پنل شما هم‌خوان نیست، تأیید نشده، یا هنوز برای ارسال فعال نشده است.',
      action: 'BodyId را مستقیم از پنل ملی‌پیامک کپی کن، مطمئن شو پترن تأیید شده و برای همان حساب/خط خدماتی فعال است؛ سپس ارسال تست بزن.',
      technical: raw,
      severity: 'danger',
    };
  }

  if (includesAny(text, ['username', 'password', 'user/pass', 'authentication', 'unauthorized', '401', '403', 'نام کاربری', 'رمز عبور', 'کلمه عبور', 'احراز', 'اعتبارسنجی', 'مجوز'])) {
    return {
      title: 'اطلاعات ورود پنل پیامک درست نیست',
      message: 'نام کاربری یا رمز عبور سرویس پیامک ناقص یا اشتباه است، یا دسترسی API برای این حساب فعال نیست.',
      action: 'در تنظیمات پنل پیامک، نام کاربری و رمز عبور را دوباره وارد کن و سپس Health Check را اجرا کن.',
      technical: raw,
      severity: 'danger',
    };
  }

  if (includesAny(text, ['credit', 'balance', 'شارژ', 'اعتبار', 'موجودی', 'insufficient', 'کافی نیست'])) {
    return {
      title: 'اعتبار پنل پیامک کافی نیست',
      message: 'سرویس پیامک به دلیل کمبود شارژ یا محدودیت مالی، پیام را ارسال نکرده است.',
      action: 'اعتبار پنل پیامک را افزایش بده و بعد از شارژ، ارسال تست را تکرار کن.',
      technical: raw,
      severity: 'warning',
    };
  }

  if (includesAny(text, ['recipient', 'mobile', 'phone', 'number', 'شماره', 'گیرنده', 'موبایل', 'invalid number', 'not valid'])) {
    return {
      title: 'شماره گیرنده معتبر نیست',
      message: 'شماره موبایل گیرنده ناقص، اشتباه، یا با فرمت قابل قبول سرویس پیامک ثبت نشده است.',
      action: 'شماره را با فرمت صحیح مثل 09123456789 بررسی کن و دوباره ارسال تست بزن.',
      technical: raw,
      severity: 'warning',
    };
  }

  if (includesAny(text, ['token', 'parameter', 'parameters', 'variable', 'variables', 'متغیر', 'پارامتر', 'تعداد پارامتر', 'ترتیب متغیر', 'values count'])) {
    return {
      title: 'متغیرهای پترن با قالب هم‌خوان نیست',
      message: 'تعداد یا ترتیب متغیرهایی که برنامه ارسال می‌کند با متغیرهای تعریف‌شده در پترن پیامک یکی نیست.',
      action: 'در کارت همان پترن، لیست متغیرهای مورد استفاده را با متن پترن داخل پنل پیامک مقایسه کن.',
      technical: raw,
      severity: 'warning',
    };
  }

  if (includesAny(text, ['line', 'sender', 'base number', 'basenumber', 'service line', 'خط', 'فرستنده', 'شماره خدماتی'])) {
    return {
      title: 'خط ارسال یا شماره خدماتی آماده نیست',
      message: 'خط فرستنده، شماره خدماتی یا BaseNumber برای این نوع ارسال فعال یا درست تنظیم نشده است.',
      action: 'در پنل پیامک وضعیت خط خدماتی و دسترسی ارسال پترنی را بررسی کن.',
      technical: raw,
      severity: 'warning',
    };
  }

  if (includesAny(text, ['timeout', 'etimedout', 'socket hang up', 'econnreset', 'network', 'failed to fetch', 'dns', 'enotfound', 'fetch failed', 'قطع', 'شبکه'])) {
    return {
      title: 'ارتباط با سرویس پیامک برقرار نشد',
      message: 'در زمان ارسال، اتصال برنامه به سرویس پیامک قطع یا کند شده است.',
      action: 'اتصال اینترنت/سرور، DNS، فایروال و دسترسی به API سرویس پیامک را بررسی کن و بعد دوباره ارسال کن.',
      technical: raw,
      severity: 'danger',
    };
  }

  if (includesAny(text, ['429', 'rate', 'too many', 'limit', 'محدودیت', 'زیاد'])) {
    return {
      title: 'محدودیت تعداد ارسال فعال شده است',
      message: 'در بازه کوتاه تعداد زیادی پیام ارسال شده و سرویس پیامک درخواست را محدود کرده است.',
      action: 'چند دقیقه صبر کن یا ارسال گروهی را با فاصله زمانی کمتر/صف ارسال انجام بده.',
      technical: raw,
      severity: 'warning',
    };
  }

  if (includesAny(text, ['500', '502', '503', '504', 'server error', 'internal', 'خطای سرور'])) {
    return {
      title: 'سرویس پیامک موقتاً پاسخ درست نداده است',
      message: 'خطا از سمت سرویس‌دهنده پیامک یا مسیر API برگشته است.',
      action: 'چند دقیقه بعد دوباره تست کن. اگر تکرار شد، وضعیت سرویس‌دهنده یا پنل پیامک را بررسی کن.',
      technical: raw,
      severity: 'danger',
    };
  }

  return {
    title: 'ارسال پیامک انجام نشد',
    message: compact(raw) || 'سرویس پیامک خطای نامشخص برگردانده است.',
    action: 'جزئیات فنی را بررسی کن؛ اگر خطا مربوط به BodyId، شماره گیرنده یا اطلاعات ورود است همان بخش را اصلاح کن.',
    technical: raw,
    severity: 'danger',
  };
};
