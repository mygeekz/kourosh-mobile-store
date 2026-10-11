PHASE 3.5 - EXPLICIT SMS PROVIDER (TEST WORKSPACE ONLY)

Target workspace:
D:\Kourosh\Test

This patch only adds:
- scripts\configure-sms-provider-explicit.mjs
- scripts\test-sms-provider-explicit-config.mjs

It contains NO database and does not touch Astra.
Extract the ZIP directly into D:\Kourosh\Test and allow the scripts folder to merge.

Commands:
1) node scripts\test-sms-provider-explicit-config.mjs server\kourosh_inventory.db
2) node scripts\configure-sms-provider-explicit.mjs status server\kourosh_inventory.db
3) node scripts\configure-sms-provider-explicit.mjs apply server\kourosh_inventory.db --confirm=SET_SMS_PROVIDER_MELI_PAYAMAK
4) node scripts\preflight-sms-rule-production-cutover.mjs server\kourosh_inventory.db

Cutover must remain disabled while applying this setting.
