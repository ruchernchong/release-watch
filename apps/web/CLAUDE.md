# CLAUDE.md

## Overview

Next.js 16 dashboard with React 19, BetterAuth, and shadcn/ui. Handles authentication only; all API calls go to Hono.

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

## Code Style Guidelines

**Server Components by Default:**
- Keep `page.tsx` files as Server Components (no `"use client"` directive)
- Extract interactive parts (useState, useEffect, event handlers) to separate client components
- Place client components in `/components` directory with `"use client"` directive

**Descriptive Variable Names:**
- Use descriptive variable names in callbacks and arrow functions
- Avoid single-letter or overly abbreviated names like `r`, `p`, `x`
- Short descriptive names are fine: `prev`, `accum`, `curr`
- Prefer context-aware names: `previousRepos`, `currentRepo`, `repoToDelete`

Examples:

```tsx
// Bad
setRepos((prev) => prev.filter((r) => r.id !== id));

// Good
setRepos((previousRepos) =>
  previousRepos.filter((repo) => repo.id !== id)
);

// Bad
setRepos((prev) =>
  prev.map((r) => r.id === id ? updated : r)
);

// Good
setRepos((previousRepos) =>
  previousRepos.map((currentRepo) =>
    currentRepo.id === id ? updatedRepo : currentRepo
  )
);
```

## Generated Files (DO NOT MODIFY)

- `src/components/ui/*` - shadcn/ui components
- `src/lib/utils.ts` - shadcn/ui utilities
- `components.json` - shadcn/ui config

## Authentication

Uses BetterAuth with JWT plugin for API authentication.

**Key Files:**

- `src/proxy.ts` - Route protection (Next.js 16 proxy, replaces middleware)
- `src/lib/auth.ts` - Server-side auth (`getSession()` helper)
- `src/lib/auth-client.ts` - Client-side auth (`signIn`, `signOut`, `useSession`)
- `src/lib/api-client.ts` - API client with JWT handling
- `src/app/api/auth/[...all]/route.ts` - Auth API handler (only API route)

**Server Components:**

```tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const session = await getSession();
if (!session) redirect("/login");
```

**Client Components:**

```tsx
import { useSession, signIn, signOut } from "@/lib/auth-client";

const { data: session } = useSession();
signIn.social({ provider: "github", callbackURL: "/dashboard" });
signOut();
```

**API Calls (Client Components):**

```tsx
import { api } from "@/lib/api-client";

// API client handles JWT automatically
const stats = await api.get<StatsResponse>("/dashboard/stats");
await api.post("/repos", { repoName });
await api.delete(`/repos/${id}`);
```

## Environment

- `DATABASE_URL` - Neon Postgres connection
- `BETTER_AUTH_SECRET` - Auth secret
- `BETTER_AUTH_URL` - Auth callback URL (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_API_URL` - Hono API URL (e.g., `https://api.releasewatch.dev`)
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
