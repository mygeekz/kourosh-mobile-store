# Stage 35 — Settings Commercial Modules Panel Extract

## هدف
بخش Commercial Modules / Feature Flags از `pages/Settings.tsx` جدا شد تا فایل تنظیمات کوچک‌تر و قابل نگهداری‌تر شود، بدون تغییر رفتار یا ظاهر.

## فایل جدید
- `pages/settings/SettingsModulesPanel.tsx`

## تغییرات
- JSX کامل تب `modules` به کامپوننت مستقل منتقل شد.
- state، handlerها و محاسبات داخل parent باقی ماندند.
- `Button`، `ToggleSwitch` و تعاریف feature flags داخل کامپوننت جدید import شدند.
- هیچ className، متن فارسی، layout، toggle، پلن آماده یا logic فعال/غیرفعال کردن ماژول‌ها تغییر نکرد.

## Validation
- استخراج روی مرز کامل JSX شرط `tab === 'modules'` انجام شد.
- `Settings.tsx` و `SettingsModulesPanel.tsx` با TypeScript transpile syntax check بررسی شدند.
- importهای local بررسی شدند.
- ZIP نهایی با `unzip -t` تست شد.
