"use client";

import { Bell, FolderGit2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  reposWatched: number;
  activeChannels: number;
  totalChannels: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchStats = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Ignore errors
      }
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isPending || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatsCard
        icon={FolderGit2}
        iconBg="bg-blue-500"
        label="Repos Watched"
        value={stats.reposWatched}
        delay={0}
      />
      <StatsCard
        icon={Bell}
        iconBg="bg-emerald-500"
        label="Active Channels"
        value={stats.activeChannels}
        suffix={stats.totalChannels > 0 ? `/ ${stats.totalChannels}` : undefined}
        delay={1}
      />
    </div>
  );
}

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
}

function StatsCard({ icon: Icon, iconBg, label, value, suffix, delay = 0 }: StatsCardProps) {
  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Subtle dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex size-12 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="size-6 text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold tracking-tight">
              {value}
            </span>
            {suffix && (
              <span className="font-mono text-muted-foreground text-lg">{suffix}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}
