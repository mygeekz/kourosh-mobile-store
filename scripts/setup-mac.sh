#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
cd "$ROOT_DIR"

printf '\n=========================================\n'
printf ' Kourosh Local PWA - macOS Setup\n'
printf ' Internet is needed only for npm install\n'
printf '=========================================\n\n'

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf '⚠️  This setup script is optimized for macOS, but will continue on this system.\n\n'
fi

if ! command -v node >/dev/null 2>&1; then
  printf '❌ Node.js was not found. Install Node.js 20 LTS or newer, then run this file again.\n'
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '❌ npm was not found. Install Node.js 20 LTS or newer, then run this file again.\n'
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  printf '⚠️  Current Node version: '
  node -v
  printf '   Recommended version: Node.js 20 LTS or newer.\n\n'
fi

printf '[1/3] Making macOS launcher files executable...\n'
chmod +x "$ROOT_DIR/Start.command" "$ROOT_DIR/Start-Port80.command" "$ROOT_DIR/Setup.command" "$SCRIPT_DIR/start-mac.sh" "$SCRIPT_DIR/setup-mac.sh" 2>/dev/null || true

printf '[2/3] Installing dependencies...\n'
npm install

printf '\n[3/3] Rebuilding native dependencies for macOS, if needed...\n'
npm rebuild sqlite3 || true

printf '\n✅ Setup complete.\n'
printf 'Run Start.command for normal macOS launch.\n'
printf 'Use Start-Port80.command only if you specifically need http://IP/ without :8080.\n\n'
