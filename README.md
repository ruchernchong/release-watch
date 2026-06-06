# ShipRadar

Monitor GitHub releases and receive Telegram notifications with AI-powered summaries. Full-stack monorepo with a Next.js dashboard and a Hono API backend on Vercel.

## Features

- **Web Dashboard**: Manage tracked repositories, view release history, and configure notification channels
- **Authentication**: GitHub and Google OAuth via BetterAuth
- **Real-time Notifications**: Get notified within 15 minutes of new releases via Telegram
- **AI Summaries**: Automatic release analysis via Vercel AI Gateway (OpenAI gpt-4.1-mini)
- **Multi-Channel Support**: Telegram notifications with extensible channel system
- **Pause/Resume**: Temporarily pause repository tracking without unsubscribing
- **Analytics**: PostHog integration for product analytics and user behavior tracking

## Tech Stack

**Frontend** (apps/web):
- Next.js 16 with React 19
- BetterAuth (OAuth + JWT)
- shadcn/ui components
- TanStack Table
- PostHog (analytics, reverse proxy via `/ingest`)
- Deployed on Vercel

**Backend** (apps/api):
- Hono framework on Vercel (Nitro `node-server` preset)
- Grammy Telegram bot
- Vercel Workflows (durable background execution)
- Vercel Cron (scheduled release checks)
- Upstash Redis (repo tracking, cache)
- Vercel AI Gateway (release summaries)
- PostHog (event tracking for API actions)

**Database** (packages/database):
- Neon Postgres
- Drizzle ORM
- BetterAuth integration

## Project Structure

```
release/
├── apps/
│   ├── api/          # Hono API on Vercel (Hono + Grammy bot)
│   └── web/          # Next.js 16 dashboard
├── packages/
│   ├── database/     # Drizzle + BetterAuth schemas
│   └── types/        # Shared TypeScript types
├── turbo.json        # Turborepo config
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+ (see `.node-version`)
- pnpm 10.22.0+
- Vercel account (API + web deployment)
- Upstash Redis database
- Vercel AI Gateway API key
- Neon Postgres database
- GitHub OAuth app
- Google OAuth app (optional)
- Telegram bot token (from [@BotFather](https://t.me/BotFather))

### Installation

```bash
pnpm install
```

### Configuration

1. **Database** - Create Neon Postgres database and run migrations:
   ```bash
   # Set DATABASE_URL in packages/database/.env
   pnpm db:generate
   pnpm db:migrate
   ```

2. **BetterAuth** - Generate auth schema:
   ```bash
   pnpm auth:generate
   ```

3. **API environment** - Set the API secrets locally in `apps/api/.env` (and in the
   Vercel project settings for production):
   ```bash
   DATABASE_URL=          # Neon Postgres connection string
   GITHUB_TOKEN=
   TELEGRAM_BOT_TOKEN=
   JWKS_URL=              # https://shipradar.localhost/api/auth/jwks locally; https://shipradar.dev/api/auth/jwks in production
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   CRON_SECRET=
   AI_GATEWAY_API_KEY=    # Vercel AI Gateway
   POSTHOG_API_KEY=       # Optional, for analytics
   ```

4. **Environment Files** - Copy and fill `.env.example` files:
   ```bash
   cp apps/api/.env.example apps/api/.env.local
   cp apps/web/.env.example apps/web/.env.local
   cp packages/database/.env.example packages/database/.env
   ```

### Development

```bash
pnpm dev  # Start all apps (Next.js + Nitro/Vercel dev server)
```

Individual apps:
```bash
pnpm --filter @shipradar/web dev
pnpm --filter @shipradar/api dev
```

### Build

```bash
pnpm build      # Build all apps
pnpm typecheck  # Type-check all packages
pnpm lint       # Lint all packages
pnpm format     # Format all packages
```

### Deployment

**Web** (Vercel):
```bash
cd apps/web
vercel deploy
```

**API** (Vercel):
```bash
cd apps/api
pnpm build        # nitro build
vercel deploy     # or push to a branch connected to the Vercel project
```

## Usage

### Web Dashboard

Visit the dashboard to:
- Sign in with GitHub or Google
- Add/remove tracked repositories
- View release history with AI summaries
- Link Telegram for notifications
- Pause/resume repository tracking

### Telegram Bot Commands

- `/start` - Get started and see available commands
- `/check` - Manually trigger a release check for all your tracked repos
- `/list` - View all your tracked repositories
- `/unsubscribe` - Stop tracking a repository (interactive menu)

**To subscribe**: Simply paste a GitHub repository URL (e.g., `https://github.com/owner/repo`)

## API Architecture

All REST APIs are served by Hono on Vercel. Next.js handles authentication only.

```
Browser → Next.js (BetterAuth) → JWT token
Browser → Hono API (with JWT) → Database
```

**Authentication Flow:**
1. User authenticates via BetterAuth in Next.js
2. Frontend fetches JWT from `/api/auth/token`
3. Frontend calls Hono API with `Authorization: Bearer <token>`
4. Hono verifies JWT via JWKS endpoint

### API Endpoints (apps/api)

**Public:**
- `GET /` - Health check
- `GET /stats` - System statistics
- `POST /webhook` - Telegram bot updates

**Authenticated (JWT):**
- `GET /dashboard/stats` - User dashboard stats
- `GET /dashboard/releases` - Recent releases
- `GET /repos` - List tracked repos
- `POST /repos` - Add tracked repo
- `DELETE /repos/:id` - Remove repo
- `GET /integrations/telegram/status` - Telegram link status
- `POST /integrations/telegram/generate` - Generate link code
- `PATCH /integrations/telegram/toggle` - Toggle notifications

**Admin (JWT + role):**
- `GET /admin/users` - List users
- `GET /admin/users/:id` - User details
- `POST /admin/users/:id/ban` - Ban/unban user
- `GET /admin/activity` - Activity logs
- `GET /admin/stats` - System stats

## License

MIT
