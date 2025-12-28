"use client";

import { Crown, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProBadgeProps {
  showLock?: boolean;
  size?: "sm" | "default";
}

export function ProBadge({ showLock = true, size = "default" }: ProBadgeProps) {
  const iconSize = size === "sm" ? "size-3" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/pricing">
            <Badge
              variant="secondary"
              className={`cursor-pointer gap-1 bg-yellow-500/10 text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400 ${textSize}`}
            >
              {showLock ? (
                <Lock className={iconSize} />
              ) : (
                <Crown className={iconSize} />
              )}
              Pro
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>This feature requires a Pro subscription</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ProFeatureProps {
  children: React.ReactNode;
  isPro: boolean;
  label?: string;
}

export function ProFeature({ children, isPro, label }: ProFeatureProps) {
  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <ProBadge size="sm" />
    </div>
  );
}
