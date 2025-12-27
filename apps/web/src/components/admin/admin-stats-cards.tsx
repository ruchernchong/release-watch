"use client";

import { Bell, FolderGit2, Send, Tag, Users } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

interface AdminStats {
  uniqueUsers: number;
  reposWatched: number;
  reposTracked: number;
  notificationsSent: number;
  releasesNotified: number;
}

export function AdminStatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchStats = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await api.get<AdminStats>("/admin/stats");
        setStats(data);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["s0", "s1", "s2", "s3", "s4"].map((id) => (
          <AdminStatsCardSkeleton key={id} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <AdminStatsCard
        icon={Users}
        iconBg="bg-blue-500"
        label="Total Users"
        value={stats.uniqueUsers}
        delay={0}
      />
      <AdminStatsCard
        icon={FolderGit2}
        iconBg="bg-emerald-500"
        label="Repos Watched"
        value={stats.reposWatched}
        delay={1}
      />
      <AdminStatsCard
        icon={Bell}
        iconBg="bg-amber-500"
        label="Repos Tracked"
        value={stats.reposTracked}
        delay={2}
      />
      <AdminStatsCard
        icon={Send}
        iconBg="bg-purple-500"
        label="Notifications"
        value={stats.notificationsSent}
        delay={3}
      />
      <AdminStatsCard
        icon={Tag}
        iconBg="bg-rose-500"
        label="Releases"
        value={stats.releasesNotified}
        delay={4}
      />
    </div>
  );
}

interface AdminStatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
  delay?: number;
}

function AdminStatsCard({
  icon: Icon,
  iconBg,
  label,
  value,
  delay = 0,
}: AdminStatsCardProps) {
  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
      style={{ animationDelay: `${delay * 50}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-muted-foreground text-xs">{label}</p>
          <span className="font-bold font-mono text-2xl tracking-tight">
            {formatNumber(value)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminStatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
