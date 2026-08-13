# Kourosh UI governance

این پوشه مرجع رسمی معماری و مهاجرت UI پروژه است.

## منابع اصلی

- `config/ui/ui-manifest.json`: قرارداد ماشین‌خوان اجزای رسمی UI.
- `styles/manifest/style-manifest.json`: فهرست کامل تمام CSSها و ترتیب دقیق اجرای آن‌ها.
- `app/bootstrap/styles.ts`: خروجی تولیدشده از Style Manifest؛ ویرایش دستی ممنوع است.
- `docs/ui/baselines/ui-boundary-baseline.json`: سقف بدهی فعلی Primitiveهای خام و Importهای قدیمی.
- `npm run audit:ui-system`: Audit مرکزی UI Foundation.

قبل از ایجاد Component، CSS یا Variant جدید، ابتدا Manifest و Componentهای فعلی بررسی شوند. اگر نمونه مشابه کامل یا ناقص وجود دارد، همان مورد باید اصلاح و تکمیل شود؛ ساخت نسخه تکراری مجاز نیست.
