"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  type BillingPeriod,
  highlights,
  pricing,
  tiers,
} from "@/components/pricing/pricing-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface PricingCardsProps {
  onCheckout?: () => void;
  compact?: boolean;
}

export function PricingCards({
  onCheckout,
  compact = false,
}: PricingCardsProps = {}) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [isPending, startTransition] = useTransition();
  const currentPricing = pricing[billingPeriod];

  const handleCheckout = () => {
    startTransition(async () => {
      await authClient.checkout({
        slug: `pro-${billingPeriod}`,
      });
      onCheckout?.();
    });
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="relative">
          <ToggleGroup
            type="single"
            value={billingPeriod}
            onValueChange={(value: string) => {
              if (value) setBillingPeriod(value as BillingPeriod);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="annual" className="relative">
              Annual
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge className="absolute -top-2 -right-4 bg-emerald-500 px-1.5 py-0 text-[10px] hover:bg-emerald-500">
            2 months free
          </Badge>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              "relative",
              tier.highlighted &&
                "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-lg shadow-primary/5",
            )}
          >
            {/* Glow effect for Pro */}
            {tier.highlighted && (
              <div className="absolute -top-px -right-px -left-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                {tier.highlighted && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    Best Value
                  </Badge>
                )}
              </div>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {/* Price */}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-4xl tracking-tight">
                    ${tier.price ?? currentPricing.price}
                  </span>
                  {tier.highlighted && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${currentPricing.regularPrice}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    /{tier.price === 0 ? "mo" : currentPricing.period}
                  </span>
                </div>

                {tier.highlighted && (
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="secondary"
                      className="w-fit bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      Launch Price — Save{" "}
                      {Math.round(
                        (1 -
                          currentPricing.price / currentPricing.regularPrice) *
                          100,
                      )}
                      %
                    </Badge>
                    {billingPeriod === "annual" && (
                      <p className="text-emerald-600 text-sm dark:text-emerald-400">
                        ${pricing.annual.monthlyEquivalent}/mo when billed
                        annually
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* CTA */}
              {tier.href ? (
                <Button size="lg" className="w-full" variant="outline" asChild>
                  <Link href={tier.href as "/login"}>{tier.cta}</Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isPending}
                >
                  {isPending ? "Loading..." : tier.cta}
                </Button>
              )}

              {/* Features */}
              <ul className="flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="size-3 text-primary" />
                      </div>
                    ) : (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                        <X className="size-3 text-muted-foreground" />
                      </div>
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        !feature.included && "text-muted-foreground",
                      )}
                    >
                      {feature.name}
                      {feature.value && (
                        <span className="ml-1 font-medium">
                          ({feature.value})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pro Highlights - hidden in compact mode */}
      {!compact && (
        <div className="mx-auto w-full">
          <h2 className="mb-8 text-center font-bold text-2xl">
            Everything in Pro
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((highlight) => (
              <Card key={highlight.title}>
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <highlight.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="whitespace-nowrap text-base">
                    {highlight.title}
                  </CardTitle>
                  <CardDescription>{highlight.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
