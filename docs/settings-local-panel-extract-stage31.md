# Stage 31 — Settings Local Domain Panel Split

## هدف
ادامه کوچک‌سازی `pages/Settings.tsx` بدون تغییر UI/UX و بدون جابه‌جایی state/handlerهای حساس.

## تغییرات
- تب دامنه محلی از `pages/Settings.tsx` جدا شد.
- فایل جدید اضافه شد: `pages/settings/SettingsLocalPanel.tsx`.
- state، computed valueها و handlerها در parent باقی ماندند.
- JSX دامنه محلی با همان کلاس‌ها، متن‌ها، دکمه‌ها و ترتیب قبلی منتقل شد.
- هیچ CSS یا layout تغییر نکرد.

## کنترل ریسک
- شرط `tab !== 'local'` داخل کامپوننت جدید حفظ شد.
- `Button` فقط در کامپوننت جدید import شد.
- `Settings.tsx` فقط به جای JSX قبلی، کامپوننت جدید را render می‌کند.
- مسیرهای import محلی بررسی شدند.
- syntax transpile برای `Settings.tsx` و `SettingsLocalPanel.tsx` پاس شد.

## نتیجه
- `Settings.tsx` از حدود 326KB به حدود 314KB کاهش یافت.
- بخش Local Domain حالا مستقل‌تر و قابل نگهداری‌تر است.
