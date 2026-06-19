#!/usr/bin/env bash
set -euo pipefail

HOST="kourosh.localhost"
IP="127.0.0.1"
HOSTS="/etc/hosts"
BACKUP="/etc/hosts.kourosh-backup-$(date +%Y%m%d-%H%M%S)"

if [[ -z "$HOST" ]]; then
  echo "Invalid host name."
  exit 1
fi

if [[ ! -f "$HOSTS" ]]; then
  echo "Hosts file was not found: $HOSTS"
  exit 1
fi

echo "Kourosh Local Domain Setup - macOS"
echo "Domain: $HOST"
echo "IP: $IP"
echo

echo "Administrator password may be required to update /etc/hosts."
sudo cp "$HOSTS" "$BACKUP"
TMP_FILE="$(mktemp)"
awk -v host="$HOST" '
  BEGIN { changed = 0 }
  $0 ~ "(^|[[:space:]])" host "([[:space:]]|$)" { changed = 1; next }
  { print }
  END { }
' "$HOSTS" > "$TMP_FILE"
printf "%s %s
" "$IP" "$HOST" >> "$TMP_FILE"
sudo cp "$TMP_FILE" "$HOSTS"
rm -f "$TMP_FILE"

sudo dscacheutil -flushcache >/dev/null 2>&1 || true
sudo killall -HUP mDNSResponder >/dev/null 2>&1 || true

echo
echo "======================================"
echo "Domain configured successfully:"
echo "http://$HOST"
echo "Hosts entry:"
echo "$IP $HOST"
echo "Backup: $BACKUP"
echo "======================================"
read -r -p "Press Enter to close..." _
