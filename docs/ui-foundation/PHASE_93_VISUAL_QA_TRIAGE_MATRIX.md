# Phase 93 — Visual QA Triage Matrix / Screenshot Handoff Kit

این مرحله برای آماده‌سازی تست تصویری بعد از redesignهای اصلی اضافه شد. در این مرحله هیچ فایل اجرایی UI، JSX/TSX، API، route، دیتابیس یا منطق برنامه تغییر نکرد.

## هدف

بعد از بازطراحی‌های اصلی، مهم‌ترین کار این است که تست تصویری به‌صورت پراکنده انجام نشود. این مرحله یک سیستم تحویل اسکرین‌شات و triage می‌سازد تا هر ایراد بصری سریع، دقیق و قابل فیکس باشد.

## خروجی‌های اضافه‌شده

```txt
PHASE_93_VISUAL_QA_TRIAGE_MATRIX.md
PHASE_93_SCREENSHOT_NAMING_PROTOCOL.md
PHASE_93_VISUAL_ISSUE_REPORT_TEMPLATE.md
PHASE_93_FINAL_UI_REVIEW_ROUTE_MAP.json
PHASE_93_QA_CHECKS.json
```

## اولویت تست تصویری

| Priority | Screen | Why |
|---|---|---|
| P0 | Settings > Telegram | بزرگ‌ترین redesign و پرریسک‌ترین صفحه از نظر density، RTL/LTR، log table و template editor |
| P0 | Dashboard | اثر مستقیم روی حس premium و صفحه اول کاربر |
| P1 | Reports Hub + Financial Reports | داده زیاد، KPI، فیلتر، جدول، خروجی |
| P1 | Mobile Phones | فرم و جدول سنگین، IMEI، قیمت، actionهای زیاد |
| P1 | Partner / Customer Detail | Ledger، تراکنش، IMEI، شناسه سیستم، مودال‌های مالی |
| P2 | Products / Services / Repairs | جدول‌ها و actionهای عملیاتی |
| P2 | Settings Account / Business / Users | فرم‌ها، جدول کاربران، مودال‌ها |

## پروتکل ارسال اسکرین‌شات

برای هر صفحه، حداقل این ۴ حالت کافی است:

```txt
Light / 1366px
Dark / 1366px
Light / 1280px
Mobile / 390px
```

برای صفحه‌های خیلی شلوغ مثل Telegram و Mobile Phones، یک full-page screenshot و یک crop از بالای صفحه بفرست.

## بررسی‌های انجام‌شده

| Check | Result |
|---|---:|
| CSS files | 180 |
| CSS imports in index.tsx | 89 |
| Missing internal CSS imports | 0 |
| Literal `\n` in CSS files | 0 |
| CSS brace mismatch files | 0 |
| Runtime UI changed | No |
| JSX/TSX changed | No |
| API/logic changed | No |

## مرحله بعد پیشنهادی

پروژه را اجرا کن و از **Settings > Telegram** در حالت Light با عرض ۱۳۶۶px اسکرین‌شات بفرست. بعد از روی تصویر، polish واقعی انجام می‌دهم: spacing، overflow، contrast، text hierarchy، RTL/LTR و micro-alignment.
