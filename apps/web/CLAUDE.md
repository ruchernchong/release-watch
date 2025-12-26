# CLAUDE.md

## Overview

Next.js 16 dashboard with React 19, BetterAuth, and shadcn/ui.

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm typecheck  # Type-check
```

## Structure

- `(auth)/` - Login/signup routes
- `(dashboard)/` - Protected dashboard routes
- `(marketing)/` - Public marketing pages
- `components/ui/` - shadcn/ui components (generated)

## UI Guidelines

- Use `gap-*` instead of `margin-top`, `padding-top`, `space-y-*`, `space-x-*`
- Gap values: even numbers (`gap-2`, `gap-4`, `gap-6`)
- Use `size-*` for square dimensions instead of `h-*` + `w-*`

## Generated Files (DO NOT MODIFY)

- `src/components/ui/*` - shadcn/ui components
- `src/lib/utils.ts` - shadcn/ui utilities
- `components.json` - shadcn/ui config

## Environment

- `DATABASE_URL` - Neon Postgres connection
- `BETTER_AUTH_SECRET` - Auth secret
