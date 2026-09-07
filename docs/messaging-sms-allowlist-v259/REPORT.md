# v259 — SMS Test Recipient Allowlist & Safe Test Send

## Goal
Prevent accidental SMS Pattern tests from being sent to arbitrary or real customer numbers.

## Architecture
The allowlist is stored as a JSON-encoded generic setting:

`sms_test_recipient_allowlist_json`

Canonical parser/normalizer/authorization logic:

`shared/smsTestRecipients.ts`

This is intentionally separate from `shared/messages.ts`: `messages.ts` remains the source of truth for transactional message/template content, while the new module owns test-recipient safety policy.

## UI
Location:

`Settings → SMS → شماره‌های مجاز ارسال تست`

Admin can:
- add label + phone
- enable/disable a test number
- remove a number
- save through the existing Settings save flow

Both single Pattern Studio and Bulk Test fetch active saved recipients from:

`GET /api/sms/test-recipients`

and use a select-only destination.

## Server enforcement
`POST /api/sms/check-pattern` and `POST /api/sms/bulk-check` both call the same pure authorization policy.

Failure codes:
- `SMS_TEST_RECIPIENT_INVALID` → 400
- `SMS_TEST_RECIPIENT_NOT_ALLOWED` → 403
- `SMS_TEST_ALLOWLIST_EMPTY` → 409

No UI bypass can send a test Pattern to a number that is not active in the persisted allowlist.

## Settings validation
`POST /api/settings` remains Admin-only and validates/sanitizes the allowlist before persistence. Invalid, duplicate, malformed, or over-limit rows are rejected instead of silently persisted.

## Permissions
- Allowlist management: Admin only (existing `/api/settings` authorization).
- Test endpoints: Admin + Manager, but only to persisted active allowlist numbers.

## Provider limitation
MeliPayamak Pattern text is provider-owned and fixed. Kourosh therefore does not fake a `[TEST]` prefix by altering Pattern tokens. The UI explains this limitation. Safety is achieved by destination restriction.

## Release evidence additions
v259 RC evidence now requires:
- a real successful test send to an allowed number
- a real rejected attempt to a non-allowlisted number

## Verification
- Dedicated allowlist test: PASS
- Message Studio regression: PASS
- Messaging catalog regression: PASS
- v259 Source Gate: 51/51 PASS
- TypeScript syntax parse of changed TS/TSX files: PASS
- Full Gate: correctly FAIL-CLOSED at environment check (`Node 22.16.0`, dependencies absent)
- Production Vite build: not claimed; `vite` is unavailable in this delivery runtime
