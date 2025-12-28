import { useCallback, useEffect, useState, useTransition } from "react";
import { authClient, useSession } from "@/lib/auth-client";

export type UserTier = "free" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "none";

export interface TierLimits {
  maxRepos: number;
  maxAiSummaries: number;
  maxWebhooks: number;
  notificationHistoryDays: number;
  hasGitHubStarsImport: boolean;
}

export interface UserTierInfo {
  tier: UserTier;
  limits: TierLimits;
  isPending: boolean;
  error: string | null;
  billingPeriod?: "monthly" | "annual";
  currentPeriodEnd?: Date;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  refetch: () => void;
}

const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    maxRepos: 25,
    maxAiSummaries: 25,
    maxWebhooks: 1,
    notificationHistoryDays: 7,
    hasGitHubStarsImport: false,
  },
  pro: {
    maxRepos: Infinity,
    maxAiSummaries: Infinity,
    maxWebhooks: 5,
    notificationHistoryDays: 90,
    hasGitHubStarsImport: true,
  },
};

export function useUserTier(): UserTierInfo {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [tier, setTier] = useState<UserTier>("free");
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<
    "monthly" | "annual" | undefined
  >();
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | undefined>();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("none");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  const fetchSubscription = useCallback(() => {
    if (!session?.user) {
      setTier("free");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);

        // Use customer.state() for comprehensive subscription info
        const { data: customerState } = await authClient.customer.state();

        const activeSubscriptions = customerState?.activeSubscriptions ?? [];
        const activeSubscription = activeSubscriptions[0];

        if (activeSubscription) {
          const isActive = activeSubscription.status === "active";
          const isCanceling = activeSubscription.cancelAtPeriodEnd === true;

          setTier("pro");
          setSubscriptionStatus(isActive ? "active" : "none");
          setCancelAtPeriodEnd(isCanceling);

          const interval = activeSubscription.recurringInterval;
          setBillingPeriod(interval === "year" ? "annual" : "monthly");

          if (activeSubscription.currentPeriodEnd) {
            setCurrentPeriodEnd(new Date(activeSubscription.currentPeriodEnd));
          }
        } else {
          setTier("free");
          setSubscriptionStatus("none");
          setCancelAtPeriodEnd(false);
          setBillingPeriod(undefined);
          setCurrentPeriodEnd(undefined);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
        setError("Failed to load subscription status");
        setTier("free");
      }
    });
  }, [session?.user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    tier,
    limits: TIER_LIMITS[tier],
    isPending,
    error,
    billingPeriod,
    currentPeriodEnd,
    subscriptionStatus,
    cancelAtPeriodEnd,
    refetch: fetchSubscription,
  };
}
