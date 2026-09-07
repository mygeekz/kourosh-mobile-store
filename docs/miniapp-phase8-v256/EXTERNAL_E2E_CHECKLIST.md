# v256 External E2E / Production Sign-off

Use four aliases only; do not put Telegram IDs, tokens, initData, private keys or financial data in the evidence file.

- A = Staff/Admin
- B = existing Partner
- C = newly linked Partner
- D = Customer

## 1. Supported Windows environment

Run from the project root:

```bat
node -v
npm -v
npm run verify:miniapp
npm run test:windows-miniapp-tunnel-v162
npm run test:windows-miniapp-startup-order-v163
```

`verify:miniapp` must finish PASS before deployment.

## 2. Deploy v256

```bat
npx wrangler pages deploy dist-miniapp --project-name kourosh
```

Confirm the deployed MiniApp/Edge returns release `v256`.

## 3. Account/device matrix

### D — Customer

- Android Telegram, local server ON: opens successfully; connection is Live.
- Stop local origin: MiniApp remains usable from Snapshot and says live connection is unavailable.
- Start local origin: refresh/focus returns to Live without reopening/relinking.

### B — Existing Partner

- Android Telegram, local server ON: Live.
- Stop local origin: own Partner Snapshot is shown.
- Restart local origin: returns to Live.

### C — Newly linked Partner

- Link Telegram identity from the admin panel.
- Open MiniApp immediately from that Telegram account.
- Temporary sync state may appear, but it must recover automatically.
- It must not remain stuck on generic Offline.
- Diagnostic Center must show the identity/snapshot/Edge chain correctly.

### A — Staff/Admin

- Local origin ON: Staff MiniApp works Live.
- Local origin OFF: Staff access must be rejected with the live-only message; no Staff Snapshot is allowed.
- Restart local origin: Staff access returns Live.

## 4. Identity revoke/relink

- Unlink a test Customer/Partner identity: offline access must be revoked.
- Relink to the intended new Telegram account: the new account must recover after sync; the old identity must not retain access.

## 5. Telegram clients

At minimum verify:

- Android Telegram
- iOS Telegram
- Telegram Desktop

Also observe:

- safe-area/header/bottom dock
- BackButton
- zoom/accessibility behavior where applicable
- no startup fullscreen jump

## 6. Diagnostic Center

For at least B and C:

- DB binding correct
- Local Snapshot present/current
- Cloud Sync state correct
- Edge diagnostic probe correct
- Live Origin state reflects ON/OFF
- Correlation ID can be copied

## 7. Record local evidence

Copy:

```bat
copy config\quality\miniapp-rc-evidence-v256.example.json config\quality\miniapp-rc-evidence-v256.json
```

Fill only descriptive evidence and PASS statuses after actually performing each check. The real evidence file is intentionally gitignored.

Then run:

```bat
npm run verify:miniapp:rc:evidence-v256
```

For final sign-off:

```bat
npm run verify:miniapp:rc
```

Only a PASS from that final command qualifies v256 for Production RC sign-off.
