"use client";

import {
  Bell,
  ExternalLink,
  FolderGit2,
  Github,
  Plus,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { TelegramLinkDialog } from "@/components/integrations/telegram-link-dialog";
import { AddRepoDialog } from "@/components/repos/add-repo-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CategoryBadge } from "./category-badge";
import type { Release } from "./release-card";

interface DashboardStats {
  reposWatched: number;
  activeChannels: number;
  totalChannels: number;
}

interface ReleasesResponse {
  releases: Release[];
}

interface TelegramChannel {
  chatId: string;
  enabled: boolean;
}

interface TelegramStatusResponse {
  linked: boolean;
  channel?: TelegramChannel;
}

export function BentoDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChannel, setTelegramChannel] =
    useState<TelegramChannel | null>(null);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [addRepoDialogOpen, setAddRepoDialogOpen] = useState(false);
  const [isStatsPending, startStatsTransition] = useTransition();
  const [isReleasesPending, startReleasesTransition] = useTransition();
  const [isTelegramPending, startTelegramTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();

  const fetchStats = useCallback(() => {
    startStatsTransition(async () => {
      try {
        const data = await api.get<DashboardStats>("/dashboard/stats");
        setStats(data);
      } catch {
        // Ignore errors
      }
    });
  }, []);

  const fetchReleases = useCallback(() => {
    startReleasesTransition(async () => {
      try {
        const data = await api.get<ReleasesResponse>("/dashboard/releases");
        setReleases(data.releases || []);
      } catch {
        // Ignore errors
      }
    });
  }, []);

  const fetchTelegramStatus = useCallback(() => {
    startTelegramTransition(async () => {
      try {
        const data = await api.get<TelegramStatusResponse>(
          "/channels/telegram/status",
        );
        setTelegramLinked(data.linked);
        if (data.linked && data.channel) {
          setTelegramChannel({
            chatId: data.channel.chatId,
            enabled: data.channel.enabled,
          });
        }
      } catch {
        // Ignore errors
      }
    });
  }, []);

  const handleTelegramToggle = (checked: boolean) => {
    if (!telegramChannel) return;
    const previousState = telegramChannel.enabled;
    setTelegramChannel({ ...telegramChannel, enabled: checked });

    startToggleTransition(async () => {
      try {
        await api.patch("/channels/telegram/toggle", {
          chatId: telegramChannel.chatId,
          enabled: checked,
        });
      } catch {
        setTelegramChannel({ ...telegramChannel, enabled: previousState });
      }
    });
  };

  useEffect(() => {
    fetchStats();
    fetchReleases();
    fetchTelegramStatus();
  }, [fetchStats, fetchReleases, fetchTelegramStatus]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Your release monitoring command center
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
        {/* Repos Watched - Feature Card */}
        <BentoCard
          className="md:col-span-3 lg:col-span-4"
          delay={0}
          variant="feature"
        >
          {isStatsPending || !stats ? (
            <BentoCardSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                  <FolderGit2 className="size-5 text-blue-500" />
                </div>
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  Watching
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold font-mono text-5xl tracking-tighter">
                  {stats.reposWatched}
                </span>
                <span className="text-muted-foreground text-sm">
                  repositories tracked
                </span>
              </div>
            </div>
          )}
        </BentoCard>

        {/* Active Channels */}
        <BentoCard
          className="md:col-span-3 lg:col-span-4"
          delay={1}
          variant="feature"
        >
          {isStatsPending || !stats ? (
            <BentoCardSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Bell className="size-5 text-emerald-500" />
                </div>
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  Active
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold font-mono text-5xl tracking-tighter">
                    {stats.activeChannels}
                  </span>
                  {stats.totalChannels > 0 && (
                    <span className="font-mono text-2xl text-muted-foreground">
                      /{stats.totalChannels}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground text-sm">
                  notification channels
                </span>
              </div>
            </div>
          )}
        </BentoCard>

        {/* Quick Add Repo */}
        <BentoCard
          className="md:col-span-3 lg:col-span-4"
          delay={2}
          variant="action"
          onClick={() => setAddRepoDialogOpen(true)}
        >
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10 transition-colors group-hover:bg-foreground/10">
                <Github className="size-5" />
              </div>
              <Plus className="size-5 text-muted-foreground transition-transform group-hover:rotate-90" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Add Repository</span>
              <span className="text-muted-foreground text-sm">
                Start watching a new repo
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Telegram Integration */}
        <BentoCard className="md:col-span-3 lg:col-span-4" delay={3}>
          {isTelegramPending ? (
            <BentoCardSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#0088cc]/10 ring-1 ring-[#0088cc]/20">
                  <Send className="size-5 text-[#0088cc]" />
                </div>
                {telegramLinked && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={telegramChannel?.enabled ?? false}
                      onCheckedChange={handleTelegramToggle}
                      disabled={isTogglePending}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Telegram</span>
                  {telegramLinked && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 text-xs dark:text-emerald-400">
                      Connected
                    </span>
                  )}
                </div>
                {telegramLinked ? (
                  <a
                    href="https://t.me/ReleaseWatch_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    <span>Open bot</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTelegramDialogOpen(true)}
                    className="w-fit"
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        </BentoCard>

        {/* Recent Releases - Large spanning card */}
        <BentoCard
          className="row-span-2 md:col-span-6 lg:col-span-8"
          delay={4}
          variant="content"
        >
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Releases</h2>
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                Latest
              </span>
            </div>

            {isReleasesPending ? (
              <div className="flex flex-1 flex-col gap-3">
                <ReleaseItemSkeleton />
                <ReleaseItemSkeleton />
                <ReleaseItemSkeleton />
              </div>
            ) : releases.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FolderGit2 className="size-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No releases yet</p>
                <p className="max-w-[200px] text-muted-foreground/70 text-xs">
                  Subscribe to repositories to see their latest releases here
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                {releases.slice(0, 4).map((release, index) => (
                  <ReleaseItem
                    key={`${release.repoName}-${release.tagName}`}
                    release={release}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </BentoCard>
      </div>

      {/* Dialogs */}
      <TelegramLinkDialog
        open={telegramDialogOpen}
        onOpenChange={setTelegramDialogOpen}
        onSuccess={fetchTelegramStatus}
      />

      <AddRepoDialog
        open={addRepoDialogOpen}
        onOpenChange={setAddRepoDialogOpen}
        onSuccess={() => {
          fetchStats();
          fetchReleases();
        }}
      />
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "feature" | "action" | "content";
  onClick?: () => void;
}

function BentoCard({
  children,
  className,
  delay = 0,
  variant = "default",
  onClick,
}: BentoCardProps) {
  const baseClasses = cn(
    "group relative overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all duration-300",
    "fade-in slide-in-from-bottom-2 animate-in",
    variant === "feature" && "bg-gradient-to-br from-card to-muted/30",
    variant === "action" && "border-dashed hover:border-solid",
    variant === "content" && "bg-card",
    className,
  );

  const interactiveClasses =
    "cursor-pointer hover:border-foreground/20 hover:shadow-lg hover:shadow-primary/5";

  const style = {
    animationDelay: `${delay * 75}ms`,
    animationFillMode: "backwards" as const,
  };

  const cardContent = (
    <>
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient overlay for feature cards */}
      {variant === "feature" && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02]" />
      )}

      <div className="relative z-10 h-full">{children}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(baseClasses, interactiveClasses)}
        style={style}
        onClick={onClick}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses} style={style}>
      {cardContent}
    </div>
  );
}

function BentoCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

interface ReleaseItemProps {
  release: Release;
  index: number;
}

function ReleaseItem({ release, index }: ReleaseItemProps) {
  const timeAgo = release.publishedAt
    ? formatTimeAgo(release.publishedAt)
    : null;

  return (
    <a
      href={release.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/item flex items-start gap-4 rounded-xl border border-transparent bg-muted/30 p-3 transition-all hover:border-border hover:bg-muted/50"
      style={{
        animationDelay: `${(index + 5) * 75}ms`,
        animationFillMode: "backwards",
      }}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border/50">
        <FolderGit2 className="size-4 text-muted-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {release.repoName}
          </span>
          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            {release.tagName}
          </code>
          {release.aiAnalysis && (
            <CategoryBadge category={release.aiAnalysis.category} />
          )}
          <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100" />
        </div>

        {release.aiAnalysis?.summary && (
          <p className="line-clamp-1 text-muted-foreground text-xs">
            {release.aiAnalysis.summary}
          </p>
        )}

        {timeAgo && (
          <span className="text-muted-foreground/70 text-xs">{timeAgo}</span>
        )}
      </div>
    </a>
  );
}

function ReleaseItemSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-muted/30 p-3">
      <Skeleton className="size-10 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}
