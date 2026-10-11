# Phase 3.3 — Legacy SMS outbox quarantine

Purpose: prevent old pending/stale SMS rows from being delivered during Rule 6 controlled cutover.

Safety properties:
- preview is read-only by default;
- apply requires both a verified backup matching the current DB SHA-256 and explicit confirmation;
- cutover must be disabled;
- no rows are deleted;
- future pending rows are not selected;
- cutover-v1 rows are excluded;
- selected rows become `failed`, `attempts=maxAttempts`, `nextAttemptAt=NULL`, `lastError=QUARANTINED_LEGACY_SMS_BACKLOG:PHASE33`;
- original status/attempt/error/timestamps are stored in a local JSON quarantine manifest without recipient or payload data;
- no provider code is imported or called.

Preview:
`node scripts/quarantine-legacy-sms-outbox.mjs server/kourosh_inventory.db`

Apply only after a fresh matching backup and while the production app/outbox worker is stopped:
`node scripts/quarantine-legacy-sms-outbox.mjs server/kourosh_inventory.db --apply --confirm=QUARANTINE_LEGACY_SMS_BACKLOG`

After apply, rerun backlog audit and production preflight. Do not arm Rule 6 unless preflight says `readyForArm: true`.
