# Stage 42 — Settings Telegram props type narrowing

## Goal

Reduce the unsafe `Record<string, any>` contract used by `SettingsTelegramPanelProps` without changing JSX, state ownership, handlers, CSS, or UI/UX behavior.

## What changed

- Replaced `SettingsTelegramPanelProps = Record<string, any>` with an explicit prop contract in:

```txt
pages/settings/settingsPanelTypes.ts
```

- Added Telegram-specific lightweight domain types:

```txt
TelegramAudience
TelegramTemplateFilter
TelegramStudioMode
TelegramConnectionMode
TelegramCheckItem
TelegramStatusMeta
TelegramTemplateDef
TelegramTodoItem
TelegramRecentChat
TelegramDiagnosticsState
```

- Added an explicit type import in:

```txt
pages/settings/SettingsTelegramPanel.tsx
```

## Safety strategy

This stage intentionally keeps the actual Telegram JSX and runtime logic unchanged. The new type contract is broad enough for the current implementation but no longer hides the entire panel behind `Record<string, any>`.

The contract types are split into safer groups:

- primitive values: `string`, `boolean`, `number`
- structured collections: arrays and records
- React-rendered values: `React.ReactNode`
- obvious handlers: function contracts
- parent-owned setters: React dispatch/function contracts

## Not changed

- No JSX changed.
- No className changed.
- No CSS changed.
- No Telegram field behavior changed.
- No settings state ownership changed.
- No Vite launcher or PostCSS filter changed.

## Remaining technical debt

Some Telegram domain values are still intentionally typed with `any` inside lightweight structures, because the Telegram setup/template/log data model is wide and should be narrowed gradually after runtime QA.

Recommended next step: narrow Telegram template, setup checklist, todo summary, diagnostics and health model types based on their actual builders in `Settings.tsx`.
