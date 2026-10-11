<div align="center">

**[🇮🇷 فارسی](#-فارسی)** &nbsp;|&nbsp; **[🇬🇧 English](#-english)**

---

<img src="https://img.shields.io/badge/milestone-v363-0F172A?style=for-the-badge" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/SQLite-Local--First-003B57?style=for-the-badge&logo=sqlite" />
<img src="https://img.shields.io/badge/Telegram-Mini%20App-229ED9?style=for-the-badge&logo=telegram&logoColor=white" />
<img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
<img src="https://img.shields.io/badge/RTL-Persian-EF4444?style=for-the-badge" />

<br/><br/>

# 📱 Kourosh — Mobile Store Management System
### سیستم جامع مدیریت فروشگاه موبایل کوروش

**Local-first POS · Accounting · Inventory · Installments · Repairs · Reports · Telegram Mini App · Advisory ML**

فروش · حسابداری · انبار · تعمیرات · اقساط · گزارش‌گیری · همکاران · PWA · تلگرام · Mini App · تحلیل هوشمند

</div>

---

## 🇮🇷 فارسی

<div dir="rtl">

## معرفی

**Kourosh Store Management** یک سامانه فول‌استک و Local-First برای مدیریت فروشگاه موبایل است که داده‌های اصلی فروشگاه را در SQLite محلی نگه می‌دارد و رابط فارسی RTL، مدیریت فروش و حسابداری، انبار، اقساط، تعمیرات، مشتریان و همکاران، گزارش‌های مدیریتی، PWA، ارتباط تلگرام و Telegram Mini App را در یک پروژه یکپارچه ارائه می‌کند.

معماری پروژه طوری طراحی شده که فروشگاه برای کارکرد اصلی به Cloud وابسته نباشد. قابلیت‌های Local/LAN، Telegram Outbound، Mini App Public Access و Cloud/Relay از یکدیگر تفکیک شده‌اند و هرکدام می‌توانند مستقل فعال یا غیرفعال شوند.


---

## 🆕 وضعیت نسخه سورس v363 و تغییرات مهم

نسخه واقعی سورس با فایل [`KOUROSH_SOURCE_VERSION`](KOUROSH_SOURCE_VERSION) مشخص می‌شود و در آرشیو بررسی‌شده `v363` است. شماره نسخه `package.json` (`0.0.0`) جایگزین Milestone پروژه نیست. قابلیت‌های جدیدتر از README قدیمی `v162`:

- **حسابداری و کنترل مالی:** زیرساخت حسابداری یکپارچه، بررسی Reconciliation، کنترل دوره مالی و بازگشایی دوره، Migration Registry و تست‌های حفاظت Ledger (بخش‌های مربوط به v337 تا v345).
- **مدیریت و امنیت تلگرام:** تفکیک مجوز/هویت و فضای کاری Manager، Customer و Partner؛ کنترل اتصال و قطع اتصال همکار، زمان‌بندی گزارش‌ها، تنظیمات اعلان مدیر و مدیریت نشست‌ها (v346 تا v362).
- **Telegram System Transport:** حالت جدید `system` در کنار `disabled`, `direct`, `proxy`, `relay`؛ با امکان بررسی مسیرهای سیستم/پروکسی و متغیر اختیاری `KOUROSH_TELEGRAM_PROXY_URL` (v359). مقادیر واقعی توکن/پروکسی هرگز وارد Git نشوند.
- **Cloudflare Pages + Worker + D1:** مسیر مستقل انتشار Mini App، احراز هویت در Edge، Snapshotهای امضاشده و Read Model مدیر. فایل `deployment/cloudflare-pages/schema/0002_manager_read_snapshot.sql` و اسکریپت Migration نسخه `v363` نیز در سورس هستند.
- **رابط کاربری:** اسکریپت‌های Audit/Regression مخصوص Dashboard، تنظیمات استایل و فرم‌ها. وجود تست‌ها به معنی PASS بودن تمام آن‌ها در این آرشیو نیست.

**محدودیت Release:** طبق گزارش‌های موجود در `docs/` (آخرین گزارش‌های مربوط به سپتامبر ۲۰۲۶)، چند آزمون واقعی هویت‌های Telegram هنوز نیازمند اجرای انسانی بوده و خطای Legacy Accounting Reconciliation نیز جداگانه ثبت شده است. **نسخه v363 را صرفاً به استناد شماره نسخه Production-ready تلقی نکنید.**

---

## ✨ ماژول‌های اصلی

| ماژول | توضیح |
|---|---|
| 🛒 **فروش و صندوق** | سبد فروش، فاکتور، فروش نقدی/اعتباری، بارکد، کنترل موجودی و عملیات فروش |
| 💳 **فروش اقساطی** | قرارداد اقساط، برنامه پرداخت، دریافت قسط، مانده، تقویم، لغو و کنترل تسویه |
| 📦 **انبار موبایل و کالا** | مدیریت گوشی، کالا و موجودی، خرید، ثبت مشخصات، کنترل گردش و قیمت‌گذاری |
| 👥 **مشتریان** | پروفایل مشتری، مانده حساب، خریدها، اقساط، فاکتورها و گردش حساب |
| 🤝 **همکاران / تأمین‌کنندگان** | حساب همکار، خرید گوشی/کالا، مانده، گردش حساب، سهم مشارکت و تسویه |
| 🔧 **تعمیرات و خدمات** | پذیرش تعمیر، وضعیت، رسید، جزئیات دستگاه و گردش عملیات |
| 🧾 **هزینه‌ها و حسابداری** | ثبت هزینه، دفتر مالی، کنترل بدهکار/بستانکار و رویدادهای مالی |
| 📊 **گزارش‌ها** | گزارش فروش، سود، مطالبات، وصول، مشتری، همکار، انبار و تحلیل‌های مدیریتی |
| 🔔 **اعلان‌ها** | یادآوری سررسید، هشدار عملیاتی و Outbox |
| 💬 **Telegram Bot** | ارسال پیام، قالب‌ها، Inbox/Logs، اتصال مشتری/همکار و کنترل Runtime |
| 📲 **Telegram Mini App** | دسترسی امن و Read-Only مشتری، همکار و Staff مجاز از داخل Telegram |
| 📱 **PWA / LAN** | اجرای قابل نصب روی شبکه محلی با HTTPS و Service Worker |
| 🏷️ **ابزارها** | لیبل، بارکد، QR Code، PDF، Excel و چاپ |
| ⚙️ **تنظیمات** | کسب‌وکار، نقش‌ها، شبکه، تلگرام، Mini App، Relay، PWA، پشتیبان و UI |

---

## 🧱 معماری Local-First

```text
┌───────────────────────────────────────────────┐
│                Kourosh Store                  │
├───────────────────────────────────────────────┤
│ React / TypeScript / RTL UI / PWA             │
│                    │                          │
│               Same-Origin /api                │
│                    │                          │
│ Node.js + Express + Business Services         │
│                    │                          │
│              Local SQLite Database            │
└───────────────────────────────────────────────┘
```

اصول اصلی:

- **SQLite محلی Source of Truth داده فروشگاه است.**
- Dashboard و عملیات اصلی بدون Cloud قابل استفاده‌اند.
- Backend اصلی برای Runtime محلی روی loopback نگه داشته می‌شود.
- دسترسی LAN/PWA از HTTPS محلی و same-origin `/api` استفاده می‌کند.
- Public Mini App مستقیماً Backend خام را expose نمی‌کند.
- Cloud/Relay یک قابلیت اختیاری است، نه Dependency اجباری فروشگاه.

---

## 🌐 چهار لایه مستقل Connectivity

### 1) Local / LAN Access

Dashboard و PWA داخل شبکه فروشگاه اجرا می‌شوند.

```text
Phone / Laptop
      ↓ HTTPS
Kourosh Local PWA
      ↓ /api
Local Backend
      ↓
SQLite
```

### 2) Telegram Outbound Transport

روش اتصال Kourosh به Telegram Bot API مستقل انتخاب می‌شود:

```text
disabled
direct
system
proxy
relay
```

حالت `system` امکان انتخاب مسیرهای شبکه/پروکسی سیستم را با منطق داخلی خودش دارد؛ حالت‌های `direct`، `proxy` و `relay` مستقل باقی می‌مانند. از هر نوع fallback یا رفتار امن فقط طبق کد و تست همان نسخه نتیجه‌گیری کنید.

### 3) Mini App Public Access

روش Public Access برای Mini App مستقل از Bot Transport است:

```text
disabled
self_hosted
external_tunnel
relay
```

مثلاً این ترکیب کاملاً معتبر است:

```text
Telegram Transport = disabled
Mini App Public Access = external_tunnel
```

### 4) Cloud / Relay

Foundation مربوط به Relay در پروژه وجود دارد، اما Store Runtime برای استفاده Local، Direct، Proxy یا External Tunnel به Kourosh Cloud وابسته نیست.

---

## 📲 Telegram Mini App

Mini App یک bundle مستقل دارد و از Dashboard اصلی جدا build می‌شود:

```bash
npm run build:miniapp
```

Gateway اختصاصی Mini App:

```text
127.0.0.1:4180
```

Backend اصلی:

```text
127.0.0.1:3001
```

Public Tunnel یا Reverse Proxy فقط باید به **Gateway روی 4180** متصل شود؛ Backend روی 3001 نباید مستقیماً Public شود.

### جریان External Tunnel

```text
Telegram / Internet
        ↓ HTTPS
External Tunnel
        ↓
127.0.0.1:4180
Mini App Gateway
        ↓
Kourosh Backend
        ↓
Local SQLite
```

### نقش‌های Mini App

#### Customer

- حساب و وضعیت بدهی
- خریدها و فاکتورها
- اقساط و جزئیات پرداخت
- داده فقط متعلق به همان مشتری

#### Partner

- وضعیت حساب همکار
- خریدها / گوشی‌ها
- گردش حساب
- مانده بدهکار/بستانکار مطابق قرارداد حساب همکار

#### Staff

Mini App کارکنان فقط برای نقش‌های مجاز فعلی DB در نظر گرفته شده است:

- **Admin**
- **Manager**

نقش‌های دیگر مانند Salesperson، Warehouse، Technician و Marketer به Staff Mini App دسترسی مدیریتی ندارند مگر سیاست پروژه در آینده صراحتاً تغییر کند.

### مدل امنیتی Mini App

- اعتبارسنجی Telegram `initData`
- Session کوتاه‌عمر و In-Memory
- جداسازی هویت Customer / Partner / Staff
- کنترل نقش از Database فعلی
- Read-Only API برای Mini App
- عدم ارائه Purchase Cost و Profit به Customer/Partner
- عدم ارائه مسیر عمومی wildcard به Backend
- عدم انجام Financial Write از Mini App
- `Cache-Control: no-store`
- CSP و Security Headers محدودکننده
- Host validation برای Public Gateway
- Runtime config به‌صورت fail-closed

---

## ☁️ Cloudflare Pages / Worker / D1 — استقرار مستقل Mini App

در سورس `v363` علاوه بر Gateway و Tunnel محلی، مسیر **Cloudflare Pages + Worker + D1** هم وجود دارد. این مسیر را با **Cloudflare Quick Tunnel** یکی نگیرید:

```text
Telegram / HTTPS
       ↓
Cloudflare Pages (Mini App static bundle + _worker.js)
       ├── Cloudflare D1 (signed subject/manager snapshots)
       └── Optional live-origin → secure tunnel → localhost:4180 → localhost:3001
```

- کد Edge در `deployment/cloudflare-pages/_worker.js` و تنظیمات نمونه در `deployment/cloudflare-pages/wrangler.toml.example` است.
- `build:miniapp` علاوه بر تولید `dist-miniapp/`، مرحله آماده‌سازی Worker برای Pages را اجرا می‌کند.
- در ویندوز، `deploy-miniapp-cloudflare.cmd` از `npm run build:miniapp:cloudflare` و سپس `npx wrangler pages deploy ../../dist-miniapp --project-name kourosh` استفاده می‌کند. استقرار Cloudflare **جدا** از اجرای Local روی Windows/macOS است.
- D1 با Binding نام `KOUROSH_EDGE_DB` استفاده می‌شود؛ Secrets تولیدی مانند `KOUROSH_EDGE_SESSION_KEY` و `KOUROSH_EDGE_SUBJECT_PEPPER` باید خارج از Git تنظیم شوند.
- Migration مربوط به Snapshot مدیر با `npm run miniapp:cloudflare:migrate-v363` تعریف شده است؛ **این دستور D1 ریموت را تغییر می‌دهد** و نباید بدون تأیید نام دیتابیس مقصد، بکاپ و برنامه Rollback اجرا شود.
- `dist-miniapp/` خروجی Generated است و در `.gitignore` قرار دارد. حذف آن از Git فقط زمانی درست است که مسیر Deploy قبل از انتشار آن را مجدداً Build کند؛ اسکریپت دستی فوق همین کار را انجام می‌دهد.
- Snapshot محلی/Edge جایگزین SQLite اصلی فروشگاه نیست. Offline/Snapshot را نباید با Live Connectivity اشتباه نمایش داد.

برای شواهد عملیاتی و محدودیت‌های باقی‌مانده: [`docs/telegram-miniapp-deployment-verification.md`](docs/telegram-miniapp-deployment-verification.md) و [`docs/telegram-miniapp-final-release-gate.md`](docs/telegram-miniapp-final-release-gate.md).

---

## ☁️ Cloudflare Quick Tunnel برای تست Windows

در Milestone قدیمی v162 ابزار Quick Tunnel معرفی شد و در سورس جدید نیز helperهای محلی وجود دارند. مسیر Pages/Worker بالا مستقل از Quick Tunnel است.

```text
start_https.bat
   ├─ Starts Mini App startup coordinator (separate console)
   │      └─ Mini App build / Gateway / optional tunnel
   └─ Starts Local HTTPS/PWA independent of Mini App readiness
```

نمونه خروجی:

```text
https://random-name.trycloudflare.com/miniapp.html
```

### نکته مهم

**Quick Tunnel فقط برای Development/Test مناسب است.** hostname آن می‌تواند پس از restart تغییر کند.

در وضعیت فعلی، URL ساخته‌شده باید در بخش Telegram/Mini App Settings به‌عنوان Public HTTPS URL ثبت شود و برای Menu Button ربات نیز همان URL استفاده شود.

برای Deployment پایدار باید از یکی از گزینه‌های زیر استفاده شود:

- hostname ثابت Self-Hosted
- External Tunnel پایدار / Named Tunnel
- Relay مدیریت‌شده در معماری آینده

Cloudflare بخشی از Business Logic اصلی Kourosh نیست و Core همچنان Provider-Independent باقی می‌ماند.

---

## 🪟 Runtime ویندوز

### `start_https.bat`

Launcher اصلی HTTPS در Windows؛ پروژه محلی برای شروع نباید منتظر Cloudflare یا Mini App بماند:

- بررسی Node/npm
- تشخیص IPv4 معتبر Wi-Fi/Ethernet
- آماده‌سازی Local HTTPS certificate
- اجرای هماهنگ‌ساز Mini App در کنسول جداگانه، مستقل از آماده‌شدن Dashboard
- بررسی مالک Port `4180` در مسیر Gateway
- Reuse کردن Gateway موجود در صورت معتبر بودن
- Fail-Closed در صورت اشغال Port توسط Process ناشناس
- اجرای optional Tunnel helper
- اجرای PWA/Backend Runtime

برای جلوگیری از خطاهای Windows launcher، BATها باید بدون UTF-8 BOM باشند.

### Gateway ownership safety

اگر `4180` قبلاً توسط Kourosh Gateway گرفته شده باشد، همان process reuse می‌شود.

اگر Process دیگری Port را گرفته باشد:

```text
FAIL CLOSED
```

Kourosh Process ناشناس را خودکار Kill نمی‌کند.

---

## 📱 Local HTTPS و PWA

اجرای Production-style محلی:

```bat
start_https.bat
```

خروجی Runtime آدرس LAN را نمایش می‌دهد، مانند:

```text
https://192.168.1.x:5173/#/
```

Root CA محلی نیز از API Runtime ارائه می‌شود تا دستگاه‌های داخل LAN بتوانند HTTPS معتبر محلی را Trust کنند.

PWA شامل Service Worker و مسیر same-origin برای Backend است.

---

## 🤖 Kourosh Pulse و Advisory ML

لایه هوشمند پروژه برای **تحلیل، پیشنهاد و Shadow Evaluation** طراحی شده است و نباید بدون سیاست صریح پروژه به موتور خودکار تصمیم مالی تبدیل شود.

قابلیت‌های موجود/زیرساختی شامل:

- Smart Insight Engine
- Predictive Engine
- Financial Brain
- RFM Analysis
- Cohort Analysis
- ABC Analysis
- Inventory Turnover / Dead Stock
- Aging Receivables
- Cashflow Analysis
- Sales Risk Analysis
- Collection Follow-up
- Phone Pricing advisory
- Market Snapshot evidence
- Supplier Channel Feed intake
- Telegram / WhatsApp / Baleh / Manual supplier-channel foundation
- ML dataset / benchmark / shadow evaluation guards

اصل طراحی:

```text
READ / ANALYZE / SUGGEST
        ≠
AUTONOMOUS FINANCIAL ACTION
```

---

## 📊 گزارش‌ها و کنترل مالی

بخش گزارش‌ها طی توسعه پروژه به سمت یک قرارداد یکپارچه‌تر برای فروش و سود حرکت کرده است.

موضوعات اصلی گزارش‌گیری:

- فروش نقدی
- فروش اعتباری
- فروش اقساطی
- قیمت خرید / قیمت فروش / سود
- سود وصول‌شده و وصول‌نشده
- مطالبات و Aging
- جریان نقدی
- دفتر جامع فروش
- تحلیل سودآوری
- گزارش مشتریان
- گزارش همکاران
- کنترل موجودی
- گزارش تصمیمات اعتباری و ریسک
- Audit Trail

محاسبات مالی اصلی باید از UI و Mini App مستقل باقی بمانند و تغییر ظاهر نباید منطق Ledger را تغییر دهد.

---

## 🔐 نقش‌ها و دسترسی

| نقش | محدوده کلی |
|---|---|
| **Admin** | دسترسی کامل مدیریتی |
| **Manager** | مدیریت عملیات، گزارش‌ها، فروش، مشتری و انبار بر اساس Permission |
| **Salesperson** | فروش، مشتری و فرآیندهای مرتبط بر اساس Permission |
| **Warehouse** | موجودی، محصولات و عملیات انبار |
| **Technician** | تعمیرات و خدمات |
| **Marketer** | CRM / بازاریابی و بخش‌های مجاز |

دسترسی واقعی از Permission/Role Policy پروژه تعیین می‌شود و صرف وجود Route به معنی مجاز بودن Role نیست.

---

## 🛠 Tech Stack

```text
Frontend       React 18 · TypeScript 5 · Vite 7 · Tailwind CSS
UI / Motion    Framer Motion · GSAP · Recharts 3 · TanStack ecosystem
Routing        React Router 7
Backend        Node.js · Express 4 · tsx
Database       SQLite3 6 · Local-first
PWA            vite-plugin-pwa
Telegram       Telegram Bot API · Telegram Web App / Mini App
Export         jsPDF · jspdf-autotable · ExcelJS
Barcode / QR   bwip-js · qrcode.react
Localization   Jalali/Shamsi · Persian Tools · RTL/Bidi-aware UI
Quality        TypeScript ratchets · ESLint ratchet · audits · runtime guards
```

---

## ✅ پیش‌نیازها

طبق `package.json` فعلی:

```text
Node.js: ^22.17.0 OR >=24.0.0
npm:     >=10.9.2 <12
```

نسخه‌های پیشنهادی مشخص‌شده در سورس: `.node-version` / `.nvmrc` = `24.11.1` و `.npm-version` = `11.6.2`. محیط نصب وابسته به native binding مربوط به `sqlite3` است.

نسخه قدیمی v162 روی **Node.js 26.5.0** در Windows تست شده بود؛ این ادعا به‌تنهایی تأیید تست نسخه v363 نیست.

---

## 🚀 نصب و اجرای سریع

### Clone

```bash
git clone https://github.com/mygeekz/kourosh-mobile-store.git
cd kourosh-mobile-store
```

### نصب Dependencyها

برای محیط تمیز ترجیحاً:

```bash
npm ci --no-audit --no-fund
```

یا برای Development معمولی:

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build Dashboard

```bash
npm run build
```

### Build Mini App

```bash
npm run build:miniapp
```

---

## 🪟 Windows

```bat
setup.bat
start.bat
start_https.bat
```

- `setup.bat` — آماده‌سازی اولیه
- `start.bat` — اجرای معمولی Local Development/Runtime
- `start_https.bat` — اجرای HTTPS/PWA + Mini App build + Gateway + optional Tunnel helper

برای غیرفعال کردن Tunnel اختیاری در اجرای HTTPS:

```bat
set KOUROSH_SKIP_MINIAPP_TUNNEL=1
start_https.bat
```

---

## 🍎 macOS

```bash
bash Setup.command          # نصب Dependencyهای lock‌شده و بررسی SQLite / Build
bash Start.command          # اجرای عادی روی HTTP :8080
bash Start-Port80.command   # اجرای اختیاری با Port 80 و نیاز احتمالی به sudo
bash FixPermissions.command # اصلاح permission اسکریپت‌ها
```

**تفاوت مهم:** اسکریپت `scripts/start-mac.sh` در سورس فعلی از `npm run dev:proxy` و **HTTP روی پورت 8080** استفاده می‌کند. این مسیر را با HTTPS/PWA ویندوز معادل تلقی نکنید؛ نصب PWA روی گوشی از طریق LAN ممکن است نیاز به Origin امن و تنظیم جداگانه داشته باشد. برای نصب تمیز، Node `24.11.1` و npm `11.6.2` در `.node-version` و `.npm-version` پیشنهاد شده و `scripts/setup-mac.sh` از `npm ci` استفاده می‌کند.

پوشه `node_modules`، SQLite Database، `.env`، Certificates و Credentialها را از ویندوز به GitHub Commit نکنید. Source را Clone کنید و دیتا/تنظیمات را در صورت نیاز با بکاپ محرمانه و سازگار انتقال دهید. اگر هر دو دستگاه مستقل روی دیتابیس محلی اجرا می‌شوند، تغییرات داده خودکار Sync نمی‌شوند.

---

## 🧪 Quality & Test Commands

### Quality Gate اصلی

```bash
npm run quality:ci
```

### TypeScript

```bash
npm run typecheck:ci:client
npm run typecheck:ci:server
npm run typecheck:miniapp
npm run typecheck:miniapp-server
```

### ESLint

```bash
npm run lint
```

### Mini App

```bash
npm run test:miniapp-foundation
npm run test:miniapp-hardening
npm run test:miniapp-v145-security
npm run test:miniapp-v146-integration
npm run test:telegram-security-v147
npm run test:telegram-authorization-v148
npm run test:miniapp-staff-v149
npm run test:miniapp-gateway-v150
npm run test:miniapp-security-v150
npm run test:miniapp-build-isolation-v150
npm run audit:miniapp-production-readiness
```

### Connectivity / Relay / Windows v162

```bash
npm run test:connectivity-v151
npm run audit:connectivity-v151
npm run test:cloud-relay-v152
npm run audit:cloud-relay-v152
npm run test:windows-miniapp-tunnel-v162
npm run audit:windows-miniapp-tunnel-v162
npm run test:v162:correction
```

### تست‌های مهم اضافه‌شده تا v363 (هدفمند)

```bash
npm run test:accounting-core-v339
npm run test:accounting-period-reopen-v342
npm run test:migration-registry-safety-v343
npm run test:telegram-management-stage9-release-v354
npm run test:telegram-webhook-failover-v356
npm run test:telegram-system-transport-v359
npm run test:telegram-manager-workspace-v360
npm run test:telegram-partner-rebind-v361
npm run test:telegram-manager-read-snapshot-v362
npm run test:telegram-manager-d1-schema-v362
npm run test:style-control-center
npm run test:style-responsive
```

بعضی تست‌ها به نسخه خاص Node یا محیط/دیتابیس مناسب نیاز دارند. تست واقعی کاربر تلگرام، شبکه و مهاجرت D1 را با اجرای تست‌های Mock جایگزین نکنید. این README ادعای اجرای PASS تست‌ها روی ZIP ارسالی ندارد.

---

### مالی / Partner / Reports

```bash
npm run test:partner-account
npm run test:reports-financial
npm run test:reports-audit
npm run test:financial-brain-final
npm run test:smart-insight-engine
npm run test:predictive-engine
```

> وجود یک script در پروژه به معنی ادعای PASS بودن آخرین اجرای آن نیست. برای Release باید نتیجه واقعی CI/Validation همان Release بررسی شود.

---

## 📁 ساختار پروژه

```text
kourosh-mobile-store/
├── app/                         # Application-level modules
├── assets/                      # Assets
├── cloud/
│   └── relay-server/            # Optional relay foundation
├── components/                  # Shared React UI
├── config/                      # Quality / TS / project configuration
├── contexts/                    # React contexts
├── deployment/
│   ├── miniapp-gateway/         # Gateway deployment examples/docs
│   └── cloudflare-pages/       # Edge Worker, D1 schemas, Wrangler config
├── docs/                        # Internal documentation
├── hooks/                       # React hooks
├── miniapp/                     # Standalone Telegram Mini App frontend
├── KOUROSH_SOURCE_VERSION       # Authoritative source release
├── ml-workbench/                # ML/advisory workbench
├── pages/                       # Dashboard pages
├── public/                      # Public/PWA assets
├── scripts/                     # Audits, launchers, runtime helpers
├── server/
│   ├── bootstrap/               # Server bootstrap
│   ├── connectivity/            # Connectivity contracts
│   ├── miniapp/                 # Mini App auth/gateway policies
│   ├── repositories/            # DB repositories
│   ├── routes/                  # Express routes
│   ├── security/                # Security policies
│   ├── services/                # Business/read-model services
│   ├── telegram/                # Telegram transport implementations
│   └── tests/                   # Runtime/regression tests
├── services/                    # Frontend services
├── shared/                      # Shared contracts/types
├── styles/                      # Root/reference style system
├── types/                       # Type definitions
├── utils/                       # Utilities
├── App.tsx                      # Dashboard route/layout entry
├── index.tsx                    # Dashboard entry
├── miniapp.html                 # Mini App HTML entry
├── vite.config.ts               # Dashboard Vite config
├── vite.miniapp.config.ts       # Mini App build config
├── Setup.command / Start.command # macOS local launcher
├── deploy-miniapp-cloudflare.cmd # Windows manual Pages deployment
├── start_https.bat              # Windows HTTPS/PWA launcher
└── start_tunnel.bat             # Optional Windows tunnel helper
```

---

## 🗄 Database Safety

Database و فایل‌های Runtime نباید داخل Git قرار بگیرند.

`.gitignore` پروژه مواردی مانند زیر را پوشش می‌دهد:

```text
*.db
*.sqlite
*.db-wal
*.db-shm
.env
.env.*
node_modules/
dist/
.vite/
private_uploads/
miniapp_public_url.txt
tools/cloudflared/cloudflared.exe
local certificate/private-key material
```

قبل از Push همیشه `git status`، `git diff --cached --name-status` و نتیجه اسکن Secretها را بررسی کنید. `.gitignore` فایل‌های **قبلاً Track‌شده** را خودکار از تاریخچه Git حذف نمی‌کند. برای خروجی‌های `dist-miniapp/`، `reports/` و بسته‌های تکراری `payload/`، روش Build/Deploy و امنیت محتوا را قبل از Push بررسی کنید. فایل `README.md` باید در **ریشه پروژه** قرار بگیرد.

راهنمای قدیمی Phase 3.4 به فایل [`docs/PHASE3.4-SAFE-CODE-SYNC.md`](docs/PHASE3.4-SAFE-CODE-SYNC.md) منتقل شده؛ این دستور صرفاً برای اعمال Patch خاص است، نه نصب کامل پروژه.

---

## 🔒 Security Notes

هیچ‌کدام از موارد زیر نباید Commit یا Share شوند:

- Telegram Bot Token
- `.env`
- SQLite production database
- WAL / SHM
- Private uploads
- TLS private keys
- Tunnel credentials
- Cloud connector credentials
- Runtime Mini App sessions
- Authentication secrets
- `certs/current-*.pfx` و سایر گواهی‌های ساخته‌شده در ZIP محلی
- فایل‌های `.wrangler/`، `reports/`، `payload/` و سایر Artifactهای عملیاتی

Public Mini App Gateway باید روی loopback بماند و فقط از طریق HTTPS Reverse Proxy/Tunnel معتبر منتشر شود.

---

## 🔄 Telegram Mini App — تست Quick Tunnel محلی (مسیر قدیمی)

**فقط برای مسیر External Tunnel محلی؛ انتشار Pages/Worker در بالا روش جداگانه‌ای دارد.**

1. `start_https.bat` را اجرا کنید.
2. منتظر آماده‌شدن Gateway و Tunnel بمانید.
3. URL نهایی `https://...trycloudflare.com/miniapp.html` را بردارید.
4. در Settings:
   - Telegram Transport را بر اساس نیاز انتخاب کنید.
   - Mini App Public Access = `external_tunnel`
   - Public HTTPS URL = URL جدید
5. Runtime config باید Host جدید را دریافت کند.
6. همان URL را برای Bot Menu Button / Mini App در Telegram تنظیم کنید.
7. Mini App را از داخل Telegram باز کنید تا `Telegram.WebApp.initData` واقعی دریافت شود.

برای تست Mini App، Telegram Outbound Transport می‌تواند مستقل روی `disabled` باشد.

---

## 🛣 Roadmap معماری

جهت‌گیری فعلی پروژه:

- Local-first store runtime
- Provider-independent public access
- Telegram transport مستقل از Mini App transport
- External Tunnel برای تست و Self-Hosted deployment
- Relay اختیاری برای سناریوهای مدیریت‌شده
- Stable per-store public URL در لایه production آینده
- ادامه hardening امنیتی و Runtime validation
- ادامه یکپارچه‌سازی UI/UX و Quality Gates

---

## 🤝 مشارکت

1. Fork کنید.
2. یک Branch جدید بسازید.
3. تغییر را همراه تست مناسب Commit کنید.
4. Quality Gateهای مرتبط را اجرا کنید.
5. Pull Request باز کنید.

نمونه:

```bash
git checkout -b feature/my-change
git add -A
git commit -m "feat: describe change"
git push origin feature/my-change
```

</div>

---

## 🇬🇧 English

## Overview

**Kourosh Store Management** is a Persian RTL, local-first, full-stack management platform for professional mobile-phone stores. It combines POS, accounting, inventory, installments, repairs, CRM, partner/supplier accounting, reporting, PWA/LAN access, Telegram integration, a standalone Telegram Mini App, and advisory analytics in one codebase.

The core store remains usable without a cloud dependency. Local access, Telegram outbound transport, Mini App public access, and optional Relay/Cloud connectivity are modeled as separate concerns.

> **Source release: v363** (`KOUROSH_SOURCE_VERSION`). This is a source version, not a blanket production approval.
> The Windows/Node.js 26.5.0 tunnel validation described below was an older v162 milestone. For recent operational evidence and unresolved release gates, see [`docs/telegram-miniapp-final-release-gate.md`](docs/telegram-miniapp-final-release-gate.md) and [`docs/telegram-miniapp-deployment-verification.md`](docs/telegram-miniapp-deployment-verification.md).

---

## What's changed since the v162 README (source v363)

The authoritative release marker in this archive is [`KOUROSH_SOURCE_VERSION`](KOUROSH_SOURCE_VERSION) = **v363**, independent of `package.json` version `0.0.0`. Newer source/test coverage includes:

- Accounting consolidation, immutable-ledger protection, financial-period workflows and migration-registry checks (v337–v345).
- Telegram manager permissions, manager/customer/partner workspace selection, notification preferences, scheduled reports and session-revocation guards (v346–v362).
- `system` Telegram transport with operating-system/network-proxy discovery and optional `KOUROSH_TELEGRAM_PROXY_URL` (v359).
- Independent Cloudflare Pages Worker + D1 snapshot read models, including a manager snapshot migration (v363).
- Dashboard/style responsive regression audits and additional UI contracts.

**Release status:** repository reports dated September 2026 still describe pending real-account Telegram verification and a separate legacy-accounting reconciliation warning. A source marker or mocked test pass must **not** be presented as full production approval.

---

## Core Modules

| Module | Description |
|---|---|
| **Sales & POS** | Cart, invoices, cash/credit sales, barcode and stock-aware sales flow |
| **Installments** | Contract flow, schedules, collections, balances, cancellation and settlement controls |
| **Inventory** | Phone/product stock, purchasing, specifications, stock movement and pricing tools |
| **Customers** | Profiles, balances, purchases, invoices, installments and ledger views |
| **Partners / Suppliers** | Partner account, purchases, phone supply, ledger, balances and settlement |
| **Repairs** | Repair intake, status tracking, receipts and device details |
| **Accounting** | Expenses, financial events, receivables/payables and audit trails |
| **Reports** | Sales, profit, collections, aging, inventory, customer and partner analytics |
| **Telegram Bot** | Transport runtime, messages, templates, inbox/logs and account linking |
| **Telegram Mini App** | Secure read-only customer, partner and authorized staff access |
| **PWA / LAN** | Installable local HTTPS web app |
| **Advisory ML** | Read-only decision support, forecasting and shadow-evaluation foundations |

---

## Local-First Architecture

```text
React / TypeScript Dashboard + PWA
              │
       same-origin /api
              │
      Node.js + Express
              │
          Local SQLite
```

Key properties:

- SQLite remains the local store data source of truth.
- Core store operation does not require Kourosh Cloud.
- Backend and Mini App gateway are kept on loopback in production-style local runtime.
- Public Mini App traffic is terminated by an external HTTPS edge/tunnel and forwarded only to the gateway.
- Public access providers are intentionally decoupled from business logic.

---

## Connectivity Model

### Local/LAN

Local dashboard and installable PWA over HTTPS.

### Telegram outbound modes

```text
disabled | direct | system | proxy | relay
```

The `system` mode probes its own OS/network/proxy candidates; direct, proxy and relay remain separate explicit modes.

### Mini App public access modes

```text
disabled | self_hosted | external_tunnel | relay
```

Telegram outbound transport and Mini App inbound public access are independent.

### Relay

An optional relay foundation exists, but Local, Direct, Proxy, Self-Hosted and External Tunnel operation must not depend on a managed Kourosh service.

---

## Telegram Mini App

The Mini App is built separately from the main dashboard:

```bash
npm run build:miniapp
```

Runtime topology:

```text
Telegram / Internet
        ↓ HTTPS
Public Tunnel / Reverse Proxy
        ↓
127.0.0.1:4180  Mini App Gateway
        ↓
127.0.0.1:3001  Kourosh Backend
        ↓
Local SQLite
```

Never expose the raw backend directly to the internet.

### Mini App audiences

- **Customer** — own account, purchases, invoices and installments.
- **Partner** — own partner account, purchases, phones and ledger.
- **Staff** — currently restricted to authorized Admin/Manager identities according to the current DB role.

### Security properties

- Telegram `initData` validation
- short-lived in-memory sessions
- role and identity isolation
- read-only Mini App routes
- no financial writes
- no purchase-cost/profit leakage to customer/partner views
- strict gateway allowlist
- restrictive CSP/security headers
- no-store cache policy
- expected-host validation
- fail-closed runtime configuration

---

## Cloudflare Pages, Edge Worker and D1 (v363)

The current source supports a **Pages + Worker + D1** deployment path **in addition to** the historical localhost Gateway / Cloudflare Quick Tunnel route:

```text
Telegram HTTPS → Cloudflare Pages (Mini App + _worker.js)
                         ├→ Cloudflare D1 (signed manager/customer/partner snapshots)
                         └→ Optional live origin → secure tunnel → 127.0.0.1:4180 → 127.0.0.1:3001
```

- Edge source: `deployment/cloudflare-pages/_worker.js`; example configuration: `deployment/cloudflare-pages/wrangler.toml.example`.
- `npm run build:miniapp:cloudflare` builds the bundle and prepares `_worker.js` in ignored `dist-miniapp/`.
- On Windows, `deploy-miniapp-cloudflare.cmd` builds and then deploys to the Pages project `kourosh` via Wrangler. This is **not** the local Windows/macOS application launcher.
- D1 binding: `KOUROSH_EDGE_DB`; production secrets such as `KOUROSH_EDGE_SESSION_KEY` and `KOUROSH_EDGE_SUBJECT_PEPPER` must be set securely outside Git.
- `npm run miniapp:cloudflare:migrate-v363` performs a **remote D1 schema change**. Verify the active database binding and take a backup/rollback plan before running; do not execute it merely to install the app locally.
- `dist-miniapp/` is a generated build artifact and is ignored by Git. Its removal from tracking is only appropriate when deployment rebuilds it, as the manual deploy script does.
- Cloudflare snapshots do **not** replace the shop's local SQLite source of truth; the UI must distinguish snapshot data from a live backend connection.

Operational evidence and known limitations: [`docs/telegram-miniapp-deployment-verification.md`](docs/telegram-miniapp-deployment-verification.md), [`docs/telegram-miniapp-final-release-gate.md`](docs/telegram-miniapp-final-release-gate.md).

---

## Windows HTTPS + Optional Quick Tunnel

`start_https.bat` is the primary Windows HTTPS launcher.

It performs environment/network preflight, builds the standalone Mini App, ensures a single gateway on `127.0.0.1:4180`, starts the optional external tunnel helper when available, and then launches the local HTTPS/PWA runtime.

Quick Tunnel output looks like:

```text
https://random-name.trycloudflare.com/miniapp.html
```

**Cloudflare Quick Tunnel is a development/test helper only.** The hostname can change after restart. Use a stable self-hosted/named tunnel or managed relay design for a stable production URL.

Cloudflare is not a hard dependency of Kourosh Core.

---

## Technology Stack

```text
Frontend       React 18 · TypeScript 5 · Vite 7 · Tailwind CSS
Motion/Charts  Framer Motion · GSAP · Recharts 3
Routing        React Router 7
Backend        Node.js · Express 4 · tsx
Database       SQLite3 6
PWA            vite-plugin-pwa
Telegram       Bot API · Telegram Web App / Mini App
Exports        jsPDF · jspdf-autotable · ExcelJS
Barcode/QR     bwip-js · qrcode.react
Localization   Jalali/Shamsi · Persian Tools · RTL/Bidi-aware UI
Quality        TS ratchets · ESLint ratchet · audits · runtime guards
```

---

## Requirements

Current `package.json` engine contract:

```text
Node.js  ^22.17.0 OR >=24.0.0
npm      >=10.9.2 <12
```

Pinned in the source: Node 24.11.1 (`.node-version`/`.nvmrc`), npm 11.6.2 (`.npm-version`). Native `sqlite3` bindings must be installed for the host OS.

An older v162 Windows runtime was exercised with Node.js 26.5.0; that result does **not** certify the v363 source.

---

## Getting Started

```bash
git clone https://github.com/mygeekz/kourosh-mobile-store.git
cd kourosh-mobile-store
npm ci --no-audit --no-fund
npm run dev
```

Production dashboard build:

```bash
npm run build
```

Standalone Mini App build:

```bash
npm run build:miniapp
```

### Windows

```bat
setup.bat
start.bat
start_https.bat
```

### macOS

```bash
bash Setup.command           # lockfile dependencies, native SQLite and build checks
bash Start.command           # local HTTP development proxy on :8080
bash Start-Port80.command    # optional port 80 (may require sudo)
bash FixPermissions.command  # make launcher/helper scripts executable
```

**Platform distinction:** `scripts/start-mac.sh` uses an HTTP proxy at port `8080` by default; it is **not** equivalent to the Windows HTTPS/PWA launcher. LAN installation of a PWA may require a separately configured secure origin. Recommended pinned versions in the archive are Node **24.11.1** (`.node-version`, `.nvmrc`) and npm **11.6.2** (`.npm-version`). `scripts/setup-mac.sh` uses `npm ci`.

Clone source and reinstall native dependencies on each OS; never commit/copy Windows `node_modules`, private TLS material, SQLite files or `.env` into Git. Local SQLite changes do not synchronize automatically between machines.

---

## Quality & Regression Commands

```bash
npm run quality:ci
npm run typecheck:ci:client
npm run typecheck:ci:server
npm run typecheck:miniapp
npm run typecheck:miniapp-server
npm run lint
npm run test:miniapp-foundation
npm run test:miniapp-hardening
npm run audit:miniapp-production-readiness
npm run test:connectivity-v151
npm run test:cloud-relay-v152
npm run test:windows-miniapp-tunnel-v162
npm run audit:windows-miniapp-tunnel-v162
npm run test:v162:correction
```

A script being present in the repository is not itself a claim that the latest run passed; release validation should always report the commands actually executed.

---

## Release validation examples added after v162

```bash
npm run test:accounting-core-v339
npm run test:accounting-period-reopen-v342
npm run test:migration-registry-safety-v343
npm run test:telegram-management-stage9-release-v354
npm run test:telegram-webhook-failover-v356
npm run test:telegram-system-transport-v359
npm run test:telegram-manager-workspace-v360
npm run test:telegram-partner-rebind-v361
npm run test:telegram-manager-read-snapshot-v362
npm run test:telegram-manager-d1-schema-v362
npm run test:style-control-center
npm run test:style-responsive
```

These scripts are present in `package.json`; their presence alone does **not** imply that they passed for this ZIP. Some need a compatible Node runtime, native modules, specific fixtures or real remote services.

---

## Git / Secret Safety

Do not commit:

```text
.env / .env.*
*.db / *.sqlite / *.db-wal / *.db-shm
node_modules/
dist/
private_uploads/
TLS private-key material
miniapp_public_url.txt
tools/cloudflared/cloudflared.exe
runtime credentials / tokens
```

Before pushing, review `git status`, `git diff --cached --name-status`, and staged-content secret-scan findings. `.gitignore` never automatically removes files already tracked in history. Only untrack `dist-miniapp/` if your deployment builds it, and exclude transient `payload/` and `reports/` artifacts. Never publish `.wrangler/`, local TLS certificates, `.env` or database files.

The old Phase 3.4 patch-specific README was preserved at [`docs/PHASE3.4-SAFE-CODE-SYNC.md`](docs/PHASE3.4-SAFE-CODE-SYNC.md). It is **not** the main installation guide.

---

## Contributing

```bash
git checkout -b feature/my-change
git add -A
git commit -m "feat: describe change"
git push origin feature/my-change
```

Open a Pull Request with the relevant validation results.

---

## ☕ Support & Donate / حمایت مالی

<div align="center">

If this project helped you or your business, consider supporting its development.  
اگر این پروژه به کسب‌وکار یا توسعه نرم‌افزار کمک کرده است، می‌توانید از ادامه توسعه آن حمایت کنید.

| روش پرداخت | شماره / آدرس |
|---|---|
| 🏦 **بانک ملت** | `7441 - 6614 - 3375 - 6104` |
| 🏦 **بانک رسالت** | `4908 - 8934 - 7210 - 5041` |
| 💳 **بلو بانک** | `7766 - 8581 - 8618 - 6219` |
| 🆔 **شناسه شبا** | `IR 260560611828006779611901` |

</div>

---



<div align="center">

Made for professional Persian mobile-store operations.  
ساخته‌شده برای مدیریت حرفه‌ای فروشگاه‌های موبایل فارسی‌زبان

**[⭐ Star this repository](https://github.com/mygeekz/kourosh-mobile-store)**

</div>
