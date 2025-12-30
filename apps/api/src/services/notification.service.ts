import type {
  ChannelConfig,
  ChannelType,
  NotificationPayload,
} from "@release-watch/types";
import type { Env } from "../types/env";
import { sendDiscordBotNotification } from "./discord.service";
import { sendTelegramNotification } from "./telegram.service";

export interface NotificationResult {
  channelType: ChannelType;
  success: boolean;
  error?: string;
}

/**
 * Send notifications to all enabled channels for a user.
 * Failures are isolated - one channel failing won't block others.
 */
export async function notifyUser(
  channels: ChannelConfig[],
  payload: NotificationPayload,
  env: Env,
): Promise<NotificationResult[]> {
  const enabledChannels = channels.filter((channel) => channel.enabled);

  if (enabledChannels.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    enabledChannels.map((channel) => sendToChannel(channel, payload, env)),
  );

  return results.map((result, index) => {
    const channel = enabledChannels[index];

    if (result.status === "fulfilled") {
      return {
        channelType: channel.type,
        success: true,
      };
    }

    return {
      channelType: channel.type,
      success: false,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown error",
    };
  });
}

async function sendToChannel(
  channel: ChannelConfig,
  payload: NotificationPayload,
  env: Env,
): Promise<void> {
  switch (channel.type) {
    case "telegram":
      await sendTelegramNotification(
        env.TELEGRAM_BOT_TOKEN,
        channel.chatId,
        payload,
      );
      break;

    case "discord":
      await sendDiscordBotNotification(
        env.DISCORD_BOT_TOKEN,
        channel.channelId,
        payload,
      );
      break;

    default: {
      const exhaustiveCheck: never = channel;
      throw new Error(
        `Unknown channel type: ${(exhaustiveCheck as ChannelConfig).type}`,
      );
    }
  }
}
