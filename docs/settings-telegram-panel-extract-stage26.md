# Stage 26 - Settings Telegram Panel Extraction

## هدف
کاهش حجم `pages/Settings.tsx` بدون تغییر UI/UX یا رفتار بخش تلگرام.

## تغییرات
- بلوک کامل تب تلگرام از `pages/Settings.tsx` به فایل زیر منتقل شد:
  - `pages/settings/SettingsTelegramPanel.tsx`
- شرط `tab === 'telegram'` داخل خود کامپوننت جدید حفظ شد.
- JSX داخلی تب تلگرام byte-for-byte به کامپوننت جدید منتقل شد؛ فقط scope متغیرها از طریق props تأمین می‌شود.
- importهای `ModalField` و `TelegramLogsPanel` از `Settings.tsx` حذف شدند و در کامپوننت جدید import شدند.

## اندازه فایل‌ها
- `Settings.tsx` قبل از استخراج: 593,200 bytes
- `Settings.tsx` بعد از استخراج: 430,709 bytes
- `SettingsTelegramPanel.tsx`: 172,405 bytes

## نکته مهم
این مرحله فقط extraction ساختاری است. CSS، classNameها، ترتیب JSX، handlerها و متن‌های UI تغییر نکردند.
