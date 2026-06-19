<div align="center">

<!-- Language Toggle -->
**[🇮🇷 فارسی](#-فارسی)** | **[🇬🇧 English](#-english)**

---

<img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite" />
<img src="https://img.shields.io/badge/RTL-Persian-EF4444?style=for-the-badge" />

<br/><br/>

# 📱 Kourosh — Mobile Store Management System
### سیستم جامع مدیریت فروشگاه موبایل

</div>

---

## 🇮🇷 فارسی

<div dir="rtl">

**یک سیستم کامل فروشگاهی و حسابداری حرفه‌ای برای مدیریت فروشگاه موبایل.**  
فروش · حسابداری · انبار · تعمیرات · اقساط · گزارش‌گیری

### ✨ امکانات

| ماژول | توضیحات |
|-------|---------|
| 🛒 **فروش و صندوق** | سبد خرید کامل با پشتیبانی از بارکد، صدور فاکتور و چاپ |
| 💳 **فروش اقساطی** | برنامه‌های چندمرحله‌ای اقساط با پیگیری پرداخت و یادآوری |
| 📦 **انبارداری** | مدیریت موجودی چند انبار، شمارش موجودی، ثبت خریدها |
| 🔧 **تعمیرات** | پیگیری سفارش تعمیر با رسید چاپی و مدیریت وضعیت |
| 👥 **CRM** | پروفایل مشتریان و شرکا، تاریخچه تراکنش، صورت حساب |
| 📊 **گزارشات و تحلیل** | گزارش مالی، نمودار فروش، سود/زیان، خروجی Excel و PDF |
| 💬 **یکپارچه‌سازی تلگرام** | اطلاع‌رسانی خودکار، پیام‌های ربات، مدیریت قالب |
| 📱 **سیستم SMS** | پنل لاگ پیامک، تست گروهی، بررسی سلامت، مدیریت الگو |
| 🔔 **اعلان‌ها** | یادآورهای هوشمند، اعلان سررسید اقساط، آماده بودن تعمیر |
| 🧾 **هزینه‌ها** | ثبت و دسته‌بندی هزینه‌ها |
| 📋 **لاگ عملیات** | تاریخچه کامل اقدامات با ردیابی کاربر |
| ⚙️ **تنظیمات** | اطلاعات کسب‌وکار، ماژول‌ها، کاربران/نقش‌ها، پشتیبان‌گیری |
| 🌗 **تم تاریک/روشن** | پشتیبانی کامل از تم با رابط RTL فارسی |
| 📲 **PWA** | قابل نصب به عنوان Progressive Web App |

### 🛠 تکنولوژی‌ها

```
فرانت‌اند     React 18 · TypeScript 5 · Vite · Tailwind CSS · Framer Motion
بک‌اند        Node.js · Express · SQLite3
UI Library    Shadcn/ui · Recharts · TanStack Table · React Router v6
فارسی‌سازی    تاریخ جلالی (شمسی) · چیدمان RTL · فرمت‌بندی اعداد فارسی
یکپارچه‌ها    Telegram Bot API · SMS Gateway · jsPDF · ExcelJS
ابزار توسعه  ESLint · tsx · concurrently · Vite PWA plugin
```

### 🚀 شروع سریع

#### پیش‌نیازها

- Node.js نسخه `>= 18`
- npm نسخه `>= 9`

#### نصب

```bash
# کلون کردن مخزن
git clone https://github.com/mygeekz/kourosh-mobile-store.git
cd kourosh-mobile-store

# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه (فرانت‌اند + بک‌اند + پروکسی)
npm run dev
```

برنامه در آدرس زیر در دسترس خواهد بود: `http://localhost:5173`

#### ویندوز

```bat
setup.bat      # راه‌اندازی اولیه
start.bat      # اجرای برنامه
```

#### مک‌اواس

```bash
bash Setup.command        # راه‌اندازی اولیه
bash Start.command        # اجرای برنامه
```

### 📁 ساختار پروژه

```
kourosh-mobile-store/
├── pages/                      # کامپوننت‌های صفحه
│   ├── MobilePhones.tsx        # مدیریت موجودی موبایل
│   ├── Customers.tsx           # CRM – مدیریت مشتریان
│   ├── SalesCartPage.tsx       # سبد خرید و پرداخت
│   ├── InstallmentSalesPage.tsx
│   ├── Repairs.tsx
│   ├── Reports.tsx
│   ├── Dashboard.tsx
│   └── settings/               # زیرپنل‌های تنظیمات
├── components/                 # کامپوننت‌های قابل استفاده مجدد
├── server/                     # بک‌اند Express + SQLite
├── types.ts                    # تایپ‌های مشترک TypeScript
├── App.tsx                     # مسیرها و چیدمان
└── index.css                   # استایل‌های سراسری + توکن‌های RTL
```

### 🌐 فارسی‌سازی

این پروژه **۱۰۰٪ فارسی** با پشتیبانی کامل RTL ساخته شده است:

- تمام تاریخ‌ها از تقویم **جلالی (شمسی)** استفاده می‌کنند
- فرمت‌بندی اعداد فارسی در سراسر برنامه
- چیدمان و تایپوگرافی RTL-first
- رندر متن آگاه از Bidi

### 🔒 احراز هویت

- احراز هویت مبتنی بر JWT
- کنترل دسترسی مبتنی بر نقش (مدیر، صندوق‌دار و غیره)
- مسیرهای محافظت‌شده

### 📤 خروجی و چاپ

- خروجی **PDF** برای فاکتورها، گزارش‌ها و رسیدهای تعمیر
- خروجی **Excel (XLSX)** برای تمام جداول داده
- چیدمان‌های **بهینه‌شده برای چاپ** برای برچسب‌ها و رسیدها

### 🤝 مشارکت

مشارکت خوش‌آمد است! لطفاً ابتدا یک Issue باز کنید تا تغییر مورد نظر را بحث کنیم.

1. Fork کنید
2. شاخه ویژگی خود را بسازید: `git checkout -b feature/amazing-feature`
3. تغییرات خود را Commit کنید: `git commit -m 'Add amazing feature'`
4. به شاخه Push کنید: `git push origin feature/amazing-feature`
5. یک Pull Request باز کنید

</div>

---

## 🇬🇧 English

**A production-grade, full-stack POS & accounting system built for professional mobile phone retailers.**  
Sales · Accounting · Inventory · Repairs · Installments · Reporting

### ✨ Features

| Module | Description |
|--------|-------------|
| 🛒 **Sales & POS** | Full cart system with barcode support, invoice generation, and print |
| 💳 **Installment Sales** | Multi-step installment plans with payment tracking and reminders |
| 📦 **Inventory** | Multi-warehouse stock management, stock counts, purchase tracking |
| 🔧 **Repairs** | Repair job tracking with receipt printing, status management |
| 👥 **CRM** | Customer & partner profiles, transaction history, account statements |
| 📊 **Reports & Analytics** | Financial reports, sales charts, profit/loss, export to Excel & PDF |
| 💬 **Telegram Integration** | Automated notifications, bot messages, template management |
| 📱 **SMS System** | SMS log panel, bulk test, health check, pattern management |
| 🔔 **Notifications** | Smart reminders, installment due alerts, repair ready notices |
| 🧾 **Expenses** | Cost tracking and categorization |
| 📋 **Audit Log** | Full action history with user tracking |
| ⚙️ **Settings** | Business info, modules, users/roles, Telegram/SMS config, backups |
| 🌗 **Dark / Light Mode** | Full theme support with Persian RTL UI |
| 📲 **PWA** | Installable as a Progressive Web App |

### 🛠 Tech Stack

```
Frontend      React 18 · TypeScript 5 · Vite · Tailwind CSS · Framer Motion
Backend       Node.js · Express · SQLite3
UI Library    Shadcn/ui · Recharts · TanStack Table · React Router v6
Persian       Jalali (Shamsi) dates · RTL layout · Persian number formatting
Integrations  Telegram Bot API · SMS Gateway · jsPDF · ExcelJS
Dev Tools     ESLint · tsx · concurrently · Vite PWA plugin
```

### 🚀 Getting Started

#### Prerequisites

- Node.js `>= 18`
- npm `>= 9`

#### Installation

```bash
# Clone the repository
git clone https://github.com/mygeekz/kourosh-mobile-store.git
cd kourosh-mobile-store

# Install dependencies
npm install

# Start the development server (frontend + backend + proxy)
npm run dev
```

The app will be available at: `http://localhost:5173`

#### Windows

```bat
setup.bat      # First-time setup
start.bat      # Start the app
```

#### macOS

```bash
bash Setup.command        # First-time setup
bash Start.command        # Start the app
```

### 📁 Project Structure

```
kourosh-mobile-store/
├── pages/                  # All page-level React components
│   ├── MobilePhones.tsx    # Mobile phone inventory management
│   ├── Customers.tsx       # CRM – customer management
│   ├── SalesCartPage.tsx   # POS cart and checkout
│   ├── InstallmentSalesPage.tsx
│   ├── Repairs.tsx
│   ├── Reports.tsx
│   ├── Dashboard.tsx
│   └── settings/           # Settings sub-panels
├── components/             # Reusable UI components
├── server/                 # Express backend + SQLite
├── types.ts                # Shared TypeScript types
├── App.tsx                 # Routes and layout
└── index.css               # Global styles + RTL design tokens
```

### 📸 Screenshots

> *(Add screenshots of your app here)*

### 🌐 Localization

This project is built **100% in Persian (Farsi)** with full RTL support:

- All dates use the **Jalali (Shamsi)** calendar
- Persian number formatting throughout
- RTL-first layout and typography
- Bidi-aware text rendering

### 🔒 Authentication

- JWT-based authentication
- Role-based access control (Admin, Cashier, etc.)
- Protected routes

### 📤 Export & Print

- **PDF** export for invoices, reports, and repair receipts
- **Excel (XLSX)** export for all data tables
- **Print-optimized** layouts for labels and receipts

### 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## ☕ Support & Donate / حمایت مالی

<div align="center">

If this project helped you or your business, consider supporting its development.  
اگر این پروژه به شما یا کسب‌وکارتان کمک کرد، از توسعه آن حمایت کنید.

### 💛 حمایت مالی از پروژه

| روش پرداخت | شماره / آدرس |
|---|---|
| 🏦 **بانک ملت** | `7441 - 6614 - 3375 - 6104` |
| 🏦 **بانک رسالت** | `4908 - 8934 - 7210 - 5041` |
| 💳 **بلو بانک** | `7766 - 8581 - 8618 - 6219` |
| 🆔 **شناسه شبا** | `IR 260560611828006779611901` |

> هر مبلغی، هر چقدر کوچک، انگیزه توسعه بیشتر پروژه را می‌دهد 🙏  
> Every contribution, no matter how small, motivates further development 🙏

</div>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ for Iranian mobile store owners  
ساخته شده با عشق برای فروشگاه‌داران موبایل ایرانی

**[⭐ Star this repo](https://github.com/mygeekz/kourosh-mobile-store)** if it was useful!

</div>