# v259 Test Summary

- `test:sms-test-recipient-allowlist-v259` — PASS
- `test:message-preview-studio-v259` — PASS
- `test:messaging-v259` — PASS
- `verify:miniapp:source` — PASS, 51/51
- changed TS/TSX syntax parse — PASS
- `verify:miniapp` — FAIL-CLOSED at environment check as expected
  - Node: 22.16.0
  - required: ^22.17.0 || >=24
  - node_modules: absent
- `build:miniapp` — not verified; `vite: not found`
