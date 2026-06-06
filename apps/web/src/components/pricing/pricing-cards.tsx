"use client";

// TODO(stripe): Button is needed again when the Pro checkout CTA below is
// re-enabled against the billing provider.
import {
  buttonVariants,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import {
  type BillingPeriod,
  highlights,
  pricing,
  tiers,
} from "@web/components/pricing/pricing-data";
import { Check, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

interface PricingCardsProps {
  // TODO(stripe): consumed by the commented-out checkout handler below; kept so
  // callers (e.g. PricingDialog) keep type-checking until billing is re-enabled.
  onCheckout?: () => void;
  compact?: boolean;
}

export function PricingCards({ compact = false }: PricingCardsProps = {}) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const currentPricing = pricing[billingPeriod];

  const handleSelectionChange = (keys: Set<string | number>) => {
    const [selected] = [...keys];
    if (selected) {
      setBillingPeriod(selected as BillingPeriod);
    }
  };

  // TODO(stripe): re-implement checkout against the billing provider. This
  // called Polar's authClient.checkout() and then invoked onCheckout?.().
  // const handleCheckout = () => {
  //   startTransition(async () => {
  //     await authClient.checkout({ slug: `pro-${billingPeriod}` });
  //     onCheckout?.();
  //   });
  // };

  const savingsPercent = Math.round(
    (1 - currentPricing.price / currentPricing.regularPrice) * 100,
  );

  return (
    <div className="flex flex-col gap-12">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <ToggleButtonGroup
          aria-label="Billing period"
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
                        <Typography type="body-sm" color="muted">
                          ${pricing.annual.monthlyEquivalent}/mo billed annually
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                {tier.href && (
                  <Link
                    href={tier.href as Route}
                    className={buttonVariants({
                      variant: "outline",
                      fullWidth: true,
                    })}
                  >
                    {tier.cta}
                  </Link>
                )}
                {/* TODO(stripe): re-enable the Pro checkout CTA once billing is wired up.
                {!tier.href && (
                  <Button fullWidth isPending={isPending} onPress={handleCheckout}>
                    {tier.cta}
                  </Button>
                )} */}

                {/* Features */}
                <ul className="flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      {feature.included && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                          <Check className="size-3" />
                        </span>
                      )}
                      {!feature.included && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
                          <X className="size-3" />
                        </span>
                      )}
                      <Typography
                        type="body-sm"
                        color={feature.included ? "default" : "muted"}
                      >
                        {feature.name}
                        {feature.value && (
                          <span className="ml-1 font-medium">
                            ({feature.value})
                          </span>
                        )}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {/* Pro highlights - hidden in compact mode */}
      {!compact && (
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
      )}
    </div>
  );
}
