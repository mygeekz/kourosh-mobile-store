# SMS Rule Production Preflight — Phase 3.2

Phase 3.2 keeps Rule 6 cutover OFF and adds two safety improvements:

1. `backup-sms-rule-cutover-db.mjs` now uses `fileURLToPath(import.meta.url)` so Windows drive-letter paths are resolved correctly. The prior implementation could produce paths such as `D:\\D:\\...`.
2. `audit-sms-outbox-backlog.mjs` provides a read-only backlog audit without printing recipients or credentials.
3. Production preflight now blocks arming when legacy SMS rows are already due in `pending` or are stale in `processing` (>30 minutes). Existing backlog must be understood before introducing Rule 6 traffic.

No script in this phase enables cutover or sends SMS.
