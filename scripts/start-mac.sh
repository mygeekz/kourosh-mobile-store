#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
cd "$ROOT_DIR"

keep_terminal_open_on_error() {
  local status=$?
  if [[ $status -ne 0 && -t 0 ]]; then
    printf '\n❌ Kourosh did not start successfully. Press Enter to close this window...'
    read -r _ || true
  fi
  exit "$status"
}
trap keep_terminal_open_on_error EXIT

detect_lan_ip() {
  local ip=""

  if command -v ipconfig >/dev/null 2>&1; then
    for iface in en0 en1 en2 en3 en4 bridge0; do
      ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
      if [[ -n "$ip" && ! "$ip" =~ ^127\. && ! "$ip" =~ ^169\.254\. ]]; then
        printf '%s' "$ip"
        return 0
      fi
    done
  fi

  if command -v route >/dev/null 2>&1 && command -v ipconfig >/dev/null 2>&1; then
    local default_iface=""
    default_iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}' || true)"
    if [[ -n "$default_iface" ]]; then
      ip="$(ipconfig getifaddr "$default_iface" 2>/dev/null || true)"
      if [[ -n "$ip" && ! "$ip" =~ ^127\. && ! "$ip" =~ ^169\.254\. ]]; then
        printf '%s' "$ip"
        return 0
      fi
    fi
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    ip="$(ifconfig 2>/dev/null | awk '/inet / && $2 !~ /^127\./ && $2 !~ /^169\.254\./ {print $2; exit}' || true)"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi
  fi

  printf '127.0.0.1'
}

format_url() {
  local host="$1"
  local port="$2"
  if [[ "$port" == "80" ]]; then
    printf 'http://%s/' "$host"
  else
    printf 'http://%s:%s/' "$host" "$port"
  fi
}

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '❌ Node.js/npm was not found. Run Setup.command after installing Node.js 20 LTS or newer.\n'
  exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  printf '⚠️  node_modules was not found. Running npm install first...\n\n'
  npm install
  npm rebuild sqlite3 || true
fi

LAN_IP="${KOUROSH_PUBLIC_HOST:-$(detect_lan_ip)}"
PROXY_PORT="${KOUROSH_PROXY_PORT:-8080}"

if [[ "${KOUROSH_USE_PORT_80:-0}" == "1" ]]; then
  PROXY_PORT="80"
fi

if [[ "$PROXY_PORT" == "80" && "$(id -u)" -ne 0 ]]; then
  printf 'macOS requires administrator permission to bind port 80.\n'
  printf 'For normal launch without sudo, use Start.command.\n\n'
  exec sudo env \
    PATH="$PATH" \
    KOUROSH_USE_PORT_80=1 \
    KOUROSH_PUBLIC_HOST="$LAN_IP" \
    KOUROSH_PROXY_PORT=80 \
    bash "$SCRIPT_DIR/start-mac.sh"
fi

PUBLIC_URL="$(format_url "$LAN_IP" "$PROXY_PORT")"
LOCAL_URL="$(format_url "127.0.0.1" "$PROXY_PORT")"

export KOUROSH_DEV_PROXY=1
export VITE_DISABLE_HTTPS=1
export VITE_ENABLE_PWA_DEV=0
export KOUROSH_PROXY_HOST="0.0.0.0"
export KOUROSH_PROXY_PORT="$PROXY_PORT"
export KOUROSH_VITE_PORT="5173"
export KOUROSH_API_PORT="3001"
export KOUROSH_VITE_HOST="127.0.0.1"
export KOUROSH_API_HOST="127.0.0.1"
export PUBLIC_HOST="$LAN_IP"
export KOUROSH_LOCAL_DOMAIN="$LAN_IP"
export VITE_PUBLIC_HOST="$LAN_IP"
export VITE_PUBLIC_PORT="$PROXY_PORT"
export VITE_PUBLIC_PROTOCOL="http"
export KOUROSH_PUBLIC_URL="${PUBLIC_URL%/}"

clear || true
printf '===============================================\n'
printf ' Kourosh Local Dev Proxy - macOS\n'
printf '===============================================\n'
printf 'Proxy URL : %s\n' "$PUBLIC_URL"
printf 'Local URL : %s\n' "$LOCAL_URL"
printf 'LAN IP    : %s\n' "$LAN_IP"
printf 'Vite      : http://127.0.0.1:5173\n'
printf 'API       : http://127.0.0.1:3001\n'
printf '\n'
printf 'Starting backend + Vite + reverse proxy...\n'
printf '\n'

npm run dev:proxy
