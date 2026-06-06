"use client";

import {
  Button,
  buttonVariants,
  Label,
  Link,
  ListBox,
  Modal,
  Select,
  Typography,
} from "@heroui/react";
import { api } from "@web/lib/api-client";
import { Hash, RefreshCw, Server } from "lucide-react";
import {
  type Key,
  useEffect,
  useEffectEvent,
  useState,
  useTransition,
} from "react";

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

interface Channel {
  id: string;
  name: string;
  parentId: string | null;
}

interface GuildsResponse {
  guilds: Guild[];
}

interface ChannelsResponse {
  channels: Channel[];
}

interface ChannelsErrorResponse {
  error: string;
  inviteUrl?: string;
}

interface DiscordChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DiscordChannelDialog({
  open,
  onOpenChange,
  onSuccess,
}: DiscordChannelDialogProps) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const fetchGuilds = useEffectEvent(() => {
    startTransition(async () => {
      try {
        setError(null);
        const data = await api.get<GuildsResponse>("/channels/discord/guilds");
        setGuilds(data.guilds);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch servers",
        );
      }
    });
  });

  useEffect(() => {
    if (open) {
      fetchGuilds();
    }
  }, [open]);

  const fetchChannels = (guildId: string) => {
    startTransition(async () => {
      try {
        setError(null);
        setInviteUrl(null);
        const data = await api.get<ChannelsResponse | ChannelsErrorResponse>(
          `/channels/discord/guilds/${guildId}/channels`,
        );

        if ("channels" in data) {
          setChannels(data.channels);
        }
      } catch (err) {
        if (err && typeof err === "object" && "inviteUrl" in err) {
          setInviteUrl((err as ChannelsErrorResponse).inviteUrl ?? null);
          setError("Bot needs to be added to this server first");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to fetch channels",
          );
        }
      }
    });
  };

  const handleGuildSelect = (key: Key | null) => {
    if (key === null) return;
    const guildId = String(key);
    const guild = guilds.find((selectedGuild) => selectedGuild.id === guildId);
    setSelectedGuild(guild ?? null);
    setSelectedChannel(null);
    setChannels([]);
    setInviteUrl(null);
    setError(null);

    if (guild?.botPresent) {
      fetchChannels(guildId);
    } else if (guild) {
      setInviteUrl(
        `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=2048&scope=bot&guild_id=${guildId}`,
      );
    }
  };

  const handleChannelSelect = (key: Key | null) => {
    if (key === null) return;
    const channelId = String(key);
    const channel = channels.find(
      (selectedChannel) => selectedChannel.id === channelId,
    );
    setSelectedChannel(channel ?? null);
  };

  const handleSave = () => {
    if (!selectedGuild || !selectedChannel) return;

    startSaving(async () => {
      try {
        await api.post("/channels/discord/channels", {
          guildId: selectedGuild.id,
          guildName: selectedGuild.name,
          channelId: selectedChannel.id,
          channelName: selectedChannel.name,
        });

        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save channel");
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setSelectedGuild(null);
      setSelectedChannel(null);
      setChannels([]);
      setError(null);
      setInviteUrl(null);
    }
  };

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Select Discord Channel</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {error && !inviteUrl && (
              <Typography type="body-sm" className="text-danger">
                {error}
              </Typography>
            )}

            <div className="flex items-end gap-2">
              <Select
                selectedKey={selectedGuild?.id ?? null}
                onSelectionChange={handleGuildSelect}
                isDisabled={isPending}
                placeholder="Select a server"
              >
                <Label>Server</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {guilds.map((guild) => (
                      <ListBox.Item
                        key={guild.id}
                        id={guild.id}
                        textValue={guild.name}
                      >
                        <Server className="size-4" />
                        <Label>{guild.name}</Label>
                        {!guild.botPresent && (
                          <Typography type="body-xs" color="muted">
                            (Bot not added)
                          </Typography>
                        )}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Button
                isIconOnly
                variant="outline"
                aria-label="Refresh servers"
                onPress={fetchGuilds}
                isDisabled={isPending}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>

            {inviteUrl && (
              <div className="flex flex-col gap-2 rounded-lg border border-separator bg-surface-secondary p-4">
                <Typography type="body-sm" color="muted">
                  The ShipRadar bot needs to be added to this server.
                </Typography>
                <Link
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Add Bot to Server
                  <Link.Icon />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    selectedGuild && fetchChannels(selectedGuild.id)
                  }
                >
                  <RefreshCw className="size-4" />
                  I've added the bot
                </Button>
              </div>
            )}

            {selectedGuild?.botPresent && channels.length > 0 && (
              <Select
                selectedKey={selectedChannel?.id ?? null}
                onSelectionChange={handleChannelSelect}
                isDisabled={isPending}
                placeholder="Select a channel"
              >
                <Label>Channel</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {channels.map((channel) => (
                      <ListBox.Item
                        key={channel.id}
                        id={channel.id}
                        textValue={channel.name}
                      >
                        <Hash className="size-4" />
                        <Label>{channel.name}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}

            {selectedChannel && (
              <Button
                onPress={handleSave}
                isDisabled={isSaving}
                isPending={isSaving}
              >
                Save Channel
              </Button>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
