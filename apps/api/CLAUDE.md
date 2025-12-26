# CLAUDE.md

## Overview

Cloudflare Worker that monitors GitHub releases and sends Telegram notifications with AI-powered summaries.

## Commands

```bash
wrangler dev              # Local dev server
wrangler deploy --minify  # Deploy to Cloudflare
wrangler types            # Generate CloudflareBindings types
```

## Architecture

- `index.ts` - Hono app + scheduled export + DO/Workflow exports
- `bot/` - Grammy Telegram bot
- `workflows/release-check.ts` - Main workflow: fetch releases → AI analysis → notify
- `durable-objects/stats.ts` - SQLite-backed stats
- `services/` - GitHub, Telegram, KV, AI, Stats services

## Key Flows

- **Webhook** (`POST /webhook`): Telegram bot updates
- **Stats** (`GET /stats`): System statistics
- **Scheduled** (every 15 min): ReleaseCheckWorkflow

## KV Keys

- `chat:{chatId}` - Subscribed repos array
- `notified:{chatId}:{repo}` - Last notified tag
- `release:{repo}:{tag}` - Cached AI analysis

## Secrets (wrangler secret put)

`GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`

## Bindings (wrangler.jsonc)

`SUBSCRIPTIONS` (KV), `STATS` (DO), `RELEASE_CHECK_WORKFLOW`, `AI`
