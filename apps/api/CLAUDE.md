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

```
src/
  index.ts                 # App composition + AppType export
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
  workflows/               # Cloudflare Workflows
  durable-objects/         # SQLite-backed stats
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
- Tokens fetched from `JWKS_URL` env var (e.g., `https://releasewatch.dev/api/auth/jwks`)
- JWKS is cached per isolate for performance

## KV Namespaces

- **REPOS** - Tracked repos per chat
  - `chat:{chatId}` - Array of repo names

- **NOTIFICATIONS** - Notification state
  - `notified:{chatId}:{repo}` - Last notified tag

- **CACHE** - AI analysis cache
  - `release:{repo}:{tag}` - Cached AI analysis

- **CHANNELS** - User notification channels
  - `channels:{userId}` - Array of channel configs
  - `telegram:{chatId}` - Maps chatId → userId
  - `link:{code}` - Temporary link codes (10min TTL)

## Analytics

PostHog tracks key API events:
- `repo_added` - User adds a repository
- `repo_removed` - User removes a repository
- `telegram_link_generated` - User generates Telegram link code
- `telegram_toggled` - User enables/disables Telegram notifications
- `discord_channel_added` - User connects Discord channel
- `discord_channel_removed` - User removes Discord channel
- `discord_channel_toggled` - User enables/disables Discord channel

Service: `src/services/posthog.ts` (uses `posthog-node` with Workers-compatible settings)

## Secrets (wrangler secret put)

`GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`, `JWKS_URL`, `POSTHOG_API_KEY`

## Bindings (wrangler.jsonc)

`REPOS` (KV), `NOTIFICATIONS` (KV), `CACHE` (KV), `CHANNELS` (KV), `STATS` (DO), `RELEASE_CHECK_WORKFLOW`, `AI`, `HYPERDRIVE`
