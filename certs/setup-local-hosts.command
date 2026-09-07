#!/usr/bin/env bash
set -euo pipefail

PRIMARY_HOST="kourosh.home.arpa"
SHORT_HOST="kourosh.home.arpa"
IP="192.168.1.110"
HOSTS="/etc/hosts"
BACKUP="/etc/hosts.kourosh-backup-$(date +%Y%m%d-%H%M%S)"

if [[ -z "$PRIMARY_HOST" ]]; then
  echo "Invalid host name."
  exit 1
fi

if [[ ! -f "$HOSTS" ]]; then
  echo "Hosts file was not found: $HOSTS"
  exit 1
fi

echo "Kourosh Local Domain Setup - macOS"
echo "Primary domain: $PRIMARY_HOST"
echo "Shortcut: $SHORT_HOST"
echo "IP: $IP"
echo

echo "Administrator password may be required to update /etc/hosts."
sudo cp "$HOSTS" "$BACKUP"
TMP_FILE="$(mktemp)"
awk -v host1="kourosh.home.arpa" '
  $0 ~ "(^|[[:space:]])" host1 "([[:space:]]|$)" { next }
  { print }
' "$HOSTS" > "$TMP_FILE"
printf "%s %s\n" "$IP" "kourosh.home.arpa" >> "$TMP_FILE"
sudo cp "$TMP_FILE" "$HOSTS"
rm -f "$TMP_FILE"

sudo dscacheutil -flushcache >/dev/null 2>&1 || true
sudo killall -HUP mDNSResponder >/dev/null 2>&1 || true

echo
echo "======================================"
echo "Local domains configured successfully:"
echo "Shortcut: http://$SHORT_HOST"
echo "Target:   https://$PRIMARY_HOST:5173/#/"
echo "Hosts entry:"
echo "192.168.1.110 kourosh.home.arpa"
echo "Backup: $BACKUP"
echo "======================================"
read -r -p "Press Enter to close..." _
