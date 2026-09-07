# v260 — Root Form Field Fix

Date: 2026-08-29

## Problem

Persian values inside inputs/selects were vertically clipped in multiple app surfaces. The supplied Settings screenshots showed the issue clearly in SMS automation selects and provider credential fields.

## Verified root cause

The field geometry contract was fragmented:

1. `pages/settings/SettingsController.tsx` supplied a shared class with `min-h-[48px]` plus `py-3`.
2. `SettingsSmsPanel.tsx` then forced some controls to `h-10 !min-h-10`.
3. `styles/components/select-field.css` and `search-field.css` used fixed 40/44/48px heights and line-height equal to the whole control height.
4. Design-system tokens separately defined sm/md/lg control heights (40/46/52px, with responsive overrides).

A fixed 40px box combined with 24px vertical utility padding left insufficient content space for Persian font glyphs. Browser/native select rendering made the clipping especially visible.

## Fix

### Canonical density

`TextField`, `SelectField`, and `AppSearchField` now expose/instrument a single `sm | md | lg` size contract using `data-ui-control-size`.

### Final vertical metrics foundation

Added:

`styles/system/form-field-vertical-metrics-foundation.css`

It is registered in the style manifest and generated as the final desktop app style import. For canonical single-line controls it owns:

- `height: auto`
- token-based `min-height`
- safe `padding-block`
- readable `line-height`
- `box-sizing: border-box`

It excludes textareas and file inputs. A scoped compatibility bridge covers known legacy app control classes (`app-input`, `ux-input`, `app-select`, etc.) without globally restyling every native input in specialized widgets.

### Select/Search foundation

Removed fixed heights from sm/md/lg select and search blocks. They now use design-token minimum heights and relative line-height so controls can grow when font/zoom requires it.

### Settings SMS

- Removed vertical height/padding ownership from the shared Settings `inputClass`.
- BodyId uses `TextField controlSize="sm"`.
- Provider select uses canonical styled `SelectField size="md"`.
- Automation selects use canonical styled `SelectField size="sm"`.
- Removed forced `h-10` / `min-h-10` overrides.

### Other known fixed SelectField call-sites

Removed page-owned `h-11` from:

- Partner performance settlement destination.
- Mobile phones edit status.

### Test drift cleanup

The pre-existing `audit-select-foundation-completion.mjs` already failed on pristine v259 because it assumed all 35 migrated SelectFields must remain `unstyled`. Current architecture intentionally contains both feature-owned compatibility SelectFields and centrally styled SelectFields. The audit now validates the actual contract: one native select renderer, canonical imports, and support for both valid modes.

## Safety / non-goals

No business logic, finance logic, persistence schema, SMS send logic, Telegram identity, snapshot logic, or authorization logic changed.

This root pass does **not** globally style every raw native input in the DOM. Specialized checkbox/range/file/custom widgets keep their own geometry. Standardized app fields are protected through canonical instrumentation and known app control classes.

## Automated acceptance

- v260 root field audit
- Settings/Inventory canonical primitive audit
- Select foundation audit
- Dialog form primitive audit
- Style manifest audit
- Complete v260 source release gate
- TypeScript syntax parsing for changed TS/TSX files

## Physical/browser acceptance still required

Because the provided archive has no `node_modules`, production Vite/browser rendering cannot be executed in this environment. Before production sign-off verify:

- Settings → SMS at desktop width: no clipped Persian values.
- Representative forms at mobile width: no clipped values.
- Browser zoom 200%: controls grow/reflow without clipping.
