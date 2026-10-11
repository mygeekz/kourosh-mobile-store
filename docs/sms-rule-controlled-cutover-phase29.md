# SMS Rule Controlled Cutover — Phase 2.9

Status: **READY IN CODE, DEFAULT OFF**

This phase does not enable live SMS by default and does not change production settings.
Only Rule **6** (installment due today) is eligible when explicitly armed.
Rules 4, 5, 7, 8 and 9 remain outside the cutover allowlist.

## Provider contract pinned for phase 2.9

- Provider: MeliPayamak
- BodyId: `423847`
- Template: `installment_due_notice`
- Token order: `name`, `amount`, `dueDate`

The pin is intentional. If the configured BodyId changes, the scheduler and provider-boundary guard fail closed.

## Kill switch

Settings used:

- `notification_sms_rule_cutover_enabled`
- `notification_sms_rule_cutover_phase`

Required armed values:

- enabled = `1`
- phase = `rule6_due_today`

Absent or disabled settings mean no rule-driven SMS enqueue.

## Safety boundaries

1. The scheduler gate requires the exact Rule 6 shape and current readiness.
2. The new evaluator decision must match before enqueue.
3. Existing SMS daily/pending caps are checked before enqueue.
4. The outbox is used; there is no direct scheduler-to-provider send.
5. Same-day legacy SMS is suppressed only while the cutover gate is armed; Telegram remains unchanged.
6. A queued cutover row is checked again by the outbox worker.
7. A second guard runs immediately before the provider call.
8. Turning the kill switch off blocks/quarantines pending cutover rows before provider delivery.

## Read-only status

```cmd
node scripts\configure-sms-rule-cutover.mjs status server\kourosh_inventory.db
```

## Tests

```cmd
node scripts\test-sms-provider-contract.mjs
node scripts\test-sms-rule-controlled-cutover.mjs
node scripts\test-messaging-templates-v257.mjs
node scripts\test-messaging-templates-v258.mjs
node scripts\test-messaging-templates-v259.mjs
node scripts\run-installment-sms-candidate-dry-run.mjs server\kourosh_inventory.db
```

## Explicit enable command — do not run until live cutover is approved

```cmd
node scripts\configure-sms-rule-cutover.mjs enable-rule6 server\kourosh_inventory.db --confirm=RULE6_DUE_TODAY
```

The command refuses to enable unless provider, approved BodyId, account configuration, global installment SMS mode and Rule 6 shape all pass preflight.

## Emergency disable

```cmd
node scripts\configure-sms-rule-cutover.mjs disable server\kourosh_inventory.db
```

No migration is required for rollback. The master flag is fail-closed when absent or disabled.
