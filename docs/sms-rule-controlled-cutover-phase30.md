# SMS Rule Controlled Cutover — Phase 3.0 Outbox Boundary Test

This phase does **not** enable production sending.

It adds `scripts/test-sms-rule-cutover-outbox-e2e.mjs`, which:

1. Copies the supplied database to `reports/sms-cutover-outbox-e2e.db`.
2. Arms Rule 6 only on the copy.
3. Inserts one synthetic Rule-6 cutover SMS row into the real `notification_outbox` schema.
4. Turns the kill switch off on the copy before worker/provider processing.
5. Applies the same `evaluateSmsRuleCutoverWorkerGate` used by production.
6. Verifies the row is quarantined as `CUTOVER_GUARD_BLOCKED:KILL_SWITCH_OFF`.
7. Verifies provider call count remains zero.
8. Verifies the source database SHA-256 is byte-identical before and after.
9. Source-scans `notificationOutboxRuntime.ts` to assert the worker and direct SMS cutover guards appear before provider dispatch.

No provider network call is made by the test.

Run:

```cmd
node scripts\test-sms-rule-cutover-outbox-e2e.mjs server\kourosh_inventory.db
```

The script mutates only its disposable database copy under `reports/`.
