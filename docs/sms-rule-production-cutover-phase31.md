# Phase 3.1 — Production Rule 6 Controlled Cutover

Scope: only reminder rule **ID 6** (`INSTALLMENT_DUE`, due today). Rules 4, 5, 7, 8 and 9 remain outside live cutover.

## Safety contract

- Approved provider: `meli_payamak`
- Approved BodyId: `423847`
- Approved token order: `name -> amount -> dueDate`
- Cutover origin: `notification_rule_cutover_v1`
- Kill switch defaults OFF.
- Provider boundary re-checks the kill switch after enqueue and before provider invocation.
- Legacy same-day SMS handoff occurs only while Rule 6 gate is armed; Telegram behavior is unchanged.

## Production procedure

Do not start the application against a copied/test database. Run these commands against the actual production database path only when intentionally preparing production.

1. **Read-only preflight**

```cmd
node scripts\preflight-sms-rule-production-cutover.mjs server\kourosh_inventory.db
```

Required: `readyForArm: true`. Review warnings. Existing non-cutover SMS backlog is reported, not silently ignored.

2. **Candidate dry run**

```cmd
node scripts\run-installment-sms-candidate-dry-run.mjs server\kourosh_inventory.db
```

Required safety fields: providerCalls=0, outboxWrites=0, smsSent=false, outboxMutated=false.

3. **Verified backup**

```cmd
node scripts\backup-sms-rule-cutover-db.mjs server\kourosh_inventory.db
```

Keep the printed backup path, SHA-256 and manifest. Backup integrity and foreign keys must pass.

4. **Confirm OFF before arming**

```cmd
node scripts\configure-sms-rule-cutover.mjs status server\kourosh_inventory.db
```

Required before activation: `enabled: false` and only rule ID 6 allowed.

5. **Arm Rule 6 only**

```cmd
node scripts\configure-sms-rule-cutover.mjs enable-rule6 server\kourosh_inventory.db --confirm=RULE6_DUE_TODAY
```

Immediately verify:

```cmd
node scripts\configure-sms-rule-cutover.mjs status server\kourosh_inventory.db
```

Expected: `enabled: true`, `phase: rule6_due_today`, `allowedRuleIds: [6]`.

6. **Monitor without exposing recipients**

```cmd
node scripts\monitor-sms-rule-cutover.mjs server\kourosh_inventory.db --since-minutes=120
```

The monitor prints aggregate outbox state and failure reasons only. It does not print recipient numbers or credentials.

## Emergency kill switch

At any sign of incorrect recipient selection, template mismatch, provider error burst, duplicate behavior, or unexpected Rule IDs:

```cmd
node scripts\configure-sms-rule-cutover.mjs disable server\kourosh_inventory.db
```

Then verify:

```cmd
node scripts\configure-sms-rule-cutover.mjs status server\kourosh_inventory.db
```

Expected: `enabled: false`, `phase: null`. Already queued cutover rows are blocked again at the provider boundary when the kill switch is OFF.

## Out of scope

Do not enable Rules 4, 5, 7, 8 or 9 in this phase. Do not create CHECK_DUE SMS rules. Do not alter Telegram rules, accounting data, installment amounts or due dates as part of cutover.
