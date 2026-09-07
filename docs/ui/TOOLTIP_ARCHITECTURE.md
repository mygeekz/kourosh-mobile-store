# Tooltip Architecture

## قرارداد مرجع

کل برنامه فقط از `SmartTooltipLayer` استفاده می‌کند. این Component:

- `title`های Native را به `data-tooltip` تبدیل و Attribute اصلی را حذف می‌کند تا Tooltip مرورگر و Tooltip برنامه هم‌زمان ظاهر نشوند.
- فقط Tooltip صریح نمایش می‌دهد؛ متن تمام Buttonها و Placeholder فیلدها به‌صورت خودکار Tooltip نمی‌شوند.
- پس از ۴۲۰ میلی‌ثانیه نمایش داده می‌شود.
- پس از ۳۲۰۰ میلی‌ثانیه خودکار بسته می‌شود.
- Arrow، Gradient، Glow و چندلایه‌سازی ندارد.
- Style آن فقط در `styles/system/overlay-layer-contract.css` نگهداری می‌شود.

برای جلوگیری از Tooltip روی یک ناحیه از `data-no-tooltip="true"` استفاده شود.
