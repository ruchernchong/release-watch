---
name: pricing-tiers
description: ReleaseWatch subscription tiers, pricing strategy, and Pro feature definitions. Use when discussing pricing plans, comparing tiers, implementing tier-gated features, or setting up Polar integration.
---

# Subscription Tiers

## Tier Comparison

| Feature | Free | Pro |
|---------|------|-----|
| Repos tracked | 25 | Unlimited |
| AI summaries | 25/month | Unlimited |
| Channels | Telegram, Discord, Email | All + webhooks |
| Webhooks | 1 | 5 |
| Check frequency | 15 min | 15 min |
| Release type filters | Yes | Yes |
| Notification history | - | 30 days |
| GitHub stars import | - | Yes |

## Pricing Strategy

**Launch (Early Adopters):**
- Monthly: $X/mo (locked in forever)
- Annual: $Y/yr

**Regular (After Launch):**
- Monthly: $X+2/mo
- Annual: $Y+18/yr

Pricing TBD - finalize after core features are built.

## Grandfathering

Polar handles automatically:
1. Create products at launch price
2. After launch period, update prices in Polar dashboard
3. Existing subscribers keep original price forever

## Pro Features

### Notification History
- Store notification events in `notification_history` table
- `GET /notifications/history` endpoint (Pro only)
- 30-day retention
- UI: `/dashboard/history`

### Webhook Integrations
- Free: 1 webhook
- Pro: 5 webhooks
- Store in `user_webhooks` table
- Fire on release notification

### GitHub Stars Import
- Pro-only feature
- Fetch starred repos via GitHub API
- UI: Cherry-pick which repos to import

## Database Schema

```typescript
// packages/database/src/schema/user-limits.ts
export const userLimits = pgTable("user_limits", {
  userId: text().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tier: text().default("free").notNull(), // 'free' | 'pro'
  aiSummariesUsed: integer().default(0).notNull(),
  aiSummariesResetAt: timestamp(), // Reset monthly
});
```

## Limit Enforcement

```typescript
const TIER_LIMITS = {
  free: { maxRepos: 25, maxAiSummaries: 25, maxWebhooks: 1 },
  pro: { maxRepos: Infinity, maxAiSummaries: Infinity, maxWebhooks: 5 },
};
```

Apply middleware to:
- `POST /repos` - Check repo count vs tier limit
- `POST /webhooks` - Check webhook count vs tier limit
- AI analysis in workflow - Check monthly AI summary usage

## Polar Integration

Products to create:
- `pro-monthly` (launch price)
- `pro-annual` (launch price)

Webhook handlers:
- `onSubscriptionCreated` → Update user tier to 'pro'
- `onSubscriptionCanceled` → Downgrade to 'free'

## UI Touchpoints

1. **Pricing page**: `/app/(marketing)/pricing/page.tsx`
2. **Upgrade prompts**: Show when approaching limits
3. **Settings**: Subscription management via Polar portal
4. **Feature teasers**: "Available with Pro" for gated features
