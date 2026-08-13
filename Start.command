#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# macOS permission/quarantine self-heal for subsequent runs.
chmod +x "$SCRIPT_DIR"/*.command 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/start-mac.sh 2>/dev/null || true
xattr -d -r com.apple.quarantine "$SCRIPT_DIR" 2>/dev/null || true

set -e

DIR="$(cd "$(dirname "$0")" && pwd -P)"

# macOS first-run safety: keep launcher and helper scripts executable.
chmod +x "$0" "$DIR/scripts/start-mac.sh" 2>/dev/null || true

# Remove Gatekeeper quarantine from this local project copy when present.
xattr -d -r com.apple.quarantine "$DIR" 2>/dev/null || true

bash "$DIR/scripts/start-mac.sh"
