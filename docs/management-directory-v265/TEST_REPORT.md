# Kourosh Store Management v265 — Test Report

## Source Gate

Manifest رسمی v265 شامل 61 قرارداد Source است.

تمام 61 قرارداد اجرا و PASS شده‌اند. به دلیل سقف زمانی یک اجرای طولانی ابزار، اجرای اصلی تا Check 36 پیش رفت و Checkهای باقی‌مانده در continuation batchها اجرا شدند؛ هیچ Checkی Skip نشد.

موارد کلیدی PASS:

- `audit:management-directory-table-standard-v265`
- `audit:management-directory-reference`
- `audit:miniapp-release-v265`
- `audit:miniapp-release-gate-v265`
- `audit:miniapp-rc-v265`
- `sync:miniapp-release:check`
- role/infrastructure RC matrices
- Snapshot / Offline / Edge regressions
- Live state / refresh / recovery
- Telegram stable URL / menu preservation
- Build ensure/source isolation contracts

## Syntax

TypeScript parser روی این فایل‌ها اجرا و PASS شد:

- `components/ui/ManagementDirectoryTable.tsx`
- `components/people/PartnerDirectoryList.tsx`
- `pages/Customers.tsx`
- `pages/Repairs.tsx`

## Production Environment

`verify:miniapp:environment-v265` در محیط فعلی FAIL شد، مطابق انتظار:

- Node فعلی: `22.16.0`
- Node مورد نیاز پروژه: `^22.17.0 || >=24`
- `node_modules`: نصب نیست
- dependencyهای project-local موردنیاز در دسترس نیستند

این مورد به‌عنوان PASS گزارش نشده است.

## Production Build

`npm run build:miniapp` اجرا شد:

- Release sync روی v265: PASS
- Vite build: اجرا نشد؛ `vite: not found`
- Exit code: 127

بنابراین Production Build برای v265 در این محیط تأیید نشده است.
