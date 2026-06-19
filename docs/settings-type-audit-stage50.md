# Stage 50 — Settings type audit and low-risk cleanup

## هدف

این مرحله برای audit نهایی پوشه `pages/settings` انجام شد تا بعد از splitهای متعدد، وضعیت typeها، importها و ریسک‌های باقی‌مانده مشخص شود. تغییرات فقط در سطح type/cleanup کم‌ریسک بوده و JSX، CSS، className، layout و handlerها تغییر نکرده‌اند.

## اصلاحات انجام‌شده

### 1. حذف `any`های باقی‌مانده از `pages/settings`

در پایان Stage 49 هنوز چند `any` داخل خود پوشه `pages/settings` باقی مانده بود. در این مرحله موارد کم‌ریسک حذف شدند:

- `SettingsLocalPanel.tsx` دیگر برای `local_hostname` و `local_base_url` از `businessInfo as any` استفاده نمی‌کند.
- `settingsPanelTypes.ts` type جدید `SettingsLocalBusinessInfo` گرفت.
- `settingsHelpers.ts` برای `buildPartnerShareStatus` typeهای سبک `PartnerShareProfileLike` و `PartnerShareProfileItemLike` گرفت.
- `Backups.tsx` catchها از `any` به `unknown` تغییر کردند و helper امن `getErrorMessage` اضافه شد.
- `StoreOwnershipPage.tsx` type نمونه‌های backfill از `any[]` به `Record<string, unknown>[]` تغییر کرد و catch اصلی به `unknown` تبدیل شد.

## نتیجه audit

- تعداد فایل‌های اسکن‌شده: 20
- `any` باقی‌مانده در `pages/settings`: 0
- `as any` باقی‌مانده در `pages/settings`: 0
- `: any` باقی‌مانده در `pages/settings`: 0
- `Record<string, any>` باقی‌مانده در `pages/settings`: 0
- import محلی گمشده: 0
- import مبهم `from './settings'` در `pages/Settings.tsx`: False

## نکته مهم

`pages/Settings.tsx` هنوز بخشی از `any`های دامنه‌ای و API-response را دارد. آن‌ها را در این مرحله حذف نکردم چون به logicهای مرکزی تلگرام، قیمت‌گذاری، backup، local domain و پاسخ‌های API وصل هستند و cleanup آن‌ها باید جداگانه و با validation اختصاصی انجام شود.

## فایل‌های گزارش

- `docs/settings-type-audit-stage50.csv`
- `docs/settings-import-audit-stage50.csv`
- `docs/settings-split-validation-stage50.json`
