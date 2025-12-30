"use client";

import { ExternalLink, Hash, Loader2, RefreshCw, Server } from "lucide-react";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

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

  const handleGuildSelect = (guildId: string) => {
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

  const handleChannelSelect = (channelId: string) => {
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Discord Channel</DialogTitle>
          <DialogDescription>
            Choose a server and channel for release notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && !inviteUrl && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="server-select">Server</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedGuild?.id}
                onValueChange={handleGuildSelect}
                disabled={isPending}
              >
                <SelectTrigger id="server-select" className="flex-1">
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <div className="flex items-center gap-2">
                        <Server className="size-4" />
                        {guild.name}
                        {!guild.botPresent && (
                          <span className="text-muted-foreground text-xs">
                            (Bot not added)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchGuilds}
                disabled={isPending}
              >
                <RefreshCw
                  className={`size-4 ${isPending ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {inviteUrl && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4">
              <p className="text-muted-foreground text-sm">
                The ReleaseWatch bot needs to be added to this server.
              </p>
              <Button variant="outline" asChild>
                <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Add Bot to Server
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedGuild && fetchChannels(selectedGuild.id)}
              >
                <RefreshCw className="size-4" />
                I've added the bot
              </Button>
            </div>
          )}

          {selectedGuild?.botPresent && channels.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="channel-select">Channel</Label>
              <Select
                value={selectedChannel?.id}
                onValueChange={handleChannelSelect}
                disabled={isPending}
              >
                <SelectTrigger id="channel-select">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <Hash className="size-4" />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedChannel && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Channel"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
