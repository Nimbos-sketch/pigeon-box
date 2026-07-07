#!/usr/bin/env bash
# Ephemeral Cloudflare quick tunnel — URL changes every run. Auto-restarts if the process dies.
set -euo pipefail

PORT="${TUNNEL_PORT:-3000}"
LOG="${TMPDIR:-/tmp}/pigeon-quick-tunnel.log"

pick_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return
  fi
  if [[ -x /tmp/cloudflared ]]; then
    echo /tmp/cloudflared
    return
  fi
  echo "Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
}

CF="$(pick_cloudflared)"

echo "=== Pigeon Box quick tunnel (ephemeral — URL changes on restart) ==="
echo "App must be running: npm run dev -- -H 0.0.0.0 -p $PORT"
echo "Log: $LOG"
echo ""
echo "For a STABLE iPhone URL, use either:"
echo "  • npm run tunnel:setup   (Cloudflare + your own domain, free)"
echo "  • npm run tunnel:ngrok   (ngrok; paid plan for fixed URL)"
echo ""

while true; do
  rm -f "$LOG"
  echo "[$(date -Iseconds)] Starting cloudflared → http://127.0.0.1:$PORT"
  "$CF" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate 2>&1 | tee "$LOG" &
  pid=$!

  for _ in $(seq 1 30); do
    sleep 1
    url="$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
    if [[ -n "$url" ]]; then
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "  Tunnel URL: $url"
      echo "  Update .env:"
      echo "    AUTH_URL=\"$url\""
      echo "    NEXTAUTH_URL=\"$url\""
      echo "  Google OAuth redirect URI:"
      echo "    $url/api/auth/callback/google"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      break
    fi
  done

  wait "$pid" || true
  echo "[$(date -Iseconds)] Tunnel stopped — restarting in 5s (new URL). Ctrl+C to quit."
  sleep 5
done
