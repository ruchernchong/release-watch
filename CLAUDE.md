# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReleaseWatch monitors GitHub releases and sends Telegram notifications with AI summaries. Monorepo with pnpm workspaces + Turborepo.

## Structure

- `apps/api` - Cloudflare Worker (Hono + Grammy bot + REST API)
- `apps/web` - Next.js 16 dashboard (Vercel, BetterAuth only)
- `packages/database` - Drizzle + BetterAuth + Neon
- `packages/types` - Shared types

Each app/package has its own `CLAUDE.md` with deeper detail (routes, KV namespaces, data-fetching patterns, schemas). Read it before working in that subtree.

## API Architecture

All REST APIs are served by Hono (Cloudflare Worker). Next.js only handles authentication via BetterAuth.

```
Browser → Next.js (BetterAuth) → JWT token
Browser → Hono API (with JWT) → Database
```

**Authentication Flow:**
1. User authenticates via BetterAuth in Next.js
2. Frontend fetches JWT from `/api/auth/token` (BetterAuth's JWT plugin)
3. Frontend calls Hono API with `Authorization: Bearer <token>`
4. Hono verifies JWT via JWKS (`/api/auth/jwks`)

**Key Files:**
- `apps/api/src/middleware/auth.ts` - JWT verification middleware
- `apps/web/src/lib/api-client.ts` - Frontend API client with JWT handling
- `apps/web/src/proxy.ts` - Route protection (Next.js 16 proxy, replaces middleware)
- `packages/database/src/auth.ts` - BetterAuth config with JWT plugin

## Commands

```bash
pnpm install              # Install dependencies
pnpm exec husky           # Required after fresh clone — see Supply Chain note below
pnpm dev                  # Start all apps
pnpm build                # Build all
pnpm lint                 # Lint all
pnpm typecheck            # Type-check all
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
pnpm auth:generate        # Regenerate BetterAuth schema
```

## Supply Chain & Dependencies

- `.npmrc` sets `ignore-scripts=true`, so `pnpm install` will **not** run Husky's `prepare` script. Run `pnpm exec husky` manually after a fresh clone or git hooks won't fire.
- `.npmrc` also sets `save-exact=true` and `minimum-release-age=4320` (3-day quarantine on new releases).
- All dependency versions are pinned exactly (no `^`/`~`). **Do not** revert this — Renovate is configured to manage version bumps via PRs (`renovate.json`).
- CI enforces this via `.github/workflows/`: `audit.yml`, `dependency-review.yml`, `lockfile-integrity.yml`. Third-party actions are pinned to commit SHA with a version comment.

## Environment Variables

**apps/api** (Cloudflare Secrets + .env):
- `GITHUB_TOKEN` - GitHub API access
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `DASHBOARD_API_KEY` - Admin API key
- `JWKS_URL` - BetterAuth JWKS endpoint (e.g., `https://releasewatch.dev/api/auth/jwks`)
- `DISCORD_WEBHOOK_URL` - Optional Discord notifications
- `POSTHOG_API_KEY` - PostHog project API key (optional, for analytics)
- `DEBUG` - Optional debug mode

**apps/web** (.env):
- `DATABASE_URL` - Neon Postgres connection string
- `BETTER_AUTH_SECRET` - Auth secret (generate random string)
- `BETTER_AUTH_URL` - Auth callback URL (e.g., `http://localhost:3000`)
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXT_PUBLIC_API_URL` - Hono API URL (e.g., `https://api.releasewatch.dev`)
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project API key (optional, for analytics)
- `POLAR_ACCESS_TOKEN` - Polar.sh access token (optional)
- `POLAR_WEBHOOK_SECRET` - Polar.sh webhook secret (optional)
- `POLAR_SERVER` - Polar.sh server (`"sandbox"` or `"production"`)

**packages/database** (.env):
- `DATABASE_URL` - Neon Postgres connection string
- OAuth secrets (same as apps/web)
- Polar secrets (same as apps/web)

## Code Standards

- **Linter/Formatter:** Biome (double quotes, space indent, organized imports)
- **Commits:** Conventional commits (commitlint + husky)
- **Package Manager:** pnpm 10.22.0 (workspaces + catalog)
- **Monorepo:** Turborepo for task orchestration
