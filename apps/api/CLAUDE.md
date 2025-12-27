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

**Public:**
- `GET /` - Health check
- `GET /stats` - System statistics
- `POST /webhook` - Telegram bot updates

**Authenticated (JWT required):**
- `GET /api/dashboard/stats` - User dashboard stats
- `GET /api/dashboard/releases` - User's recent releases
- `GET /api/subscriptions` - List user subscriptions
- `POST /api/subscriptions` - Add subscription
- `DELETE /api/subscriptions/:id` - Remove subscription
- `GET /api/integrations/telegram/status` - Telegram link status
- `POST /api/integrations/telegram/generate` - Generate link code
- `PATCH /api/integrations/telegram/toggle` - Toggle notifications

**Admin (JWT + admin role):**
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - User details
- `POST /api/admin/users/:id/ban` - Ban/unban user
- `GET /api/admin/activity` - Session activity logs
- `GET /api/admin/stats` - System stats

## Authentication

JWT tokens are issued by BetterAuth (Next.js) and verified here via JWKS.
- Tokens fetched from `JWKS_URL` env var (e.g., `https://releasewatch.dev/api/auth/jwks`)
- JWKS is cached per isolate for performance

## KV Keys

- `chat:{chatId}` - Subscribed repos array
- `notified:{chatId}:{repo}` - Last notified tag
- `release:{repo}:{tag}` - Cached AI analysis

## Secrets (wrangler secret put)

`GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`, `JWKS_URL`

## Bindings (wrangler.jsonc)

`SUBSCRIPTIONS` (KV), `STATS` (DO), `RELEASE_CHECK_WORKFLOW`, `AI`, `HYPERDRIVE`
