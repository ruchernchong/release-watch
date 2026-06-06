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
      <Card.Header>
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
      <Card.Content>
        {/* Current Plan */}
        <div className="flex items-start justify-between rounded-lg border border-separator p-4">
          <div className="flex items-start gap-4">
            <Avatar>
              <Avatar.Fallback>
                {isProTier && <Crown className="size-5 text-warning" />}
                {!isProTier && <Sparkles className="size-5" />}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Typography type="h6">
                  {isProTier ? "Pro" : "Free"} Plan
                </Typography>
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
              </div>
              {isProTier && isSubscriptionActive && (
                <div className="flex flex-col gap-1">
                  <Typography type="body-sm" color="muted">
                    Billed {isBilledAnnually ? "annually" : "monthly"}
                  </Typography>
                  {currentPeriodEnd && (
                    <Typography type="body-sm" color="muted">
                      {isSubscriptionCanceling
                        ? "Access until: "
                        : "Next billing date: "}
                      {currentPeriodEnd.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  )}
                </div>
              )}
              {!(isProTier && isSubscriptionActive) && (
                <Typography type="body-sm" color="muted">
                  25 repos, 25 AI summaries/month, 7-day history
                </Typography>
              )}
            </div>
          </div>

          {isProTier && isSubscriptionActive && !isSubscriptionCanceling && (
            <Button
              variant="outline"
              size="sm"
              onPress={handleManageSubscription}
            >
              Manage
              <Link.Icon />
            </Button>
          )}
        </div>

        {/* Cancellation Context Banner */}
        {isSubscriptionCanceling && currentPeriodEnd && (
          <div className="flex flex-col gap-5 rounded-xl border border-warning/20 bg-warning/5 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar>
                  <Avatar.Fallback>
                    <CalendarClock className="size-5 text-warning" />
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <Typography type="body-sm" weight="semibold">
                    Your Pro access ends soon
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    You still have full access until{" "}
                    <Typography type="body-sm" weight="medium">
                      {currentPeriodEnd.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  </Typography>
                </div>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-warning/10 px-3 py-1.5">
                <Typography type="h6">{daysRemaining}</Typography>
                <Typography type="body-xs" color="muted">
                  {daysRemaining === 1 ? "day left" : "days left"}
                </Typography>
              </div>
            </div>

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

            <div className="flex items-center gap-3">
              <Button
                onPress={handleQuickCheckout}
                isDisabled={isPending}
                isPending={isPending}
              >
                <RefreshCw className="size-4" />
                Resubscribe to Pro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleManageSubscription}
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
            <div className="flex items-start gap-4">
              <Avatar>
                <Avatar.Fallback>
                  <Crown className="size-5" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-1">
                <Typography type="body-sm" weight="medium">
                  Upgrade to Pro
                </Typography>
                <Typography type="body-sm" color="muted">
                  Unlock unlimited repos, unlimited AI summaries, 90-day
                  notification history, and more.
                </Typography>
              </div>
            </div>
            <div className="flex gap-3">
              <PricingDialog>
                <Button>View Plans</Button>
              </PricingDialog>
              <Button
                variant="outline"
                onPress={handleQuickCheckout}
                isDisabled={isPending}
                isPending={isPending}
              >
                Subscribe — $3/mo
              </Button>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
