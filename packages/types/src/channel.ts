/**
 * An ISO 8601 formatted date-time string, e.g. "2023-01-01T12:34:56.789Z".
 */
export type ISODateString = string;

export type ChannelType = "telegram" | "discord";

export interface TelegramChannelConfig {
  type: "telegram";
  chatId: string;
  enabled: boolean;
  addedAt: ISODateString;
}

export interface DiscordChannelConfig {
  type: "discord";
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  enabled: boolean;
  addedAt: ISODateString;
}

export type ChannelConfig = TelegramChannelConfig | DiscordChannelConfig;

export interface TelegramLinkRequest {
  userId: string;
  expiresAt: ISODateString;
}
