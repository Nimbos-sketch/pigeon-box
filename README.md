# Pigeon Box

Web inbox built on Next.js with Google SSO and Gmail API sync.

## Features

- Google Workspace SSO login via OAuth.
- Inbox and message detail views.
- Organize actions: archive, read/unread, star/unstar.
- Gmail label sync and search passthrough.
- Initial and incremental sync with Gmail History API checkpoints.

## Setup

1. Create a Google Cloud OAuth client for a web app.
2. Enable Gmail API for the project.
3. Add your app redirect URI (for local dev: `http://localhost:3000/api/auth/callback/google`).
4. For iPhone / remote preview with a **stable URL** (configure Google OAuth once), see [Stable Cloudflare tunnel](#stable-cloudflare-tunnel-iphone-preview) below.
5. If you are on Workspace SSO, configure this app as Internal or allowlist it in Admin.
6. Copy `.env.example` to `.env` and fill values.
   - `AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` must be long random strings.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must come from Google Cloud Console.
   - Local dev uses SQLite (`DATABASE_URL="file:./dev.db"`).

## Local run

```bash
npm install
npx prisma generate
npx prisma migrate dev -n init
npm run dev
```

## Stable Cloudflare tunnel (iPhone preview)

Quick tunnels (`*.trycloudflare.com`) get a **new URL every restart**, so you must update Google OAuth redirect URIs each time. A **named tunnel** on your own domain gives you one permanent URL.

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- A domain on Cloudflare (buy one there, or transfer / point nameservers)

### One-time setup

1. Pick a hostname, e.g. `pigeon.yourdomain.com`.
2. From the project root, run the guided setup (install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) first):

   ```bash
   npm run tunnel:setup
   ```

   This will:
   - Log you into Cloudflare (`cloudflared tunnel login`)
   - Create a tunnel named `pigeon-box`
   - Add a DNS record for your hostname
   - Write `cloudflared/config.yml`
   - Update `AUTH_URL` and `NEXTAUTH_URL` in `.env`

3. In **Google Cloud Console** → your Web OAuth client, add **once**:

   | Field | Value |
   |-------|--------|
   | JavaScript origin | `https://pigeon.yourdomain.com` |
   | Redirect URI | `https://pigeon.yourdomain.com/api/auth/callback/google` |

4. OAuth consent screen → add your Gmail as a **Test user** (if app is in Testing).

### Daily use

Terminal 1 — app:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

Terminal 2 — tunnel:

```bash
npm run tunnel:run
```

Open `https://pigeon.yourdomain.com` on your iPhone. Restarting the tunnel **does not** change the URL, so you never touch Google OAuth again.

Verify values at `/auth/setup` on your stable URL.

## Security notes

- All secrets live in `.env` only — never commit `.env` or `prisma/*.db`.
- OAuth tokens are encrypted at rest (`TOKEN_ENCRYPTION_KEY` required).
- Plaintext OAuth tokens are cleared from the auth `Account` table after sign-in.
- AI overview is **off by default** (`AI_OVERVIEW_ENABLED=false`). Email snippets are only sent to OpenAI when you explicitly enable it.
- API errors return generic messages in production so internal details are not leaked.
- Logs redact tokens, passwords, and other sensitive fields automatically.
- Phishing-risk emails are flagged with a warning — do not click links in suspicious messages.
- Scope is restricted to user profile plus Gmail read/modify APIs.
- Session persistence uses database-backed sessions.

## API routes

- `GET /api/inbox`
- `GET /api/labels`
- `GET /api/messages/:id`
- `POST /api/messages/:id/actions`
- `POST /api/messages/send`
- `POST /api/messages/:id/reply`
- `POST /api/messages/:id/forward`
- `GET /api/messages/:id/compose?mode=reply|forward`
- `GET/PATCH /api/settings`
- `POST /api/sync/run`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full email-client layout.

## App pages

- `/inbox` — inbox organizer + AI overview
- `/compose` — send new mail (`?mode=reply&id=` or `?mode=forward&id=`)
- `/settings` — signature, forwarding, compose defaults
