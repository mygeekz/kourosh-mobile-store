# Feature Access Policy

Generated in Phase 16 to make feature availability auditable across routes and navigation.

## Source of truth

- Route feature gates: `app/routes/routeAccessMatrix.ts`
- Navigation feature metadata: `utils/featureFlags.ts` / `FEATURE_FLAGS.navIds`
- Fallback module metadata: `utils/featureFlags.ts` / `FEATURE_FLAGS.routes`

## Summary

- Feature definitions: 24
- Feature flags used by route matrix: 9
- Policy records: 24

## Policy table

| Feature | Title | Scope | Parent | Matrix routes | Nav ids | Sources |
|---|---|---:|---|---:|---:|---|
| `advanced_reports` | گزارش‌های پیشرفته | module | — | 36 | 1 | route-access-matrix, feature-definition |
| `ai_pricing` | هوش قیمت‌گذاری | module | — | 0 | 1 | feature-definition |
| `audit_log` | گزارش فعالیت‌ها | module | — | 1 | 1 | route-access-matrix, feature-definition |
| `cash_sales` | فروش نقدی | module | — | 5 | 3 | route-access-matrix, feature-definition |
| `dashboard_clock_widget` | ساعت داشبورد | feature | `dashboard_experience` | 0 | 0 | feature-definition |
| `dashboard_experience` | داشبورد و تجربه روزانه | module | — | 0 | 0 | feature-definition |
| `installments` | فروش اقساطی و چک | module | — | 6 | 3 | route-access-matrix, feature-definition |
| `local_domain_pwa` | دامنه محلی و PWA | module | — | 0 | 0 | feature-definition |
| `mobile_phones` | انبار تخصصی گوشی | module | — | 4 | 4 | route-access-matrix, feature-definition |
| `notifications_outbox` | اعلان‌ها و صف ارسال | module | — | 2 | 3 | route-access-matrix, feature-definition |
| `people_crm` | مشتریان و همکاران | module | — | 0 | 3 | feature-definition |
| `phone_ai_price_signal` | AI Price Signal در ثبت گوشی | feature | `ai_pricing` | 0 | 0 | feature-definition |
| `phone_ai_pricing_settings` | تنظیمات هوش قیمت‌گذاری داخل ثبت گوشی | feature | `ai_pricing` | 0 | 0 | feature-definition |
| `phone_ai_strategy_advisor` | AI Strategy Advisor ثبت گوشی | feature | `ai_pricing` | 0 | 0 | feature-definition |
| `phone_inventory_drilldown` | درایلدان عملیاتی انبار گوشی | feature | `mobile_phones` | 0 | 0 | feature-definition |
| `phone_pricing_behavior_learning` | یادگیری رفتار قیمت‌گذاری گوشی | feature | `ai_pricing` | 0 | 0 | feature-definition |
| `phone_smart_warnings` | هشدارهای هوشمند ثبت گوشی | feature | `mobile_phones` | 0 | 0 | feature-definition |
| `products_inventory` | کالا و موجودی | module | — | 0 | 2 | feature-definition |
| `purchases_stock_counts` | خرید و انبارگردانی | module | — | 3 | 3 | route-access-matrix, feature-definition |
| `repairs_services` | تعمیرات و خدمات | module | — | 5 | 3 | route-access-matrix, feature-definition |
| `settings_ai_control_panel` | کنترل‌پنل هوشمندسازی در تنظیمات | feature | `smart_insights` | 0 | 0 | feature-definition |
| `smart_insights` | مغز هوشمند فروشگاه | module | — | 5 | 5 | route-access-matrix, feature-definition |
| `sms` | پیامک | module | — | 0 | 0 | feature-definition |
| `telegram` | تلگرام | module | — | 0 | 0 | feature-definition |

## Validation

Run:

```bash
npm run audit:features
```

This verifies that route manifest gates, route matrix flags, and navigation feature keys all reference defined feature flags.
