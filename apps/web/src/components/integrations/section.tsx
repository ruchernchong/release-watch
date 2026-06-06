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
import { useNotifications } from "@web/hooks/use-notifications";
import { api } from "@web/lib/api-client";
import { signIn } from "@web/lib/auth-client";
import {
  Bell,
  BellOff,
  Hash,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
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
        <Typography type="h1">Integrations</Typography>
        <Typography color="muted">
          Connect your notification channels to receive release updates.
        </Typography>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <Card.Header>
            <Avatar>
              <Avatar.Fallback>
                <Send className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <Card.Title>Telegram</Card.Title>
              <Card.Description>
                Receive notifications via Telegram bot.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content>
            <Typography type="body-sm" color="muted">
              Link your Telegram account to receive release notifications
              directly in your chat.
            </Typography>
            {isPending && (
              <Button isDisabled isPending>
                Loading
              </Button>
            )}
            {!isPending && telegramError && (
              <div className="flex items-center gap-2">
                <Typography type="body-sm" className="text-danger">
                  {telegramError}
                </Typography>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={fetchTelegramStatus}
                >
                  Retry
                </Button>
              </div>
            )}
            {!isPending && !telegramError && telegramLinked && (
              <div className="flex items-center gap-2">
                <Chip color="success" variant="soft">
                  <Chip.Label>Connected</Chip.Label>
                </Chip>
                <Link
                  href="https://t.me/ShipRadar_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open Bot
                  <Link.Icon />
                </Link>
              </div>
            )}
            {!isPending && !telegramError && !telegramLinked && (
              <>
                <Button onPress={() => setTelegramDialogOpen(true)}>
                  <Send className="size-4" />
                  Link Telegram
                </Button>
                <TelegramLinkDialog
                  open={telegramDialogOpen}
                  onOpenChange={setTelegramDialogOpen}
                />
              </>
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Avatar>
              <Avatar.Fallback>
                <Bell className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <Card.Title>Browser Notifications</Card.Title>
              <Card.Description>
                Get notified directly in your browser.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content>
            <Typography type="body-sm" color="muted">
              Receive instant notifications in your browser when new releases
              are detected.
            </Typography>
            {!isSupported && (
              <Typography type="body-sm" color="muted">
                <BellOff className="inline size-4" /> Your browser doesn&apos;t
                support notifications
              </Typography>
            )}
            {isSupported && permission === "granted" && (
              <Chip color="success" variant="soft">
                <Chip.Label>Enabled</Chip.Label>
              </Chip>
            )}
            {isSupported && permission === "denied" && (
              <Typography type="body-sm" color="muted">
                <BellOff className="inline size-4" /> Notifications blocked.
                Enable in browser settings.
              </Typography>
            )}
            {isSupported &&
              permission !== "granted" &&
              permission !== "denied" && (
                <Button onPress={requestPermission}>
                  <Bell className="size-4" />
                  Enable Notifications
                </Button>
              )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Avatar>
              <Avatar.Fallback>
                <MessageCircle className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <Card.Title>Discord</Card.Title>
              <Card.Description>
                Get notified in your Discord server.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content>
            <Typography type="body-sm" color="muted">
              Add our bot to your Discord server to receive release
              notifications in any channel.
            </Typography>

            {isPending && (
              <Button isDisabled isPending>
                Loading
              </Button>
            )}
            {!isPending && discordError && (
              <div className="flex items-center gap-2">
                <Typography type="body-sm" className="text-danger">
                  {discordError}
                </Typography>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={fetchDiscordStatus}
                >
                  Retry
                </Button>
              </div>
            )}
            {!isPending && !discordError && !discordConnected && (
              <Button onPress={handleDiscordConnect}>
                <MessageCircle className="size-4" />
                Connect Discord
              </Button>
            )}
            {!isPending &&
              !discordError &&
              discordConnected &&
              discordChannels.length === 0 && (
                <>
                  <Chip color="success" variant="soft">
                    <Chip.Label>Discord Connected</Chip.Label>
                  </Chip>
                  <Button
                    onPress={() => setDiscordDialogOpen(true)}
                    variant="outline"
                  >
                    <Plus className="size-4" />
                    Add Channel
                  </Button>
                </>
              )}
            {!isPending &&
              !discordError &&
              discordConnected &&
              discordChannels.length > 0 && (
                <div className="flex flex-col gap-3">
                  {discordChannels.map((channel) => (
                    <div
                      key={channel.channelId}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="size-4 text-muted" />
                        <Typography type="body-sm" weight="medium">
                          {channel.channelName}
                        </Typography>
                        <Typography type="body-sm" color="muted">
                          in {channel.guildName}
                        </Typography>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={`Toggle ${channel.channelName}`}
                          isSelected={channel.enabled}
                          onChange={(enabled) =>
                            handleToggleDiscordChannel(
                              channel.channelId,
                              enabled,
                            )
                          }
                        >
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label="Remove channel"
                          onPress={() =>
                            handleRemoveDiscordChannel(channel.channelId)
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onPress={() => setDiscordDialogOpen(true)}
                    variant="outline"
                    size="sm"
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
          </Card.Content>
        </Card>
      </div>
    </>
  );
}
