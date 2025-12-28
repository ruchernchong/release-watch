"use client";

import { CreditCard, Crown, ExternalLink, Sparkles } from "lucide-react";
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
import { authClient } from "@/lib/auth-client";
import { useUserTier } from "@/hooks/use-user-tier";

export function SubscriptionSection() {
  const { tier, isLoading, billingPeriod, currentPeriodEnd } = useUserTier();

  const handleManageSubscription = async () => {
    const result = await authClient.customer.portal();
    if (result.data?.url) {
      window.open(result.data.url, "_blank");
    }
  };

  if (isLoading) {
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
                {tier === "pro" ? (
                  <Crown className="size-6 text-yellow-500" />
                ) : (
                  <Sparkles className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">
                    {tier === "pro" ? "Pro" : "Free"} Plan
                  </h4>
                  {tier === "pro" && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400">
                      Active
                    </Badge>
                  )}
                </div>
                {tier === "pro" ? (
                  <div className="flex flex-col gap-1 text-muted-foreground text-sm">
                    <p>
                      Billed {billingPeriod === "annual" ? "annually" : "monthly"}
                    </p>
                    {currentPeriodEnd && (
                      <p>
                        Next billing date:{" "}
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

            {tier === "pro" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
              >
                Manage
                <ExternalLink className="ml-2 size-3" />
              </Button>
            ) : null}
          </div>

          {/* Upgrade CTA for Free users */}
          {tier === "free" && (
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
                <Button variant="outline" asChild>
                  <a href="/api/auth/checkout/pro-monthly">
                    Subscribe — $3/mo
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
