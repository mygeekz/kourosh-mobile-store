#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Fixing Kourosh macOS permissions..."

chmod +x "$SCRIPT_DIR"/*.command 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/scripts/start-mac.sh 2>/dev/null || true
xattr -d -r com.apple.quarantine "$SCRIPT_DIR" 2>/dev/null || true

echo ""
echo "Done. You can now run Setup.command or Start.command."
echo ""
read -p "Press Enter to exit..."
