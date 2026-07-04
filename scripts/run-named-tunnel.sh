#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT/cloudflared/config.yml"

pick_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return
  fi
  if [[ -x /tmp/cloudflared ]]; then
    echo /tmp/cloudflared
    return
  fi
  echo "cloudflared not found." >&2
  exit 1
}

CF="$(pick_cloudflared)"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE — run: npm run tunnel:setup" >&2
  exit 1
fi

echo "Starting named tunnel (config: $CONFIG_FILE)"
exec "$CF" tunnel --config "$CONFIG_FILE" run
