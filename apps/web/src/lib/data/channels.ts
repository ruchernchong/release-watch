import { getApi } from "@/lib/api";

export interface DiscordChannel {
  channelId: string;
  channelName: string;
  guildId: string;
  guildName: string;
  enabled: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

export interface GuildChannel {
  id: string;
  name: string;
  parentId: string | null;
}

export async function getTelegramStatus() {
  const api = await getApi();
  const res = await api.channels.telegram.status.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch Telegram status");
  }

  return res.json();
}

export async function getDiscordStatus() {
  const api = await getApi();
  const res = await api.channels.discord.status.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch Discord status");
  }

  return res.json();
}

export async function getDiscordGuilds() {
  const api = await getApi();
  const res = await api.channels.discord.guilds.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch Discord guilds");
  }

  return res.json();
}

export async function getDiscordGuildChannels(guildId: string) {
  const api = await getApi();
  const res = await api.channels.discord.guilds[":guildId"].channels.$get({
    param: { guildId },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch guild channels");
  }

  return res.json();
}
