# Pigeon Box — Full Email Client Architecture

## Layers

```text
UI (Next.js App Router)
  ├── Inbox      /inbox
  ├── Compose    /compose
  └── Settings   /settings

API (Route Handlers)
  ├── /api/inbox
  ├── /api/messages/[id]
  ├── /api/messages/[id]/actions
  ├── /api/messages/send
  ├── /api/messages/[id]/reply
  ├── /api/messages/[id]/forward
  ├── /api/settings
  └── /api/overview

Domain Services
  ├── server/gmail/messages.ts   — list, read, labels, modify
  ├── server/gmail/compose.ts    — send, reply, forward
  ├── server/gmail/mime.ts       — RFC822 raw message builder
  ├── server/settings/service.ts — user prefs + Gmail forwarding
  └── server/sync/sync-engine.ts — incremental sync

Infrastructure
  ├── lib/auth.ts        — Google OAuth + JWT sessions
  ├── lib/db.ts          — Prisma client
  ├── lib/crypto.ts      — token encryption
  └── prisma/schema.prisma
```

## Data flow (send email)

1. User fills compose form → `POST /api/messages/send`
2. API validates session + payload (zod)
3. `compose.ts` loads user settings (signature, display name)
4. `mime.ts` builds base64url RFC822 message
5. Gmail API `users.messages.send`
6. Audit log written; UI redirects to inbox

## Data flow (forward)

1. User clicks Forward on message → `/compose?mode=forward&id=...`
2. API `GET /api/messages/[id]` loads original
3. Compose pre-fills subject/body with forward template
4. `POST /api/messages/[id]/forward` sends via Gmail

## Settings

Stored in `UserSettings` (per user) plus Gmail account forwarding addresses from Gmail Settings API.

## Required Google scopes

- `gmail.readonly` — read mail
- `gmail.modify` — archive, labels, read state
- `gmail.send` — send, reply, forward
- `gmail.settings.basic` — list forwarding addresses

After scope changes, users must sign out and sign in again.
