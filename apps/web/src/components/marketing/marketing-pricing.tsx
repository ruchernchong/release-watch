"use client";

import {
  Button,
  buttonVariants,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import {
  type BillingPeriod,
  highlights,
  pricing,
  tiers,
} from "@web/components/pricing/pricing-data";
import { authClient } from "@web/lib/auth-client";
import { Check, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

export function MarketingPricing() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [isPending, startTransition] = useTransition();
  const currentPricing = pricing[billingPeriod];

  const handleSelectionChange = (keys: Set<string | number>) => {
    const [selected] = [...keys];
    if (selected) {
      setBillingPeriod(selected as BillingPeriod);
    }
  };

  const handleCheckout = () => {
    startTransition(async () => {
      await authClient.checkout({ slug: `pro-${billingPeriod}` });
    });
  };

  const savingsPercent = Math.round(
    (1 - currentPricing.price / currentPricing.regularPrice) * 100,
  );

  return (
    <div className="flex flex-col gap-12">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <ToggleButtonGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([billingPeriod])}
          onSelectionChange={handleSelectionChange}
        >
          <ToggleButton id="monthly">Monthly</ToggleButton>
          <ToggleButton id="annual">
            <ToggleButtonGroup.Separator />
            Annual
          </ToggleButton>
        </ToggleButtonGroup>
        <Chip color="success" variant="soft" size="sm">
          2 months free
        </Chip>
      </div>

      {/* Tier cards */}
      <div className="mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-2">
        {tiers.map((tier) => {
          const displayPrice = tier.price ?? currentPricing.price;
          return (
            <Card
              key={tier.name}
              variant={tier.highlighted ? "secondary" : "default"}
            >
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Card.Title>{tier.name}</Card.Title>
                  {tier.highlighted && (
                    <Chip color="accent" variant="soft" size="sm">
                      Best Value
                    </Chip>
                  )}
                </div>
                <Card.Description>{tier.description}</Card.Description>
              </Card.Header>

              <Card.Content className="flex flex-col gap-6">
                {/* Price */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-4xl text-foreground tabular-nums leading-none tracking-tight">
                      ${displayPrice}
                    </span>
                    {tier.highlighted && (
                      <span className="text-lg text-muted tabular-nums line-through">
                        ${currentPricing.regularPrice}
                      </span>
                    )}
                    <span className="text-muted">
                      /{tier.price === 0 ? "mo" : currentPricing.period}
                    </span>
                  </div>

                  {tier.highlighted && (
                    <div className="flex flex-col items-start gap-1">
                      <Chip color="success" variant="soft" size="sm">
                        Launch price — save {savingsPercent}%
                      </Chip>
                      {billingPeriod === "annual" && (
                        <p className="text-muted text-sm">
                          ${pricing.annual.monthlyEquivalent}/mo billed annually
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                {tier.href ? (
                  <Link
                    href={tier.href as Route}
                    className={buttonVariants({
                      variant: "outline",
                      fullWidth: true,
                    })}
                  >
                    {tier.cta}
                  </Link>
                ) : (
                  <Button
                    fullWidth
                    isPending={isPending}
                    onPress={handleCheckout}
                  >
                    {tier.cta}
                  </Button>
                )}

                {/* Features */}
                <ul className="flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
                          <X className="size-3" />
                        </span>
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-foreground text-sm"
                            : "text-muted text-sm"
                        }
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
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {/* Pro highlights */}
      <div className="mx-auto w-full max-w-4xl">
        <ItemCardGroup layout="grid" columns={2}>
          <ItemCardGroup.Header>
            <ItemCardGroup.Title>Everything in Pro</ItemCardGroup.Title>
          </ItemCardGroup.Header>
          {highlights.map((highlight) => (
            <ItemCard key={highlight.title}>
              <ItemCard.Icon>
                <highlight.icon className="size-5" />
              </ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title>{highlight.title}</ItemCard.Title>
                <ItemCard.Description>
                  {highlight.description}
                </ItemCard.Description>
              </ItemCard.Content>
            </ItemCard>
          ))}
        </ItemCardGroup>
      </div>
    </div>
  );
}
