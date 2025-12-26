---
description: Naming conventions for components and files
---

# Component & File Naming Conventions

## Directory Structure

Organize by feature/domain, not by type:

```
components/
├── repos/
│   ├── table.tsx        # NOT repos-table.tsx
│   ├── form.tsx         # NOT add-repo-form.tsx
│   └── card.tsx
├── auth/
│   ├── login-form.tsx
│   └── oauth-buttons.tsx
└── ui/                  # Shared primitives (shadcn)
```

## Rules

1. **No redundant words** - Don't repeat context from the directory
   - `components/repos/table.tsx` NOT `repos-table.tsx`
   - `components/auth/form.tsx` NOT `auth-form.tsx`

2. **Short, descriptive names** - 1-2 words max
   - `table.tsx`, `list.tsx`, `card.tsx`, `form.tsx`
   - `dialog.tsx`, `dropdown.tsx`, `header.tsx`

3. **Use index.tsx for main exports** - When a directory has one primary component
   - `components/sidebar/index.tsx`

4. **Hyphenate multi-word names** - kebab-case for files
   - `login-form.tsx`, `oauth-buttons.tsx`

5. **Component names match file** - PascalCase export
   - `table.tsx` exports `Table` or `ReposTable`
   - `login-form.tsx` exports `LoginForm`

## Anti-patterns

- `watched-repos-table.tsx` - Too verbose, redundant
- `UserProfileCardComponent.tsx` - Never use "Component" suffix
- `reposTableContainer.tsx` - camelCase files, "Container" suffix
- `Table.tsx` - PascalCase files (use lowercase)

## Examples

```
# Good
components/repos/table.tsx          → export function ReposTable()
components/subscriptions/list.tsx   → export function SubscriptionList()
components/dashboard/stats.tsx      → export function DashboardStats()

# Bad
components/repos/repos-table.tsx
components/subscriptions/subscription-list-component.tsx
components/dashboard/DashboardStatsCard.tsx
```
