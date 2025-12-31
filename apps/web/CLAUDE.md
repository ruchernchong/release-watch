# CLAUDE.md

## Overview

Next.js 16 dashboard with React 19, BetterAuth, and shadcn/ui. Handles authentication only; all API calls go to Hono via RPC.

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm typecheck  # Type-check
```

## Project Structure

```
src/
  app/
    (auth)/                    # Login/signup routes
    (dashboard)/
      dashboard/
        page.tsx               # Server Component - fetches data
        actions.ts             # Server Actions - mutations (colocated)
        repos/
          page.tsx
          actions.ts
    (marketing)/               # Public marketing pages
  components/
    ui/                        # shadcn/ui (generated - DO NOT MODIFY)
    dashboard/                 # Dashboard-specific components
    repos/                     # Repo-related components
  lib/
    api.ts                     # Hono RPC client (server-side only)
    api-client.ts              # Legacy client API (deprecated)
    auth.ts                    # Server-side auth
    auth-client.ts             # Client-side auth
    data/                      # Data fetching functions
      repos.ts                 # getRepos(), getRepo()
      dashboard.ts             # getDashboardStats(), getReleases()
      channels.ts              # getChannelStatus()
```

## Data Fetching & Mutations (Next.js Guidelines)

**Data Fetching** - Use `lib/data/` functions in Server Components:
```tsx
// lib/data/repos.ts
import { getApi } from "@/lib/api";

export async function getRepos() {
  const api = await getApi();
  const res = await api.repos.$get();
  return res.json();
}

// app/(dashboard)/dashboard/repos/page.tsx
import { getRepos } from "@/lib/data/repos";

export default async function ReposPage() {
  const { repos } = await getRepos();
  return <ReposTable repos={repos} />;
}
```

**Mutations** - Colocate Server Actions with routes:
```tsx
// app/(dashboard)/dashboard/repos/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getApi } from "@/lib/api";

export async function createRepo(repoName: string) {
  const api = await getApi();
  const res = await api.repos.$post({ json: { repoName } });

  if (!res.ok) throw new Error("Failed to create repo");

  revalidatePath("/dashboard/repos");
  return res.json();
}

// Used in Client Component:
import { createRepo } from "./actions";

<form action={async (formData) => {
  "use server";
  await createRepo(formData.get("repoName") as string);
}}>
```

**Key Principles:**
- `page.tsx` = Server Component (fetch data directly)
- `actions.ts` = Server Actions (mutations only, colocated with route)
- `lib/data/*.ts` = Reusable data fetching functions
- Client Components receive data as props from Server Components

## UI Guidelines

- Use `gap-*` instead of `margin-top`, `padding-top`, `space-y-*`, `space-x-*`
- Gap values: even numbers (`gap-2`, `gap-4`, `gap-6`)
- Use `size-*` for square dimensions instead of `h-*` + `w-*`

## RepoSearch Component

Uses GitHub's **search API** to find repositories by keyword. Users type a query, see matching results with star counts, select one to preview details, then add to watchlist. Already-tracked repos show a checkmark.

## Code Style Guidelines

**Server Components by Default:**
- Keep `page.tsx` files as Server Components (no `"use client"` directive)
- Extract interactive parts (useState, useEffect, event handlers) to separate client components
- Place client components in `/components` directory with `"use client"` directive

**Use useTransition for Loading States:**
- Use `useTransition` instead of `useState` for loading/pending states
- Wrap async operations in `startTransition` to get `isPending` state automatically
- This provides better UX with React 19's concurrent features

```tsx
// Bad
const [isLoading, setIsLoading] = useState(false);
const handleClick = async () => {
  setIsLoading(true);
  await doSomething();
  setIsLoading(false);
};

// Good
const [isPending, startTransition] = useTransition();
const handleClick = () => {
  startTransition(async () => {
    await doSomething();
  });
};
```

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
