export type ChannelType = "telegram" | "discord";

export interface TelegramChannelConfig {
  type: "telegram";
  chatId: string;
  enabled: boolean;
  linkedAt: string;
}

export interface DiscordChannelConfig {
  type: "discord";
  webhookUrl: string;
  enabled: boolean;
  addedAt: string;
}

export type ChannelConfig = TelegramChannelConfig | DiscordChannelConfig;

export interface TelegramLinkRequest {
  userId: string;
  expiresAt: string;
}
