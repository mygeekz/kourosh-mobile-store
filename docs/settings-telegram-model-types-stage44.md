# Stage 44 — Settings Telegram model type cleanup

## هدف
این مرحله ادامه‌ی cleanup معماری Settings است و فقط typeهای مربوط به پنل Telegram را دقیق‌تر می‌کند. JSX، handlerها، state ownership، CSS و UI/UX تغییر نکرده‌اند.

## تغییرات اصلی
- `SettingsTelegramPanelProps` در `pages/settings/settingsPanelTypes.ts` از حالت propهای نیمه‌عمومی‌تر به contract دقیق‌تر تبدیل شد.
- typeهای مدل تلگرام اضافه/تقویت شدند:
  - `TelegramTemplateVariable`
  - `TelegramAudienceStatus`
  - `TelegramItemStatus`
  - `TelegramCategoryStatus`
  - `TelegramPriorityMeta`
  - `TelegramProgressTone`
  - `TelegramFieldInsight`
  - `TelegramFieldInsights`
  - `TelegramAudienceMeta`
  - `TelegramCategoryMeta`
  - `TelegramTemplateDef`
  - `TelegramTodoEntry`
  - `TelegramTodoSummary`
  - `TelegramGlobalSummary`
  - `TelegramSmartAction`
  - `TelegramHealthState`
  - `TelegramDiagnosticsState`
  - `TelegramGroupedTemplateDefs`
- type محلی تکراری `TelegramAudience` از `SettingsTelegramPanel.tsx` حذف شد و از `settingsPanelTypes.ts` import شد.
- امضاهای تابعی واضح‌تر شدند، مخصوصاً:
  - `openSmsPatternCheck`
  - `openTelegramTemplateCheck`
  - `getTelegramItemStatus`
  - `getTelegramCategoryStatus`
  - `getTelegramProgressTone`
  - `getTelegramPriorityMeta`
  - `getTelegramTodoNextStep`

## نکات ایمنی
- هیچ JSX تغییر نکرد.
- هیچ CSS یا className تغییر نکرد.
- هیچ logic runtime تغییر نکرد.
- import فیکس‌شده ویندوزی Stage 43 حفظ شد: `from './settings/index'`.
- فیکس‌های Vite launcher و PostCSS warning filter دست‌نخورده ماندند.

## Validation
- balance check برای `Settings.tsx`، `SettingsTelegramPanel.tsx` و `settingsPanelTypes.ts` پاس شد.
- local import check برای فایل‌های Settings پاس شد؛ import گمشده وجود ندارد.
- import مبهم `from './settings'` داخل `pages/Settings.tsx` وجود ندارد.
- `node --check` برای `scripts/vite-dev.cjs` و `scripts/postcss-warning-filter.cjs` پاس شد.
