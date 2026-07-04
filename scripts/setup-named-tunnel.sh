#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
CONFIG_DIR="$ROOT/cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"
CREDENTIALS_DIR="${CLOUDFLARED_CREDENTIALS_DIR:-$HOME/.cloudflared}"

pick_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return
  fi
  if [[ -x /tmp/cloudflared ]]; then
    echo /tmp/cloudflared
    return
  fi
  echo "cloudflared not found. Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
}

CF="$(pick_cloudflared)"

echo "=== Pigeon Box — named Cloudflare tunnel setup ==="
echo ""
echo "You need:"
echo "  1. A free Cloudflare account"
echo "  2. A domain added to Cloudflare (DNS managed by Cloudflare)"
echo "  3. A subdomain for this app, e.g. pigeon.yourdomain.com"
echo ""

read -r -p "Enter your stable hostname (e.g. pigeon.yourdomain.com): " HOSTNAME
if [[ -z "$HOSTNAME" ]]; then
  echo "Hostname is required." >&2
  exit 1
fi

read -r -p "Tunnel name [pigeon-box]: " TUNNEL_NAME
TUNNEL_NAME="${TUNNEL_NAME:-pigeon-box}"

if [[ ! -f "$CREDENTIALS_DIR/cert.pem" ]]; then
  echo ""
  echo "Step 1 — Log in to Cloudflare (opens browser):"
  echo "  $CF tunnel login"
  echo ""
  read -r -p "Press Enter to run cloudflared tunnel login..."
  "$CF" tunnel login
fi

echo ""
echo "Step 2 — Create tunnel '$TUNNEL_NAME' (skip if it already exists):"
if "$CF" tunnel list 2>/dev/null | rg -q "$TUNNEL_NAME"; then
  echo "  Tunnel '$TUNNEL_NAME' already exists."
else
  "$CF" tunnel create "$TUNNEL_NAME"
fi

TUNNEL_ID="$("$CF" tunnel list 2>/dev/null | awk -v name="$TUNNEL_NAME" '$2 == name { print $1 }' | head -1)"
if [[ -z "$TUNNEL_ID" ]]; then
  echo "Could not find tunnel ID for '$TUNNEL_NAME'." >&2
  exit 1
fi

CREDENTIALS_FILE="$CREDENTIALS_DIR/${TUNNEL_ID}.json"
if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "Credentials file not found: $CREDENTIALS_FILE" >&2
  exit 1
fi

echo ""
echo "Step 3 — Create DNS record:"
echo "  $CF tunnel route dns $TUNNEL_NAME $HOSTNAME"
read -r -p "Press Enter to create DNS route..."
"$CF" tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"

mkdir -p "$CONFIG_DIR"
cat >"$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_FILE

ingress:
  - hostname: $HOSTNAME
    service: http://127.0.0.1:3000
  - service: http_status:404
EOF

echo ""
echo "Wrote $CONFIG_FILE"

ORIGIN="https://${HOSTNAME}"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^AUTH_URL=' "$ENV_FILE"; then
    sed -i "s|^AUTH_URL=.*|AUTH_URL=\"$ORIGIN\"|" "$ENV_FILE"
  else
    echo "AUTH_URL=\"$ORIGIN\"" >>"$ENV_FILE"
  fi
  if grep -q '^NEXTAUTH_URL=' "$ENV_FILE"; then
    sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=\"$ORIGIN\"|" "$ENV_FILE"
  else
    echo "NEXTAUTH_URL=\"$ORIGIN\"" >>"$ENV_FILE"
  fi
  echo "Updated AUTH_URL and NEXTAUTH_URL in .env → $ORIGIN"
else
  echo "No .env found — set these manually:"
  echo "  AUTH_URL=\"$ORIGIN\""
  echo "  NEXTAUTH_URL=\"$ORIGIN\""
fi

echo ""
echo "=== Google OAuth (one-time) ==="
echo "In Google Cloud Console → your Web OAuth client:"
echo ""
echo "  JavaScript origin:"
echo "    $ORIGIN"
echo ""
echo "  Redirect URI:"
echo "    ${ORIGIN}/api/auth/callback/google"
echo ""
echo "=== Run the tunnel ==="
echo "  1. Start the app:  npm run dev -- -H 0.0.0.0 -p 3000"
echo "  2. Start tunnel:   npm run tunnel:run"
echo ""
echo "Stable URL: $ORIGIN"
echo "Setup page: ${ORIGIN}/auth/setup"
