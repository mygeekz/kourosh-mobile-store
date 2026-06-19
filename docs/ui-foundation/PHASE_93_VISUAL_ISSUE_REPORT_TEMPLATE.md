# Phase 93 — Visual Issue Report Template

وقتی اسکرین‌شات می‌فرستی، اگر خواستی دقیق‌تر گزارش بدهی، از این قالب استفاده کن.

```txt
Screen: Settings > Telegram
Theme: Light
Width: 1366px
State: top / full / modal open / accordion open
Problem: متن زیر آیکون رفته / فاصله زیاد است / رنگ کم‌کنتراست است / جدول overflow دارد
Expected: متن باید در یک خط باشد / کارت باید فشرده‌تر شود / actionها باید پایین کارت align شوند
Screenshot: <file>
Priority: P0 / P1 / P2
```

## سطح‌بندی اولویت

| Priority | Meaning |
|---|---|
| P0 | شکست واضح UI، overflow شدید، متن ناخوانا، صفحه غیرقابل استفاده |
| P1 | مشکل قابل مشاهده در صفحه مهم، اما مانع کار نیست |
| P2 | polish کوچک، spacing، رنگ، copy، hover |

## معیار فیکس

هر فیکس تصویری باید:

- Scoped باشد.
- منطق برنامه را تغییر ندهد.
- روی dark/light تست شود.
- روی ۱۳۶۶ و ۱۲۸۰ تست شود.
- اگر مربوط به RTL/LTR است، IMEI/Chat ID/شماره موبایل را خراب نکند.
