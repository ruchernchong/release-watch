"use client";

import {
  Avatar,
  Button,
  Card,
  Chip,
  Link,
  Skeleton,
  Typography,
} from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { PricingDialog } from "@web/components/pricing/pricing-dialog";
import { useUserTier } from "@web/hooks/use-user-tier";
import {
  CalendarClock,
  CreditCard,
  Crown,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useTransition } from "react";

export function SubscriptionSection() {
  const {
    tier,
    isPending: isTierPending,
    billingPeriod,
    currentPeriodEnd,
    subscriptionStatus,
    cancelAtPeriodEnd,
    refetch,
  } = useUserTier();
  const [isPending, startTransition] = useTransition();
  const [checkout, setCheckout] = useQueryState("checkout", parseAsString);

  const isProTier = tier === "pro";
  const isFreeTier = tier === "free";
  const isBilledAnnually = billingPeriod === "annual";
  const isSubscriptionActive = subscriptionStatus === "active";
  const isSubscriptionCanceling = isSubscriptionActive && cancelAtPeriodEnd;

  const daysRemaining = currentPeriodEnd
    ? Math.max(
        0,
        Math.ceil(
          (currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  useEffect(() => {
    if (checkout === "success") {
      refetch();
      setCheckout(null);
    }
  }, [checkout, refetch, setCheckout]);

  // TODO(stripe): re-implement subscription management against the billing
  // provider. These previously called Polar's authClient.customer.portal() /
  // authClient.checkout(), which were removed with the Polar integration.
  const handleManageSubscription = () => {
    window.open("/pricing", "_blank");
  };

  const handleQuickCheckout = () => {
    startTransition(() => {
      window.location.href = "/pricing";
    });
  };

  if (isTierPending) {
    return (
      <Card>
        <Card.Header>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-32" />
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="items-start gap-4">
        <Avatar>
          <Avatar.Fallback>
            <CreditCard className="size-5" />
          </Avatar.Fallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <Card.Title>Subscription</Card.Title>
          <Card.Description>
            Manage your subscription and billing.
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="gap-6">
        <ItemCardGroup variant="transparent">
          <ItemCard variant="outline">
            <ItemCard.Icon>
              {isProTier && <Crown className="size-5 text-warning" />}
              {!isProTier && <Sparkles className="size-5" />}
            </ItemCard.Icon>
            <ItemCard.Content>
              <ItemCard.Title>
                <span className="flex flex-wrap items-center gap-2">
                  {isProTier ? "Pro" : "Free"} Plan
                  {isProTier && isSubscriptionActive && (
                    <Chip
                      color={isSubscriptionCanceling ? "warning" : "success"}
                      variant="soft"
                      size="sm"
                    >
                      <Chip.Label>
                        {isSubscriptionCanceling ? "Canceling" : "Active"}
                      </Chip.Label>
                    </Chip>
                  )}
                </span>
              </ItemCard.Title>
              {isProTier && isSubscriptionActive && (
                <ItemCard.Description>
                  <span className="flex flex-col gap-1">
                    <span>
                      Billed {isBilledAnnually ? "annually" : "monthly"}
                    </span>
                    {currentPeriodEnd && (
                      <span>
                        {isSubscriptionCanceling
                          ? "Access until: "
                          : "Next billing date: "}
                        {currentPeriodEnd.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </span>
                </ItemCard.Description>
              )}
              {!(isProTier && isSubscriptionActive) && (
                <ItemCard.Description>
                  25 repos, 25 AI summaries/month, 7-day history
                </ItemCard.Description>
              )}
            </ItemCard.Content>
            {isProTier && isSubscriptionActive && !isSubscriptionCanceling && (
              <ItemCard.Action>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onPress={handleManageSubscription}
                >
                  Manage
                  <Link.Icon />
                </Button>
              </ItemCard.Action>
            )}
          </ItemCard>
        </ItemCardGroup>

        {/* Cancellation Context Banner */}
        {isSubscriptionCanceling && currentPeriodEnd && (
          <div className="flex flex-col gap-5 rounded-xl border border-warning/20 bg-warning/5 p-5">
            <ItemCard variant="transparent" className="px-0">
              <ItemCard.Icon>
                <CalendarClock className="size-5 text-warning" />
              </ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title>Your Pro access ends soon</ItemCard.Title>
                <ItemCard.Description>
                  You still have full access until{" "}
                  <span className="font-medium text-foreground">
                    {currentPeriodEnd.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </ItemCard.Description>
              </ItemCard.Content>
              <ItemCard.Action>
                <div className="flex w-fit flex-col items-center rounded-lg bg-warning/10 px-3 py-1.5 sm:shrink-0">
                  <Typography type="h6">{daysRemaining}</Typography>
                  <Typography type="body-xs" color="muted">
                    {daysRemaining === 1 ? "day left" : "days left"}
                  </Typography>
                </div>
              </ItemCard.Action>
            </ItemCard>

            <div className="flex flex-col gap-3 rounded-lg bg-surface-secondary p-4">
              <Typography type="body-sm" weight="medium">
                <TrendingDown className="inline size-4 text-warning" /> After
                expiration, you&apos;ll lose access to:
              </Typography>
              <ul className="grid gap-2 sm:grid-cols-2">
                <li>
                  <Typography type="body-sm" color="muted">
                    • Unlimited repositories
                  </Typography>
                </li>
                <li>
                  <Typography type="body-sm" color="muted">
                    • Unlimited AI summaries
                  </Typography>
                </li>
                <li>
                  <Typography type="body-sm" color="muted">
                    • 90-day notification history
                  </Typography>
                </li>
                <li>
                  <Typography type="body-sm" color="muted">
                    • GitHub stars import
                  </Typography>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onPress={handleQuickCheckout}
                isDisabled={isPending}
                isPending={isPending}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="size-4" />
                Resubscribe to Pro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleManageSubscription}
                className="w-full sm:w-auto"
              >
                Manage billing
                <Link.Icon />
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade CTA for Free users */}
        {isFreeTier && (
          <div className="flex flex-col gap-4 rounded-lg border border-accent/20 bg-accent/5 p-4">
            <ItemCard variant="transparent" className="px-0">
              <ItemCard.Icon>
                <Crown className="size-5" />
              </ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title>Upgrade to Pro</ItemCard.Title>
                <ItemCard.Description>
                  Unlock unlimited repos, unlimited AI summaries, 90-day
                  notification history, and more.
                </ItemCard.Description>
              </ItemCard.Content>
            </ItemCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <PricingDialog>
                <Button className="w-full sm:w-auto">View Plans</Button>
              </PricingDialog>
              <Button
                variant="outline"
                onPress={handleQuickCheckout}
                isDisabled={isPending}
                isPending={isPending}
                className="w-full sm:w-auto"
              >
                Subscribe - $3/mo
              </Button>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
