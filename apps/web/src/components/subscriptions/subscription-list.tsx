"use client";

import { Github, Trash2 } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

interface Subscription {
  id: string;
  repoName: string;
  lastNotifiedTag: string | null;
  createdAt: string;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
}

export interface SubscriptionListRef {
  refresh: () => void;
}

export const SubscriptionList = forwardRef<SubscriptionListRef>(
  function SubscriptionList(_props, ref) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isPending, startTransition] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const fetchSubscriptions = useEffectEvent(async () => {
      try {
        const data = await api.get<SubscriptionsResponse>("/subscriptions");
        setSubscriptions(data.subscriptions || []);
        setHasLoaded(true);
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      }
    });

    useImperativeHandle(ref, () => ({
      refresh: () => {
        startTransition(() => {
          fetchSubscriptions();
        });
      },
    }));

    useEffect(() => {
      startTransition(() => {
        fetchSubscriptions();
      });
    }, []);

    const handleDelete = async (id: string) => {
      setDeletingId(id);
      try {
        await api.delete(`/subscriptions/${id}`);
        setSubscriptions((subs) => subs.filter((s) => s.id !== id));
      } catch (error) {
        console.error("Failed to delete subscription:", error);
      } finally {
        setDeletingId(null);
      }
    };

    if (!hasLoaded && isPending) {
      return (
        <p className="text-muted-foreground text-sm">
          Loading subscriptions...
        </p>
      );
    }

    if (subscriptions.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          No subscriptions yet. Add a repository to get started.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              <Github className="size-4 text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <a
                  href={`https://github.com/${sub.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline"
                >
                  {sub.repoName}
                </a>
                {sub.lastNotifiedTag && (
                  <span className="text-muted-foreground text-xs">
                    Last notified: {sub.lastNotifiedTag}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(sub.id)}
              disabled={deletingId === sub.id}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  },
);
