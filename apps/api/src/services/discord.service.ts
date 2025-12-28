import type { NotificationPayload, ReleaseCategory } from "../types";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordChannel {
  id: string;
  type: number; // 0 = text channel
  name: string;
  guild_id: string;
  position: number;
  parent_id: string | null; // Category ID
}

const CATEGORY_COLOR: Record<ReleaseCategory, number> = {
  major: 0x5865f2, // Discord blurple
  minor: 0x57f287, // Green
  patch: 0xfee75c, // Yellow
  security: 0xed4245, // Red
  breaking: 0xeb459e, // Fuchsia
  unknown: 0x99aab5, // Gray
};

const CATEGORY_LABEL: Record<ReleaseCategory, string> = {
  major: "🚀 Major Release",
  minor: "✨ Minor Release",
  patch: "🔧 Patch",
  security: "🔒 Security Fix",
  breaking: "⚠️ Breaking Changes",
  unknown: "📦 New Release",
};

interface DiscordEmbed {
  title: string;
  description: string;
  url: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

export async function sendDiscordNotification(
  webhookUrl: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const embed = formatDiscordEmbed(payload);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] } satisfies DiscordWebhookPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord webhook error: ${error}`);
  }

  return true;
}

export async function validateDiscordWebhook(url: string): Promise<boolean> {
  // Validate URL format
  const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

  if (!webhookPattern.test(url)) {
    return false;
  }

  // Test the webhook with a GET request (Discord returns webhook info)
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Send notification to a Discord channel using Bot token
 */
export async function sendDiscordBotNotification(
  botToken: string,
  channelId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const embed = formatDiscordEmbed(payload);

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ embeds: [embed] }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error: ${error}`);
  }

  return true;
}

/**
 * Fetch user's guilds using their OAuth access token
 */
export async function fetchUserGuilds(
  accessToken: string,
): Promise<DiscordGuild[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user guilds");
  }

  return response.json() as Promise<DiscordGuild[]>;
}

/**
 * Check if bot is in a guild
 */
export async function isBotInGuild(
  botToken: string,
  guildId: string,
): Promise<boolean> {
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  return response.ok;
}

/**
 * Fetch text channels from a guild (requires bot to be in guild)
 */
export async function fetchGuildChannels(
  botToken: string,
  guildId: string,
): Promise<DiscordChannel[]> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch guild channels");
  }

  const channels = (await response.json()) as DiscordChannel[];

  return channels.filter((channel) => channel.type === 0);
}

function formatDiscordEmbed(payload: NotificationPayload): DiscordEmbed {
  const title = payload.releaseName || payload.tagName;
  const analysis = payload.aiAnalysis;
  const category = analysis?.category ?? "unknown";

  const descriptionParts: string[] = [];

  // Breaking changes warning
  if (analysis?.hasBreakingChanges) {
    descriptionParts.push("⚠️ **Contains Breaking Changes**\n");
  }

  // AI Summary or truncated body
  if (analysis?.summary) {
    descriptionParts.push(`**Summary:** ${analysis.summary}`);
  } else {
    const truncatedBody = payload.body
      ? payload.body.substring(0, 500) +
        (payload.body.length > 500 ? "..." : "")
      : "No release notes";
    descriptionParts.push(truncatedBody);
  }

  const embed: DiscordEmbed = {
    title: `${CATEGORY_LABEL[category]}: ${payload.repoName}`,
    description: descriptionParts.join("\n"),
    url: payload.url,
    color: CATEGORY_COLOR[category],
    footer: { text: `Version: ${title}` },
    timestamp: payload.publishedAt,
  };

  // Add highlights as fields
  if (analysis?.highlights && analysis.highlights.length > 0) {
    embed.fields = [
      {
        name: "Highlights",
        value: analysis.highlights
          .map((highlight) => `• ${highlight}`)
          .join("\n"),
      },
    ];
  }

  return embed;
}
