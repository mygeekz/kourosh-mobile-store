# Phase 93 — Screenshot Naming Protocol

برای اینکه فیکس‌ها سریع و بدون ابهام انجام شود، اسکرین‌شات‌ها را با این الگو نام‌گذاری کن:

```txt
<screen>__<theme>__<width>__<state>.png
```

## نمونه‌ها

```txt
settings-telegram__light__1366__top.png
settings-telegram__dark__1366__full.png
dashboard__light__1280__edit-mode.png
mobile-phones__dark__390__form.png
reports-hub__light__1366__overview.png
partner-detail__dark__1280__ledger-expanded.png
```

## شات‌های ضروری اول

1. `settings-telegram__light__1366__top.png`
2. `settings-telegram__light__1366__full.png`
3. `settings-telegram__dark__1366__top.png`
4. `settings-telegram__light__390__mobile.png`

## نکته‌ها

- قبل از گرفتن شات، zoom مرورگر روی 100% باشد.
- اگر sidebar باز/بسته روی صفحه اثر دارد، نام state را مشخص کن.
- برای جدول‌ها، یک شات با hover لازم نیست؛ فقط اگر مشکل hover دیدی بفرست.
- برای خطاهای overflow، crop نزدیک همان بخش کافی است.
