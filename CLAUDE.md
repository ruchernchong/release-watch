# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReleaseWatch monitors GitHub releases from public repositories and sends real-time notifications to Telegram (and Discord webhooks). Built entirely on Cloudflare services:

- **Cloudflare Workers**: Hono web framework, cron triggers (every 15 min)
- **Cloudflare KV**: Subscription storage and notification state

## Development Commands

```bash
bun install              # Install dependencies
bun run dev              # Start local Wrangler dev server
bun run deploy           # Deploy to Cloudflare Workers (minified)
bun run cf-typegen       # Generate CloudflareBindings types from wrangler.jsonc
bun run lint             # Run Biome linter with auto-fix
bun run lint:check       # Check linting without modifications
```

## Architecture

```
src/
├── index.ts                 # Hono app + scheduled export
├── bot/index.ts             # Grammy bot initialization
├── handlers/schedule.ts     # Cron: check releases, send notifications
├── services/
│   ├── github.service.ts    # Octokit wrapper for fetching releases
│   ├── telegram.service.ts  # Format and send Telegram messages
│   └── kv.service.ts        # Cloudflare KV subscription operations
└── types/
    ├── env.ts               # Env interface (bindings + secrets)
    └── index.ts             # NotificationPayload and other types
```

### Key Flows

- **Webhook** (`POST /webhook`): Telegram bot updates via Grammy
- **Scheduled** (every 15 min): Iterate subscriptions, check GitHub for new releases, send notifications, track last notified tag

### KV Key Structure

- `chat:{chatId}` - Array of subscribed repo full names
- `notified:{chatId}:{repo}` - Last notified tag (deduplication)

## Tech Stack

- **Framework**: Hono
- **GitHub API**: @octokit/rest
- **Telegram**: Grammy
- **Discord**: Native fetch to webhook URL

## Code Standards

- **Linter/Formatter**: Biome (double quotes, 2-space indent, organized imports)
- **Commits**: Conventional commits via commitlint + husky

## Environment Variables

Secrets (set via `wrangler secret put`):
- `GITHUB_TOKEN` - GitHub PAT for API access
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications

KV binding (configured in wrangler.jsonc):
- `SUBSCRIPTIONS` - Subscription and notification state

---

## Future Architecture (Deprioritized)

Target hybrid architecture for expanded features:

```
Next.js App (Vercel)              Cloudflare Workers
├── Landing page                  ├── Cron trigger (every 15 mins)
├── Releases feed                 ├── Poll GitHub API
├── Admin UI                      └── POST to Next.js webhook
└── API routes
    └── /api/webhook/new-release

            Cloudflare D1
            ├── repos table
            ├── releases table
            └── notifications table
```

### Future Database (D1 with Drizzle)

Tables: `repos`, `releases`, `notifications` with proper relations and indexes.

### Future Tech Stack Additions

- **Frontend**: Next.js 15, Tailwind CSS, shadcn/ui
- **Database**: Cloudflare D1 with Drizzle ORM
- **Validation**: Zod schemas

### Future Features

- Landing page with release feed
- Admin UI for repo management
- Authentication
- Email notifications
- RSS feed
- Advanced search and filters
