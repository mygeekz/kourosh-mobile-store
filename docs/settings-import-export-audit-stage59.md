# Stage 59 — Settings Import/Export Runtime Audit

این مرحله برای جلوگیری از regressionهایی مثل `SettingsAccountPanel export` و `Link is not defined` اضافه شد.

## نتیجه audit

- فایل‌های اسکن‌شده: **20**
- importهای local بررسی‌شده: **90**
- exportهای value در `pages/settings/index.ts`: **13**
- exportهای type از `settingsPanelTypes.ts`: **84**
- importهای `Settings.tsx` از barrel تنظیمات: **26**
- خطای import/export: **0**
- warning: **0**

## Guard جدید

اسکریپت زیر اضافه شد:

```bash
npm run audit:settings
```

این دستور موارد زیر را چک می‌کند:

1. هیچ import local در `pages/Settings.tsx` و `pages/settings/*` گم نشده باشد.
2. `pages/Settings.tsx` از import مبهم ویندوزی استفاده نکند:

```ts
from './settings'
```

و حتماً مسیر امن زیر را استفاده کند:

```ts
from './settings/index'
```

3. هر چیزی که `Settings.tsx` از barrel می‌گیرد، واقعاً در `pages/settings/index.ts` یا `settingsPanelTypes.ts` export شده باشد.
4. هر `default as ...` در barrel واقعاً در فایل مقصد `export default` داشته باشد.
5. سمبل‌های runtime حساس مثل `Link`, `Modal`, `Button`, `ToggleSwitch`, `Notification` اگر داخل `Settings.tsx` استفاده شده‌اند، import شده باشند.
6. در محدوده `pages/settings` دوباره `any`های مستقیم برنگشته باشند.

## فایل‌های گزارش

- `docs/settings-import-export-audit-latest.json`
- `docs/settings-import-export-audit-stage59-imports.csv`
- `docs/settings-import-export-audit-stage59-barrel.csv`
- `docs/settings-import-export-audit-stage59.md`
- `docs/settings-split-validation-stage59.json`

## وضعیت نهایی

Audit پاس شد. هیچ تغییر UI/UX، CSS، JSX یا handler behavior انجام نشده؛ فقط guard و گزارش اضافه شده است.
