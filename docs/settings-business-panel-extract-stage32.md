# Stage 32 — Settings Business Panel Extract

## هدف

ادامه کوچک‌سازی محافظه‌کارانه `pages/Settings.tsx` بدون تغییر UI/UX و بدون دست‌زدن به state، handlerها یا CSS.

## تغییرات

- تب Business / اطلاعات کسب‌وکار از `pages/Settings.tsx` خارج شد.
- کامپوننت جدید اضافه شد:

```txt
pages/settings/SettingsBusinessPanel.tsx
```

- `Settings.tsx` فقط props لازم را به کامپوننت جدید پاس می‌دهد.
- state، computed values و handlerها همچنان در parent باقی مانده‌اند.
- JSX داخلی تب Business پس از حذف indentation wrapper با نسخه قبلی مقایسه شد.

## محدوده‌ای که عمداً تغییر نکرد

- هیچ className تغییر نکرد.
- هیچ متن فارسی، layout، فرم، دکمه، submit، upload logo یا لینک ساختار شرکا تغییر نکرد.
- CSS، PostCSS، Vite launcher و splitهای قبلی دست‌نخورده ماندند.

## Validation

- Settings.tsx transpile/syntax check: passed
- SettingsBusinessPanel.tsx transpile/syntax check: passed
- Local import check: passed
- Vite launcher scripts syntax check: passed
- ZIP integrity: tested after packaging

## نتیجه

`Settings.tsx` از حدود 337KB به حدود 322KB کاهش پیدا کرد و تب Business حالا در فایل مستقل خودش قابل نگهداری است.
