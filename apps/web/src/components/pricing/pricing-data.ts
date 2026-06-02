import type { LucideIcon } from "lucide-react";
import { History, Sparkles, Star, Zap } from "lucide-react";

export type BillingPeriod = "monthly" | "annual";

export const pricing = {
  monthly: { price: 3, regularPrice: 5, period: "mo" },
  annual: { price: 30, regularPrice: 50, period: "yr", monthlyEquivalent: 2.5 },
} as const;

export interface Feature {
  name: string;
  value?: string;
  included: boolean;
}

export interface Tier {
  name: string;
  description: string;
  price?: number;
  features: Feature[];
  cta: string;
  href?: string;
  highlighted: boolean;
}

export const tiers: Tier[] = [
  {
    name: "Free",
    description: "For developers getting started",
    price: 0,
    features: [
      { name: "Tracked repositories", value: "25", included: true },
      { name: "AI summaries per month", value: "25", included: true },
      { name: "Webhooks", value: "1", included: true },
      { name: "Telegram notifications", included: true },
      { name: "Discord notifications", included: true },
      { name: "Email notifications", included: true },
      { name: "Notification history", value: "7 days", included: true },
      { name: "GitHub stars import", included: false },
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For power users who need more",
    features: [
      { name: "Tracked repositories", value: "Unlimited", included: true },
      { name: "AI summaries per month", value: "Unlimited", included: true },
      { name: "Webhooks", value: "5", included: true },
      { name: "Telegram notifications", included: true },
      { name: "Discord notifications", included: true },
      { name: "Email notifications", included: true },
      { name: "Notification history", value: "90 days", included: true },
      { name: "GitHub stars import", included: true },
    ],
    cta: "Subscribe",
    highlighted: true,
  },
];

export interface Highlight {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const highlights: Highlight[] = [
  {
    icon: Zap,
    title: "Unlimited repos",
    description: "Track as many repositories as you need",
  },
  {
    icon: Sparkles,
    title: "Unlimited AI",
    description: "AI-powered release summaries without limits",
  },
  {
    icon: History,
    title: "Extended history",
    description: "90 days of notification history vs 7 days",
  },
  {
    icon: Star,
    title: "Stars import",
    description: "Bulk import from your GitHub starred repos",
  },
];
