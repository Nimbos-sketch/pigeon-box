#!/usr/bin/env bash
# ngrok HTTPS tunnel — alternative to Cloudflare. Requires ngrok account + authtoken.
set -euo pipefail

PORT="${TUNNEL_PORT:-3000}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "Install ngrok: https://ngrok.com/download" >&2
  echo "Then: ngrok config add-authtoken YOUR_TOKEN" >&2
  exit 1
fi

echo "=== Pigeon Box ngrok tunnel ==="
echo "App must be running: npm run dev -- -H 0.0.0.0 -p $PORT"
echo ""
echo "Free ngrok URLs change on restart (like quick Cloudflare)."
echo "Paid ngrok plans can reserve a fixed subdomain."
echo ""
echo "When ngrok prints a URL, update .env:"
echo "  AUTH_URL=\"https://YOUR-SUBDOMAIN.ngrok-free.app\""
echo "  NEXTAUTH_URL=\"https://YOUR-SUBDOMAIN.ngrok-free.app\""
echo ""
echo "Google OAuth redirect URI:"
echo "  https://YOUR-SUBDOMAIN.ngrok-free.app/api/auth/callback/google"
echo ""

exec ngrok http "$PORT"
