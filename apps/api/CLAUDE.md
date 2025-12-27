# CLAUDE.md

## Overview

Cloudflare Worker that serves as the main API backend. Handles REST APIs, Telegram bot, and scheduled release checking.

## Commands

```bash
wrangler dev              # Local dev server
wrangler deploy --minify  # Deploy to Cloudflare
wrangler types            # Generate CloudflareBindings types
```

## Architecture

- `index.ts` - Hono app + scheduled export + DO/Workflow exports
- `middleware/auth.ts` - JWT authentication (verifies via JWKS)
- `bot/` - Grammy Telegram bot
- `workflows/release-check.ts` - Main workflow: fetch releases → AI analysis → notify
- `durable-objects/stats.ts` - SQLite-backed stats
- `services/` - GitHub, Telegram, KV, AI, Stats services

## API Routes

No versioning - internal API only.

**Public:**
- `GET /` - Health check
- `GET /stats` - System statistics
- `POST /webhook` - Telegram bot updates

**Authenticated (JWT required):**
- `GET /dashboard/stats` - User dashboard stats
- `GET /dashboard/releases` - User's recent releases
- `GET /repos` - List user's tracked repos
- `POST /repos` - Add tracked repo
- `DELETE /repos/:id` - Remove tracked repo
- `GET /integrations/telegram/status` - Telegram link status
- `POST /integrations/telegram/generate` - Generate link code
- `PATCH /integrations/telegram/toggle` - Toggle notifications

**Admin (JWT + admin role):**
- `GET /admin/users` - List users
- `GET /admin/users/:id` - User details
- `POST /admin/users/:id/ban` - Ban/unban user
- `GET /admin/activity` - Session activity logs
- `GET /admin/stats` - System stats

## Authentication

JWT tokens are issued by BetterAuth (Next.js) and verified here via JWKS.
- Tokens fetched from `JWKS_URL` env var (e.g., `https://releasewatch.dev/api/auth/jwks`)
- JWKS is cached per isolate for performance

## KV Keys

- `chat:{chatId}` - Tracked repos array
- `notified:{chatId}:{repo}` - Last notified tag
- `release:{repo}:{tag}` - Cached AI analysis

## Secrets (wrangler secret put)

`GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`, `JWKS_URL`

## Bindings (wrangler.jsonc)

`REPOS` (KV), `STATS` (DO), `RELEASE_CHECK_WORKFLOW`, `AI`, `HYPERDRIVE`
