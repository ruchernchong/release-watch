"use client";

import {
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Hash,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/use-notifications";
import { api } from "@/lib/api-client";
import { signIn } from "@/lib/auth-client";
import { DiscordChannelDialog } from "./discord-channel-dialog";
import { TelegramLinkDialog } from "./telegram-link-dialog";

interface TelegramStatusResponse {
  linked: boolean;
}

interface DiscordChannel {
  channelId: string;
  channelName: string;
  guildId: string;
  guildName: string;
  enabled: boolean;
}

interface DiscordStatusResponse {
  connected: boolean;
  channels: DiscordChannel[];
}

export function IntegrationsSection() {
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  const [discordConnected, setDiscordConnected] = useState<boolean | null>(
    null,
  );
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [discordDialogOpen, setDiscordDialogOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const { isSupported, permission, requestPermission } = useNotifications();

  const fetchTelegramStatus = useCallback(() => {
    startTransition(async () => {
      try {
        setTelegramError(null);
        const data = await api.get<TelegramStatusResponse>(
          "/channels/telegram/status",
        );
        setTelegramLinked(data.linked);
      } catch (err) {
        setTelegramError(
          err instanceof Error ? err.message : "Failed to check status",
        );
      }
    });
  }, []);

  const fetchDiscordStatus = useCallback(() => {
    startTransition(async () => {
      try {
        setDiscordError(null);
        const data = await api.get<DiscordStatusResponse>(
          "/channels/discord/status",
        );
        setDiscordConnected(data.connected);
        setDiscordChannels(data.channels);
      } catch (err) {
        setDiscordError(
          err instanceof Error ? err.message : "Failed to check status",
        );
      }
    });
  }, []);

  useEffect(() => {
    fetchTelegramStatus();
    fetchDiscordStatus();
  }, [fetchTelegramStatus, fetchDiscordStatus]);

  const handleDiscordConnect = () => {
    signIn.social({
      provider: "discord",
      callbackURL: "/dashboard/integrations",
    });
  };

  const handleToggleDiscordChannel = async (
    channelId: string,
    enabled: boolean,
  ) => {
    try {
      await api.patch("/channels/discord/toggle", { channelId, enabled });
      setDiscordChannels((previousChannels) =>
        previousChannels.map((channel) =>
          channel.channelId === channelId ? { ...channel, enabled } : channel,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle Discord channel:", err);
    }
  };

  const handleRemoveDiscordChannel = async (channelId: string) => {
    try {
      await api.delete(`/channels/discord/channels/${channelId}`);
      setDiscordChannels((previousChannels) =>
        previousChannels.filter((channel) => channel.channelId !== channelId),
      );
    } catch (err) {
      console.error("Failed to remove Discord channel:", err);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your notification channels to receive release updates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0088cc]">
                <Send className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <CardTitle>Telegram</CardTitle>
                <CardDescription>
                  Receive notifications via Telegram bot.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Link your Telegram account to receive release notifications
              directly in your chat.
            </p>
            {isPending ? (
              <Button disabled className="w-fit">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </Button>
            ) : telegramError ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-sm">
                  {telegramError}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTelegramStatus}
                >
                  Retry
                </Button>
              </div>
            ) : telegramLinked ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 text-sm dark:text-green-400">
                  <Check className="size-4" />
                  Connected
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://t.me/ReleaseWatch_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open Bot
                  </a>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => setTelegramDialogOpen(true)}
                  className="w-fit"
                >
                  <Send className="size-4" />
                  Link Telegram
                </Button>
                <TelegramLinkDialog
                  open={telegramDialogOpen}
                  onOpenChange={setTelegramDialogOpen}
                  onSuccess={fetchTelegramStatus}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                <Bell className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <CardTitle>Browser Notifications</CardTitle>
                <CardDescription>
                  Get notified directly in your browser.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Receive instant notifications in your browser when new releases
              are detected.
            </p>
            {!isSupported ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <BellOff className="size-4" />
                Your browser doesn&apos;t support notifications
              </div>
            ) : permission === "granted" ? (
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 text-sm dark:text-green-400">
                <Check className="size-4" />
                Enabled
              </div>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <BellOff className="size-4" />
                Notifications blocked. Enable in browser settings.
              </div>
            ) : (
              <Button onClick={requestPermission} className="w-fit">
                <Bell className="size-4" />
                Enable Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#5865F2]">
                <MessageCircle className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <CardTitle>Discord</CardTitle>
                <CardDescription>
                  Get notified in your Discord server.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Add our bot to your Discord server to receive release
              notifications in any channel.
            </p>

            {isPending ? (
              <Button disabled className="w-fit">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </Button>
            ) : discordError ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-sm">{discordError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDiscordStatus}
                >
                  Retry
                </Button>
              </div>
            ) : !discordConnected ? (
              <Button onClick={handleDiscordConnect} className="w-fit">
                <MessageCircle className="size-4" />
                Connect Discord
              </Button>
            ) : discordChannels.length === 0 ? (
              <>
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 text-sm w-fit dark:text-green-400">
                  <Check className="size-4" />
                  Discord Connected
                </div>
                <Button
                  onClick={() => setDiscordDialogOpen(true)}
                  variant="outline"
                  className="w-fit"
                >
                  <Plus className="size-4" />
                  Add Channel
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                {discordChannels.map((channel) => (
                  <div
                    key={channel.channelId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="size-4 text-muted-foreground" />
                      <span className="font-medium">{channel.channelName}</span>
                      <span className="text-muted-foreground text-sm">
                        in {channel.guildName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(enabled) =>
                          handleToggleDiscordChannel(channel.channelId, enabled)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleRemoveDiscordChannel(channel.channelId)
                        }
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => setDiscordDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="w-fit"
                >
                  <Plus className="size-4" />
                  Add Another Channel
                </Button>
              </div>
            )}

            <DiscordChannelDialog
              open={discordDialogOpen}
              onOpenChange={setDiscordDialogOpen}
              onSuccess={fetchDiscordStatus}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
