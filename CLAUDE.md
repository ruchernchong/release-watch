# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReleaseWatch monitors GitHub releases and sends Telegram notifications with AI summaries. Monorepo with pnpm workspaces + Turborepo.

## Structure

- `apps/api` - Cloudflare Worker (Hono + Grammy bot)
- `apps/web` - Next.js 16 dashboard (Vercel)
- `packages/database` - Drizzle + BetterAuth + Neon
- `packages/types` - Shared types

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
