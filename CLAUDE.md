# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReleaseWatch monitors GitHub releases and sends Telegram notifications with AI summaries. Monorepo with pnpm workspaces + Turborepo.

## Structure

- `apps/api` - Cloudflare Worker (Hono + Grammy bot + REST API)
- `apps/web` - Next.js 16 dashboard (Vercel, BetterAuth only)
- `packages/database` - Drizzle + BetterAuth + Neon
- `packages/types` - Shared types

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
- `packages/database/src/auth.ts` - BetterAuth config with JWT plugin

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all apps
pnpm build                # Build all
pnpm lint                 # Lint all
pnpm typecheck            # Type-check all
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
pnpm auth:generate        # Regenerate BetterAuth schema
```

## Code Standards

- **Linter/Formatter:** Biome (double quotes, space indent, organized imports)
- **Commits:** Conventional commits (commitlint + husky)
