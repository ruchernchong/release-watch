# CLAUDE.md

## Overview

Database package with Drizzle ORM, Neon Postgres, and BetterAuth.

## Commands

```bash
pnpm auth:generate  # Regenerate BetterAuth schema → src/schema/auth.ts
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run migrations
pnpm db:drop        # Drop migrations
```

## Structure

- `src/client.ts` - Neon database client
- `src/auth.ts` - BetterAuth server config
- `src/auth-client.ts` - BetterAuth client
- `src/schema/` - Drizzle schemas

## Schemas

- `auth.ts` - BetterAuth tables (GENERATED - do not modify)
- `user-channels.ts` - User notification channels
- `user-repos.ts` - User repository subscriptions

## Environment

- `DATABASE_URL` - Neon Postgres connection string
