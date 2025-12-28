import { useCallback, useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

export type UserTier = "free" | "pro";

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
  isLoading: boolean;
  error: string | null;
  billingPeriod?: "monthly" | "annual";
  currentPeriodEnd?: Date;
  refetch: () => Promise<void>;
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
  const [tier, setTier] = useState<UserTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<
    "monthly" | "annual" | undefined
  >();
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | undefined>();

  const fetchSubscription = useCallback(async () => {
    if (!session?.user) {
      setTier("free");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: subscriptions } =
        await authClient.customer.subscriptions.list({
          query: {
            page: 1,
            limit: 10,
            active: true,
          },
        });

      if (subscriptions && subscriptions.length > 0) {
        const activeSubscription = subscriptions[0];
        setTier("pro");

        if (activeSubscription.recurringInterval === "year") {
          setBillingPeriod("annual");
        } else {
          setBillingPeriod("monthly");
        }

        if (activeSubscription.currentPeriodEnd) {
          setCurrentPeriodEnd(new Date(activeSubscription.currentPeriodEnd));
        }
      } else {
        setTier("free");
        setBillingPeriod(undefined);
        setCurrentPeriodEnd(undefined);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setError("Failed to load subscription status");
      setTier("free");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    tier,
    limits: TIER_LIMITS[tier],
    isLoading,
    error,
    billingPeriod,
    currentPeriodEnd,
    refetch: fetchSubscription,
  };
}
