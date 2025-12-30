"use client";

import {
  CalendarClock,
  CreditCard,
  Crown,
  ExternalLink,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useTransition } from "react";
import { PricingDialog } from "@/components/pricing/pricing-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserTier } from "@/hooks/use-user-tier";
import { authClient } from "@/lib/auth-client";

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

  const handleManageSubscription = async () => {
    const result = await authClient.customer.portal();
    if (result.data?.url) {
      window.open(result.data.url, "_blank");
    }
  };

  const handleQuickCheckout = () => {
    startTransition(async () => {
      await authClient.checkout({ slug: "pro-monthly" });
    });
  };

  if (isTierPending) {
    return (
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/5">
            <CreditCard className="size-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Manage your subscription and billing.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-6">
          {/* Current Plan */}
          <div className="flex items-start justify-between rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-background shadow-sm">
                {isProTier ? (
                  <Crown className="size-6 text-yellow-500" />
                ) : (
                  <Sparkles className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">
                    {isProTier ? "Pro" : "Free"} Plan
                  </h4>
                  {isProTier && isSubscriptionActive && (
                    <Badge
                      className={
                        isSubscriptionCanceling
                          ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
                          : "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400"
                      }
                    >
                      {isSubscriptionCanceling ? "Canceling" : "Active"}
                    </Badge>
                  )}
                </div>
                {isProTier && isSubscriptionActive ? (
                  <div className="flex flex-col gap-1 text-muted-foreground text-sm">
                    <p>Billed {isBilledAnnually ? "annually" : "monthly"}</p>
                    {currentPeriodEnd && (
                      <p>
                        {isSubscriptionCanceling
                          ? "Access until: "
                          : "Next billing date: "}
                        {currentPeriodEnd.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    25 repos, 25 AI summaries/month, 7-day history
                  </p>
                )}
              </div>
            </div>

            {isProTier && isSubscriptionActive && !isSubscriptionCanceling && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
              >
                Manage
                <ExternalLink className="ml-2 size-3" />
              </Button>
            )}
          </div>

          {/* Cancellation Context Banner */}
          {isSubscriptionCanceling && currentPeriodEnd && (
            <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent">
              {/* Subtle top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

              <div className="flex flex-col gap-5 p-5">
                {/* Header with countdown */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                      <CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                        Your Pro access ends soon
                      </h4>
                      <p className="text-amber-700/80 text-sm dark:text-amber-300/70">
                        You still have full access until{" "}
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          {currentPeriodEnd.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Days countdown pill */}
                  <div className="flex flex-col items-center rounded-lg bg-amber-500/10 px-3 py-1.5">
                    <span className="font-bold text-2xl text-amber-600 tabular-nums dark:text-amber-400">
                      {daysRemaining}
                    </span>
                    <span className="text-[10px] text-amber-600/70 uppercase tracking-wider dark:text-amber-400/60">
                      {daysRemaining === 1 ? "day left" : "days left"}
                    </span>
                  </div>
                </div>

                {/* What you'll lose section */}
                <div className="rounded-lg bg-amber-950/5 p-4 dark:bg-amber-950/20">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingDown className="size-4 text-amber-600/70 dark:text-amber-400/60" />
                    <span className="font-medium text-amber-800 text-sm dark:text-amber-200">
                      After expiration, you&apos;ll lose access to:
                    </span>
                  </div>
                  <ul className="grid gap-2 text-amber-700/80 text-sm sm:grid-cols-2 dark:text-amber-300/70">
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-amber-500/50" />
                      Unlimited repositories
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-amber-500/50" />
                      Unlimited AI summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-amber-500/50" />
                      90-day notification history
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-amber-500/50" />
                      GitHub stars import
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleQuickCheckout}
                    disabled={isPending}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 shadow-lg transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-500/30"
                  >
                    <RefreshCw
                      className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`}
                    />
                    {isPending ? "Processing..." : "Resubscribe to Pro"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManageSubscription}
                    className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    Manage billing
                    <ExternalLink className="ml-2 size-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade CTA for Free users */}
          {isFreeTier && (
            <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Crown className="size-5 text-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h4 className="font-medium">Upgrade to Pro</h4>
                  <p className="text-muted-foreground text-sm">
                    Unlock unlimited repos, unlimited AI summaries, 90-day
                    notification history, and more.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <PricingDialog>
                  <Button>View Plans</Button>
                </PricingDialog>
                <Button
                  variant="outline"
                  onClick={handleQuickCheckout}
                  disabled={isPending}
                >
                  {isPending ? "Loading..." : "Subscribe — $3/mo"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
