"use server";

import { revalidatePath } from "next/cache";
import { getApi } from "@/lib/api";

// Telegram Actions

export async function generateTelegramCode() {
  const api = await getApi();
  const res = await api.channels.telegram.generate.$post();

  if (!res.ok) {
    throw new Error("Failed to generate Telegram link code");
  }

  return res.json();
}

export async function toggleTelegramChannel(chatId: string, enabled: boolean) {
  const api = await getApi();
  const res = await api.channels.telegram.toggle.$patch({
    json: { chatId, enabled },
  });

  if (!res.ok) {
    throw new Error("Failed to toggle Telegram channel");
  }

  revalidatePath("/dashboard/integrations");
  return res.json();
}

// Discord Actions

export async function addDiscordChannel(data: {
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
}) {
  const api = await getApi();
  const res = await api.channels.discord.channels.$post({
    json: data,
  });

  if (!res.ok) {
    throw new Error("Failed to add Discord channel");
  }

  revalidatePath("/dashboard/integrations");
  return res.json();
}

export async function removeDiscordChannel(channelId: string) {
  const api = await getApi();
  const res = await api.channels.discord.channels[":channelId"].$delete({
    param: { channelId },
  });

  if (!res.ok) {
    throw new Error("Failed to remove Discord channel");
  }

  revalidatePath("/dashboard/integrations");
  return res.json();
}

export async function toggleDiscordChannel(
  channelId: string,
  enabled: boolean,
) {
  const api = await getApi();
  const res = await api.channels.discord.toggle.$patch({
    json: { channelId, enabled },
  });

  if (!res.ok) {
    throw new Error("Failed to toggle Discord channel");
  }

  revalidatePath("/dashboard/integrations");
  return res.json();
}
