# CLAUDE.md

## Overview

Standalone Hono API deployed on Vercel. Handles REST APIs, Telegram bot webhook, scheduled release checking, and Vercel Workflow-backed background work.

## Commands

```bash
pnpm dev        # Vercel local dev server
pnpm typecheck  # Type-check
pnpm lint       # Biome check
```

## Architecture

```
src/
  index.ts                 # Vercel/Hono entrypoint
  app.ts                   # App composition + AppType export
  routes/
    health.ts              # GET /
    stats.ts               # GET /stats
    webhook.ts             # POST /webhook (Telegram incoming)
    dashboard.ts           # /dashboard/*
    repos.ts               # /repos/*
    channels/
      telegram.ts          # /channels/telegram/*
      discord.ts           # /channels/discord/*
    admin/
      users.ts             # /admin/users/*
      activity.ts          # /admin/activity
      stats.ts             # /admin/stats
  middleware/
    auth.ts                # JWT authentication (verifies via JWKS)
    db.ts                  # Database context middleware
  bot/                     # Grammy Telegram bot
  workflows/               # Vercel Workflows
  services/                # GitHub, Telegram, KV, AI, Stats
```

**Route Pattern:** Each route file uses `.basePath()` and method chaining for Hono RPC type inference.

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
- `PATCH /repos/:id/pause` - Pause/unpause tracking
- `GET /channels/telegram/status` - Telegram link status
- `POST /channels/telegram/generate` - Generate link code
- `PATCH /channels/telegram/toggle` - Toggle notifications
- `GET /channels/discord/status` - Discord connection status
- `GET /channels/discord/guilds` - List user's Discord guilds
- `GET /channels/discord/guilds/:guildId/channels` - List guild channels
- `POST /channels/discord/channels` - Add notification channel
- `DELETE /channels/discord/channels/:channelId` - Remove channel
- `PATCH /channels/discord/toggle` - Toggle channel notifications

**Admin (JWT + admin role):**
- `GET /admin/users` - List users
- `GET /admin/users/:id` - User details
- `POST /admin/users/:id/ban` - Ban/unban user
- `GET /admin/activity` - Session activity logs
- `GET /admin/stats` - System stats

## Authentication

JWT tokens are issued by BetterAuth (Next.js) and verified here via JWKS.
- Tokens fetched from `JWKS_URL` env var (e.g., `https://shipradar.dev/api/auth/jwks`)
- JWKS is cached per isolate for performance

## Redis Keys

- **repos** - Tracked repos per chat
  - `chat:{chatId}` - Array of repo names

- **notifications** - Notification state
  - `notified:{chatId}:{repo}` - Last notified tag

- **cache** - AI/API response cache
  - `release:{repo}:{tag}` - Cached AI analysis
  - `api:repos:{userId}` - Repos API cache
  - `api:stats:{userId}` - Dashboard stats cache
  - `api:releases:{userId}:{limit}` - Dashboard releases cache

- **channels** - User notification channels
  - `channels:{userId}` - Array of channel configs
  - `telegram:{chatId}` - Maps chatId → userId
  - `link:{code}` - Temporary link codes (10min TTL)

## Analytics

PostHog tracks key API events:
- `Repo Added` - User adds a repository
- `Repo Removed` - User removes a repository
- `Telegram Link Generated` - User generates Telegram link code
- `Telegram Toggled` - User enables/disables Telegram notifications
- `Discord Channel Added` - User connects Discord channel
- `Discord Channel Removed` - User removes Discord channel
- `Discord Channel Toggled` - User enables/disables Discord channel

Service: `src/services/posthog.ts` (uses `posthog-node` with Workers-compatible settings)

## Environment

Required: `DATABASE_URL`, `GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `JWKS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `AI_GATEWAY_API_KEY`

Optional: `DISCORD_WEBHOOK_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `POSTHOG_API_KEY`

## Cron

Vercel Cron calls `GET /internal/release-check` every 15 minutes. The endpoint requires `Authorization: Bearer ${CRON_SECRET}`.

## Database

Neon Postgres via `@neondatabase/serverless` HTTP driver. The singleton `db` from `@shipradar/database` is imported directly in routes/workflows.
