export type TelegramErrorKind =
  | 'timeout'
  | 'socket_hang_up'
  | 'proxy_refused'
  | 'dns'
  | 'unauthorized'
  | 'chat_id'
  | 'blocked'
  | 'parse_mode'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export type TelegramHumanError = {
  kind: TelegramErrorKind;
  title: string;
  message: string;
  action: string;
  technical: string;
};

const cleanTechnical = (value: unknown) => String(value ?? '').trim();

export const humanizeTelegramError = (value: unknown): TelegramHumanError => {
  const raw = cleanTechnical(value);
  const lower = raw.toLowerCase();

  if (!raw) {
    return {
      kind: 'unknown',
      title: 'جزئیات خطا ثبت نشده است',
      message: 'سیستم فقط ناموفق بودن ارسال را ثبت کرده و پاسخ فنی کامل ذخیره نشده است.',
      action: 'یک بار ارسال مجدد را بزن تا لاگ جدید با جزئیات کامل‌تر ثبت شود.',
      technical: '—',
    };
  }

  if (/socket hang up|socket hangup|connection reset|econnreset/.test(lower)) {
    return {
      kind: 'socket_hang_up',
      title: 'ارتباط با تلگرام وسط ارسال قطع شد',
      message: 'درخواست به API تلگرام شروع شده، اما اتصال قبل از دریافت پاسخ بسته شده است. معمولاً این اتفاق از ناپایداری Proxy/VPN، قطع شدن مسیر شبکه، یا ناسازگاری پروتکل و پورت proxy می‌آید.',
      action: 'Proxy تلگرام را بررسی کن، اگر از v2rayN یا socks استفاده می‌کنی پورت و نوع پروتکل را دوباره چک کن، سپس ارسال مجدد را بزن.',
      technical: raw,
    };
  }

  if (/timeout|etimedout|request timed out|abort/i.test(raw)) {
    return {
      kind: 'timeout',
      title: 'تلگرام در زمان مجاز پاسخ نداد',
      message: 'سرور به تلگرام درخواست داده اما پاسخ در زمان مناسب برنگشته است. این معمولاً یعنی مسیر اینترنت یا Proxy کند، فیلتر، یا ناپایدار است.',
      action: 'اتصال اینترنت سرور و Proxy تلگرام را بررسی کن؛ بعد از پایدار شدن مسیر، ارسال مجدد را بزن.',
      technical: raw,
    };
  }

  if (/econnrefused|proxy connection refused|connect refused|socks|tunneling socket could not be established/.test(lower)) {
    return {
      kind: 'proxy_refused',
      title: 'پراکسی تلگرام اتصال را قبول نکرد',
      message: 'برنامه نتوانسته به آدرس یا پورت proxy وصل شود. ممکن است proxy خاموش باشد، پورت اشتباه وارد شده باشد، یا نوع proxy با آدرس ثبت‌شده سازگار نباشد.',
      action: 'فیلد Proxy تلگرام را با فرمت درست مثل socks5://127.0.0.1:10808 یا http://127.0.0.1:10809 بررسی کن.',
      technical: raw,
    };
  }

  if (/enotfound|eai_again|getaddrinfo|dns/.test(lower)) {
    return {
      kind: 'dns',
      title: 'آدرس تلگرام resolve نشد',
      message: 'سرور نتوانسته دامنه api.telegram.org را پیدا کند. این مشکل معمولاً از DNS، اینترنت سرور یا محدودیت شبکه است.',
      action: 'DNS و اینترنت سرور را بررسی کن یا ارسال تلگرام را از مسیر proxy پایدار عبور بده.',
      technical: raw,
    };
  }

  if (/unauthorized|401|bot token|invalid token|not found/i.test(raw)) {
    return {
      kind: 'unauthorized',
      title: 'توکن ربات معتبر نیست',
      message: 'تلگرام ربات را با توکن فعلی قبول نکرده است. ممکن است توکن اشتباه کپی شده باشد یا BotFather توکن جدید داده باشد.',
      action: 'توکن ربات را از BotFather دوباره کپی کن و در بخش توکن تلگرام ذخیره کن.',
      technical: raw,
    };
  }

  if (/chat not found|chat_id|chat id|recipient|bad request/i.test(raw)) {
    return {
      kind: 'chat_id',
      title: 'گیرنده تلگرام معتبر نیست',
      message: 'Chat ID اشتباه است یا کاربر هنوز ربات را Start نکرده است. تا وقتی کاربر ربات را Start نکند، ارسال مستقیم به او انجام نمی‌شود.',
      action: 'از کاربر بخواه ربات را Start کند، سپس Chat ID را دوباره از گفت‌وگوهای اخیر بگیر یا در پروفایل همان شخص ذخیره کن.',
      technical: raw,
    };
  }

  if (/forbidden|bot was blocked|blocked by the user|user is deactivated/i.test(raw)) {
    return {
      kind: 'blocked',
      title: 'کاربر اجازه دریافت پیام از ربات را ندارد',
      message: 'کاربر ربات را بلاک کرده، حساب او غیرفعال شده، یا تلگرام اجازه ارسال به این مخاطب را نمی‌دهد.',
      action: 'از کاربر بخواه ربات را unblock و دوباره Start کند؛ بعد ارسال مجدد را بزن.',
      technical: raw,
    };
  }

  if (/parse|entity|can't parse|markdown|html|unsupported start tag/i.test(raw)) {
    return {
      kind: 'parse_mode',
      title: 'فرمت متن پیام مشکل دارد',
      message: 'تلگرام نتوانسته HTML یا Markdown پیام را بخواند. معمولاً یک تگ بسته نشده، کاراکتر خاص escape نشده، یا فرمت انتخابی با متن پیام سازگار نیست.',
      action: 'فرمت پیام را موقتاً روی Text بگذار یا تگ‌های HTML/Markdown قالب را ساده کن.',
      technical: raw,
    };
  }

  if (/too many requests|429|retry after/i.test(raw)) {
    return {
      kind: 'rate_limit',
      title: 'محدودیت ارسال تلگرام فعال شده است',
      message: 'در بازه کوتاه پیام زیادی ارسال شده و تلگرام موقتاً درخواست‌های ربات را محدود کرده است.',
      action: 'چند دقیقه صبر کن، سپس ارسال مجدد را انجام بده و برای ارسال‌های انبوه فاصله زمانی بگذار.',
      technical: raw,
    };
  }

  if (/network|fetch failed|request to|failed/i.test(raw)) {
    return {
      kind: 'network',
      title: 'ارسال به تلگرام به مشکل شبکه خورد',
      message: 'برنامه نتوانسته پاسخ سالم از تلگرام بگیرد. علت می‌تواند اینترنت سرور، proxy، فیلتر بودن مسیر یا قطع شدن اتصال باشد.',
      action: 'ابتدا Proxy/مسیر تلگرام را تست کن؛ اگر سلامت اتصال برقرار بود، ارسال مجدد را بزن.',
      technical: raw,
    };
  }

  return {
    kind: 'unknown',
    title: 'ارسال تلگرام ناموفق بود',
    message: 'خطا از سمت تلگرام یا شبکه برگشته اما در دسته‌بندی‌های شناخته‌شده قرار نگرفت.',
    action: 'جزئیات فنی را بررسی کن و بعد از اصلاح تنظیمات، ارسال مجدد را انجام بده.',
    technical: raw,
  };
};

export const humanizeTelegramErrorText = (value: unknown) => {
  const item = humanizeTelegramError(value);
  return `${item.title}: ${item.message} ${item.action}`;
};
