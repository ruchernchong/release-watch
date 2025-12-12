# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReleaseWatch monitors GitHub releases from public repositories and sends real-time notifications to Telegram. Built entirely on Cloudflare services:

- **Cloudflare Workers**: Hono web framework, cron triggers (every 15 min)
- **Cloudflare Workflows**: Durable execution for release checking and AI analysis
- **Cloudflare KV**: Subscription storage, notification state, and AI analysis cache
- **Cloudflare Durable Objects**: SQLite-backed stats tracking
- **Cloudflare AI**: Release notes summarization using Llama 3.2

## Development Commands

```bash
bun install              # Install dependencies
bun run dev              # Start local Wrangler dev server
bun run deploy           # Deploy to Cloudflare Workers (minified)
bun run cf-typegen       # Generate CloudflareBindings types from wrangler.jsonc
bun run lint             # Run Biome linter with auto-fix
```

## Architecture

```
src/
├── index.ts                     # Hono app + scheduled export + DO/Workflow exports
├── bot/index.ts                 # Grammy bot initialization
├── handlers/schedule.ts         # Cron: triggers release check workflow
├── workflows/
│   ├── release-check.ts         # Main workflow: fetch releases, notify users
│   └── ai-analysis.ts           # Child workflow: AI analysis with KV caching
├── durable-objects/
│   └── stats.ts                 # SQLite-backed Durable Object for stats
├── services/
│   ├── github.service.ts        # Octokit wrapper for fetching releases + changelog
│   ├── telegram.service.ts      # Format and send Telegram messages
│   ├── kv.service.ts            # KV operations (subscriptions, cache, notifications)
│   ├── ai.service.ts            # AI release analysis using Cloudflare AI
│   └── stats.service.ts         # Stats aggregation from DO and KV
└── types/
    ├── env.ts                   # Env interface (bindings + secrets)
    └── index.ts                 # NotificationPayload, SystemStats, AI types
```

### Key Flows

- **Webhook** (`POST /webhook`): Telegram bot updates via Grammy
- **Stats** (`GET /stats`): System statistics (users, repos, notifications)
- **Scheduled** (every 15 min): Triggers ReleaseCheckWorkflow
  1. Fetch all subscriptions from KV
  2. Build repo-to-chat mapping
  3. For each repo: fetch latest release (GitHub API) or changelog fallback
  4. Trigger AIAnalysisWorkflow (checks cache first, then runs AI)
  5. For each subscriber: check last notified tag, send notification if new
  6. Update stats via Durable Objects

### KV Key Structure

- `chat:{chatId}` - Array of subscribed repo full names
- `notified:{chatId}:{repo}` - Last notified tag (deduplication)
- `ai:{repo}:{tag}` - Cached AI analysis results

## Tech Stack

- **Framework**: Hono
- **GitHub API**: @octokit/rest
- **Telegram**: Grammy
- **AI Model**: @cf/meta/llama-3.2-3b-instruct (Cloudflare AI)

## Code Standards

- **Linter/Formatter**: Biome (double quotes, 2-space indent, organized imports)
- **Commits**: Conventional commits via commitlint + husky

## Environment Variables

Secrets (set via `wrangler secret put`):
- `GITHUB_TOKEN` - GitHub PAT for API access
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `DISCORD_WEBHOOK_URL` - (Deprioritized) Discord webhook for notifications

Bindings (configured in wrangler.jsonc):
- `SUBSCRIPTIONS` - KV namespace for subscription and notification state
- `STATS` - Durable Object for stats tracking
- `RELEASE_CHECK_WORKFLOW` - Main release checking workflow
- `AI_ANALYSIS_WORKFLOW` - AI analysis child workflow
- `AI` - Cloudflare AI binding

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
