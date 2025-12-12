# ReleaseWatch

Monitor GitHub releases from public repositories and receive real-time Telegram notifications with AI-powered summaries.

## Features

- **Real-time Notifications**: Get notified within 15 minutes of new releases
- **AI-Powered Summaries**: Automatic release analysis using Cloudflare AI (Llama 3.2)
- **Changelog Fallback**: Supports repos without GitHub Releases via CHANGELOG.md parsing
- **Telegram Bot**: Subscribe/unsubscribe to repositories via simple commands
- **Stats Dashboard**: Track notifications sent, releases monitored, and active users

## Tech Stack

Built entirely on Cloudflare:

- **Workers**: Hono web framework with cron triggers
- **Workflows**: Durable execution for reliable release checking
- **KV**: Subscription storage and AI analysis cache
- **Durable Objects**: SQLite-backed statistics tracking
- **AI**: Release summarization with Llama 3.2

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account
- GitHub Personal Access Token
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

```bash
bun install
```

### Configuration

1. Create KV namespace:
   ```bash
   wrangler kv:namespace create SUBSCRIPTIONS
   ```

2. Set secrets:
   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```

3. Update `wrangler.jsonc` with your KV namespace ID.

### Development

```bash
bun run dev
```

### Deployment

```bash
bun run deploy
```

### Generate Types

```bash
bun run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
const app = new Hono<{ Bindings: Env }>();
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/stats` | GET | System statistics |
| `/webhook` | POST | Telegram bot webhook |

## Architecture

```
src/
├── index.ts                     # Hono app entry point
├── bot/                         # Grammy Telegram bot
├── handlers/                    # Cron trigger handler
├── workflows/                   # Cloudflare Workflows
│   ├── release-check.ts         # Main release checking workflow
│   └── ai-analysis.ts           # AI analysis with caching
├── durable-objects/             # Stats tracking
├── services/                    # Business logic
└── types/                       # TypeScript definitions
```

## License

MIT
