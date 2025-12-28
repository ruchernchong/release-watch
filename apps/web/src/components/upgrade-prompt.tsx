"use client";

import { Crown, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UpgradePromptProps {
  current: number;
  limit: number;
  label: string;
  dismissible?: boolean;
}

export function UpgradePrompt({
  current,
  limit,
  label,
  dismissible = true,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  if (!isNearLimit) return null;

  return (
    <div className="relative flex flex-col gap-4 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Crown className="size-5 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">
              {isAtLimit ? `${label} limit reached` : `Approaching ${label} limit`}
            </h4>
            <Badge
              variant={isAtLimit ? "destructive" : "secondary"}
              className="text-xs"
            >
              {current}/{limit}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {isAtLimit
              ? `You've reached your ${label} limit. Upgrade to Pro for unlimited access.`
              : `You're using ${current} of ${limit} ${label}. Upgrade to Pro for unlimited access.`}
          </p>
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex gap-3">
        <Button size="sm" asChild>
          <Link href="/pricing">Upgrade to Pro</Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href="/api/auth/checkout/pro-monthly">$3/mo →</a>
        </Button>
      </div>
    </div>
  );
}
