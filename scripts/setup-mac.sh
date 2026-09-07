#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
cd "$ROOT_DIR"

printf '\n=========================================\n'
printf ' Kourosh Local PWA - macOS Setup\n'
printf ' Exact locked dependencies with reviewed install scripts\n'
printf '=========================================\n\n'

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf '⚠️  This setup script is optimized for macOS, but will continue on this system.\n\n'
fi

if ! command -v node >/dev/null 2>&1; then
  printf '❌ Node.js was not found. Install Node.js 22.17.0 or newer, then run this file again.\n'
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '❌ npm was not found. Install Node.js 22.17.0 or newer, then run this file again.\n'
  exit 1
fi

printf '[1/7] Verifying Node, npm, package-lock and install-script policy...\n'
node scripts/verify-install-environment.mjs

printf '\n[2/7] Synchronizing reviewed ExcelJS, Router, PWA, Recharts, source-map and isolated glob dependencies...\n'
node scripts/prepare-reviewed-dependency-chain.mjs

printf '\n[3/7] Installing exact dependencies from package-lock.json...\n'
npm ci --no-fund

printf '\n[4/7] Verifying ExcelJS XLSX, CSV, ZIP and archiver glob compatibility...\n'
node scripts/test-exceljs-compatibility.mjs

printf '\n[5/7] Verifying Router, PWA, Recharts, source-map and isolated glob package compatibility...\n'
node scripts/audit-recharts-v3-migration.mjs
node scripts/test-reviewed-package-compatibility.mjs
node scripts/audit-https-dev-origin.mjs
node scripts/audit-local-certificate-runtime.mjs
node scripts/audit-database-restore-lifecycle.mjs

printf '\n[6/7] Verifying production build with reviewed Router, PWA, Recharts, source-map and isolated glob packages...\n'
node scripts/run-production-build-strict.mjs

printf '\n[7/7] Verifying native SQLite binding...\n'
node -e "require('sqlite3'); console.log('[setup] sqlite3 native binding OK')"

chmod +x "$ROOT_DIR/Start.command" "$ROOT_DIR/Start-Port80.command" "$ROOT_DIR/Setup.command" "$SCRIPT_DIR/start-mac.sh" "$SCRIPT_DIR/setup-mac.sh" 2>/dev/null || true

printf '\n✅ Setup complete.\n'
printf 'Run Start.command for normal macOS launch.\n'
printf 'Use Start-Port80.command only if you specifically need http://IP/ without :8080.\n\n'
