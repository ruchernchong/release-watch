"use client";

import {
  Avatar,
  Button,
  buttonVariants,
  Card,
  Chip,
  Link,
  Switch,
  Typography,
} from "@heroui/react";
import { NumberValue } from "@heroui-pro/react";
import { toggleTelegramChannel } from "@web/app/(dashboard)/dashboard/integrations/actions";
import { TelegramLinkDialog } from "@web/components/integrations/telegram-link-dialog";
import { AddRepoDialog } from "@web/components/repos/add-repo-dialog";
import {
  Bell,
  ExternalLink,
  FolderGit2,
  Github,
  Plus,
  Send,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { CategoryBadge } from "./category-badge";
import type { Release } from "./release-card";

interface DashboardStats {
  reposWatched: number;
  activeChannels: number;
  totalChannels: number;
}

interface TelegramChannel {
  chatId: string;
  enabled: boolean;
}

interface TelegramStatus {
  linked: boolean;
  channel?: TelegramChannel;
}

interface OverviewProps {
  stats: DashboardStats;
  releases: Release[];
  telegramStatus: TelegramStatus;
}

export function Overview({ stats, releases, telegramStatus }: OverviewProps) {
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [addRepoDialogOpen, setAddRepoDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticTelegram, setOptimisticTelegram] = useOptimistic(
    telegramStatus,
    (state, newEnabled: boolean) => ({
      ...state,
      channel: state.channel
        ? { ...state.channel, enabled: newEnabled }
        : undefined,
    }),
  );

  const handleTelegramToggle = (isSelected: boolean) => {
    const channel = optimisticTelegram.channel;
    if (!channel) return;
    startTransition(async () => {
      setOptimisticTelegram(isSelected);
      await toggleTelegramChannel(channel.chatId, isSelected);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography type="h1">Dashboard</Typography>
        <Typography type="body-sm" color="muted">
          Your release monitoring command center
        </Typography>
      </div>

      <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
        {/* Repos Watched */}
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <Card.Content>
              <Avatar>
                <Avatar.Fallback>
                  <FolderGit2 className="size-5" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <Typography type="body-xs" color="muted">
                  Watching
                </Typography>
                <NumberValue value={stats.reposWatched} />
                <Typography type="body-sm" color="muted">
                  repositories tracked
                </Typography>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Active Channels */}
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <Card.Content>
              <Avatar>
                <Avatar.Fallback>
                  <Bell className="size-5" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <Typography type="body-xs" color="muted">
                  Active
                </Typography>
                <div className="flex items-baseline gap-1">
                  <NumberValue value={stats.activeChannels} />
                  {stats.totalChannels > 0 && (
                    <Typography type="body-sm" color="muted">
                      / {stats.totalChannels}
                    </Typography>
                  )}
                </div>
                <Typography type="body-sm" color="muted">
                  notification channels
                </Typography>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Quick Add Repo */}
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <Card.Content>
              <Avatar>
                <Avatar.Fallback>
                  <Github className="size-5" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <Typography type="body-sm" weight="semibold">
                  Add Repository
                </Typography>
                <Typography type="body-sm" color="muted">
                  Start watching a new repo
                </Typography>
              </div>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="Add repository"
                onPress={() => setAddRepoDialogOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </Card.Content>
          </Card>
        </div>

        {/* Telegram Integration */}
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <Card.Content>
              <Avatar>
                <Avatar.Fallback>
                  <Send className="size-5" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Typography type="body-sm" weight="semibold">
                    Telegram
                  </Typography>
                  {optimisticTelegram.linked && (
                    <Chip color="success" variant="soft" size="sm">
                      <Chip.Label>Connected</Chip.Label>
                    </Chip>
                  )}
                </div>
                {optimisticTelegram.linked && (
                  <Link
                    href="https://t.me/ShipRadar_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Open bot
                    <Link.Icon />
                  </Link>
                )}
                {!optimisticTelegram.linked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setTelegramDialogOpen(true)}
                  >
                    Connect
                  </Button>
                )}
              </div>
              {optimisticTelegram.linked && (
                <Switch
                  aria-label="Toggle Telegram notifications"
                  isSelected={optimisticTelegram.channel?.enabled ?? false}
                  onChange={handleTelegramToggle}
                  isDisabled={isPending}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Recent Releases */}
        <div className="row-span-2 md:col-span-6 lg:col-span-8">
          <Card>
            <Card.Header>
              <Card.Title>Recent Releases</Card.Title>
            </Card.Header>
            <Card.Content>
              {releases.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Avatar>
                    <Avatar.Fallback>
                      <FolderGit2 className="size-5" />
                    </Avatar.Fallback>
                  </Avatar>
                  <Typography type="body-sm" color="muted">
                    No releases yet
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    Subscribe to repositories to see their latest releases here
                  </Typography>
                </div>
              )}
              {releases.length > 0 && (
                <div className="flex flex-col gap-3">
                  {releases.slice(0, 4).map((release) => (
                    <ReleaseItem
                      key={`${release.repoName}-${release.tagName}`}
                      release={release}
                    />
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      <TelegramLinkDialog
        open={telegramDialogOpen}
        onOpenChange={setTelegramDialogOpen}
      />
      <AddRepoDialog
        open={addRepoDialogOpen}
        onOpenChange={setAddRepoDialogOpen}
      />
    </div>
  );
}

interface ReleaseItemProps {
  release: Release;
}

function ReleaseItem({ release }: ReleaseItemProps) {
  const timeAgo = release.publishedAt && formatTimeAgo(release.publishedAt);

  return (
    <a
      href={release.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-secondary"
    >
      <Avatar size="sm">
        <Avatar.Fallback>
          <FolderGit2 className="size-4" />
        </Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Typography type="body-sm" weight="medium" truncate>
            {release.repoName}
          </Typography>
          <Typography.Code>{release.tagName}</Typography.Code>
          {release.aiAnalysis && (
            <CategoryBadge category={release.aiAnalysis.category} />
          )}
          <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {release.aiAnalysis?.summary && (
          <Typography type="body-xs" color="muted" truncate>
            {release.aiAnalysis.summary}
          </Typography>
        )}
        {timeAgo && (
          <Typography type="body-xs" color="muted">
            {timeAgo}
          </Typography>
        )}
      </div>
    </a>
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
