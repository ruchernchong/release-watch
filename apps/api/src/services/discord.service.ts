import type { NotificationPayload, ReleaseCategory } from "../types";

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
