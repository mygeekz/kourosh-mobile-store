#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# macOS permission/quarantine self-heal for subsequent runs.
chmod +x "$SCRIPT_DIR"/*.command 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/start-mac.sh 2>/dev/null || true
xattr -d -r com.apple.quarantine "$SCRIPT_DIR" 2>/dev/null || true

DIR="$(cd "$(dirname "$0")" && pwd -P)"
KOUROSH_USE_PORT_80=1 bash "$DIR/scripts/start-mac.sh"
