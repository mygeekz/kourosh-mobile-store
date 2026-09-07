# Kourosh UI Foundation — Phase 2 / v270

## هدف

Phase 2 لایه‌های شناور پروژه را از حالت page/component-owned خارج می‌کند و مالکیت Portal، stacking و collision positioning را به UI Foundation مشترک می‌سپارد. این فاز منطق تجاری، API/DB، فرم validation و معماری Modal/Drawer را بازطراحی نمی‌کند.

## مشکل‌های ریشه‌ای که بسته شدند

1. بعضی dropdown/popoverها مستقیم به `document.body` portal می‌شدند و برای دیده‌شدن z-index محلی داشتند.
2. selector عمومی `[role="dialog"]` تمام dialogهای معنایی را به سطح modal می‌برد؛ در حالی که calendar/header preview می‌توانند `role="dialog"` داشته باشند ولی popover هستند.
3. DatePicker، ExportMenu، TableActionGroup، Header Profile و Breadcrumb Preview هرکدام محاسبه viewport/scroll/collision جدا داشتند.
4. header quick popover و profile menu داخل tree هدر render می‌شدند و به stacking/overflow والد وابسته بودند.
5. tooltip portal class با pointer-event contract هم‌نام نبود و امکان intercept ناخواسته pointer وجود داشت.

## Foundation جدید

### `components/ui/overlayContract.ts`

مالک semantic hostهای body-level است. برای هر layer یک host پایدار با `data-kourosh-layer-host` می‌سازد. third-party portalها باید از `useOverlayPortalTarget()` استفاده کنند و مستقیم `document.body` را target نکنند.

Layerهای ثبت‌شده:

- modal / modal-backdrop
- drawer / drawer-backdrop
- sheet / sheet-backdrop
- command / command-backdrop
- dropdown
- popover
- tooltip
- toast
- floating

### `components/ui/PortalLayer.tsx`

PortalLayer دیگر مستقیم به `document.body` render نمی‌کند؛ ابتدا semantic host مربوط به layer را از overlay contract می‌گیرد. z-index متعلق به CSS contract است، نه مصرف‌کننده.

### `components/ui/useAnchoredOverlayPosition.ts`

مالک مشترک positioning برای surfaceهای متصل به anchor است:

- fixed viewport coordinates
- RTL/LTR start/center/end alignment
- top/bottom auto collision
- viewport margin و anchor gap
- available/max height
- resize/scroll/visualViewport updates
- `ResizeObserver` برای anchor/panel

### `utils/floatingOverlayPosition.ts`

resolver خالص position توسعه داده شد تا width clamp، alignment، placement و available-height را بدون DOM محاسبه کند و مستقل تست شود.

## Migrationهای Phase 2

- `SearchableSelectField`: react-select portal → semantic `popover` host؛ z-index محلی حذف شد.
- Mobile Phones `AddableAutocomplete`: react-select/Creatable portal → semantic `popover` host؛ z-index محلی حذف شد.
- `ShamsiDatePicker`: positioning محلی → `useAnchoredOverlayPosition`.
- `ExportMenu`: positioning محلی → shared hook + `PortalLayer`.
- `TableActionGroup`: positioning/scroll-resize محلی → shared hook + canonical floating surface.
- Header quick popovers: داخل header tree → `PortalLayer(popover)`؛ collision math روی resolver مشترک.
- Header profile menu: absolute/z-index محلی → portal + shared anchored positioning؛ outside-click برای portal-safe behavior اصلاح شد.
- Breadcrumb quick preview: direct `createPortal(document.body)` + `z-[160]` → `PortalLayer(popover)` + shared anchored positioning.
- Tooltip layer: pointer-events contract با class واقعی `app-tooltip-portal` همگام شد.
- `overlay-layer-contract.css`: generic `[role="dialog"] => modal z-index` حذف و stacking فقط semantic شد.

## قرارداد CSS

CSS جدید صفحه‌ای ساخته نشد. فقط foundation موجود `styles/system/overlay-layer-contract.css` توسعه یافت:

- semantic host z-index mapping
- `.app-overlay-layer-host`
- `.app-floating-surface`
- `.app-floating-menu-surface`
- tooltip pointer transparency

Runtime geometry (`top/left/width/maxHeight`) همچنان می‌تواند inline باشد چون state اندازه‌گیری‌شده است، نه theme/style دستی.

## موارد عمداً Deferred

- `DialogShell.tsx` تا Phase 5 مالک canonical direct modal `createPortal` می‌ماند.
- Toast provider در Phase 2 بازطراحی نشده است؛ semantic toast z-token موجود حفظ شده.
- palette utilityها و hard-coded color debt در Phase 7 پاکسازی می‌شوند.
- `PhoneModelAutocomplete.tsx` در runtime import نمی‌شود و dead/legacy debt است؛ برای جلوگیری از افزایش architecture-boundary debt در Phase 2 دست‌کاری نشد و در Phase 4 cleanup تعیین تکلیف می‌شود.
- Drawerهای page-specific در Phase 5 بررسی می‌شوند.

## Gateهای Phase 2

Audit اختصاصی `audit:ui-foundation-phase2-v270` الزام می‌کند:

- direct `createPortal()` بیرون از PortalLayer/DialogShell = صفر
- `menuPortalTarget=document.body` = صفر
- semantic host contract حاضر باشد
- generic role-dialog modal z override برنگردد
- مصرف‌کننده‌های migrated shared positioning/PortalLayer را نگه دارند
- Breadcrumb arbitrary overlay z-index برنگردد

## تست positioning

`test:floating-overlay-position-v270` پنج حالت را پوشش می‌دهد:

1. RTL start alignment
2. auto flip to top
3. viewport width clamp
4. constrained available height
5. LTR start alignment

## Release identity

این workstream روی source release v267 بنا شده است. `KOUROSH_SOURCE_VERSION` در Phase 2 عمداً تغییر نمی‌کند تا UI hardening stage با MiniApp/PWA release identity اشتباه نشود.
