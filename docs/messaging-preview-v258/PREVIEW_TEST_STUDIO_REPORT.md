# Kourosh Store Management v258 — Messaging Preview/Test Studio

## Scope

v258 is a focused Settings UX hardening release. It does not change SMS provider delivery contracts, Telegram authorization, message catalog semantics, BodyId storage, Snapshot/Identity logic, or financial business logic.

## SMS

- Replaced the two runtime modals (preview vs test-send) with one `SmsPatternStudioModal`.
- Existing Settings buttons are preserved, but they open the same Studio on the appropriate tab.
- Preview and test-send share one token-value state, so operators do not re-enter values.
- Added explicit stages: `Preview + variables` and `Validation + test send`.
- Added BodyId, Iranian mobile-number, and required-token validation before test send.
- Corrected copy:
  - `پیش‌نمایش پیش‌نمایش پیام` -> `پیش‌نمایش پیام`.
  - Clarified that the provider owns the actual pattern text and the local template is only for token/order preview.
- Pattern state resets when pattern identity changes, preventing values from the previous pattern leaking into the next modal.
- Telegram OTP SMS check now has a local preview template (`کد تأیید اتصال تلگرام: {1}`).

## Telegram

- Kept the single Telegram modal and redesigned it as a staged Studio.
- Added explicit Preview -> Validation -> Test Send flow.
- Clarified that selecting a Customer/Partner/Manager only populates preview sample data; it is not the test-send recipient.
- Clarified that `/api/telegram/check-message` sends to the configured Telegram test/management Chat ID.
- Reset format, values, selected recipient, raw-preview toggle, result, and active tab whenever the template identity changes.
- Selecting a different preview recipient now replaces sample data instead of merging stale values from the previous recipient/template.
- Unknown placeholders or missing values block test send until corrected.
- Existing Text/Markdown/HTML preview is preserved.

## UI / Accessibility

- New/refactored fields use canonical `TextField` primitives from `@/components/ui`.
- No new native `<input>` controls were introduced in the Studio components.
- Tabs expose `role="tab"`, `aria-selected`, and `aria-controls`.
- Send results use `aria-live="polite"`.
- Mixed Persian/LTR values preserve explicit direction where needed.

## Release Quality

- `KOUROSH_SOURCE_VERSION`, MiniApp HTML release marker, and Cloudflare Edge release marker are synchronized to `v258`.
- `test:message-preview-studio-v258` is a release-blocking Source Gate contract.
- Source Gate: 50/50 PASS.
- Settings import/export audit: PASS.
- Settings canonical form primitive audit: PASS (0 native controls in guarded Settings/Inventory files).
- TypeScript syntax/transpile audit for modified UI files: PASS.

## Environment limitation

Full Production Gate remains fail-closed in this execution environment because:

- Node is `22.16.0` while the project requires `^22.17.0 || >=24`.
- project dependencies are not installed.
- `build:miniapp` reaches release sync then stops at `vite: not found`.

No production-build PASS is claimed.
