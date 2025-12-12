import type { NotificationPayload, ReleaseCategory } from "../types";

const CATEGORY_EMOJI: Record<ReleaseCategory, string> = {
  major: "🚀",
  minor: "✨",
  patch: "🔧",
  security: "🔒",
  breaking: "⚠️",
  unknown: "📦",
};

const CATEGORY_LABEL: Record<ReleaseCategory, string> = {
  major: "Major Release",
  minor: "Minor Release",
  patch: "Patch",
  security: "Security Fix",
  breaking: "Breaking Changes",
  unknown: "New Release",
};

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const message = formatTelegramMessage(payload);
  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  const response = await fetch(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return true;
}

function formatTelegramMessage(payload: NotificationPayload): string {
  const title = payload.releaseName || payload.tagName;
  const analysis = payload.aiAnalysis;

  const category = analysis?.category ?? "unknown";
  const emoji = CATEGORY_EMOJI[category];
  const categoryLabel = CATEGORY_LABEL[category];

  const parts: string[] = [];

  // Header with category
  parts.push(
    `${emoji} <b>${categoryLabel}: ${escapeHtml(payload.repoName)}</b>`,
  );
  parts.push("");

  // Version/title
  parts.push(`<b>${escapeHtml(title)}</b>`);

  // Breaking changes warning
  if (analysis?.hasBreakingChanges) {
    parts.push("");
    parts.push("⚠️ <b>Contains Breaking Changes</b>");
  }

  // AI Summary or truncated body
  parts.push("");
  if (analysis?.summary) {
    parts.push(`<b>Summary:</b> ${escapeHtml(analysis.summary)}`);
  } else {
    const truncatedBody = payload.body
      ? payload.body.substring(0, 500) +
        (payload.body.length > 500 ? "..." : "")
      : "No release notes";
    parts.push(escapeHtml(truncatedBody));
  }

  // Highlights
  if (analysis?.highlights && analysis.highlights.length > 0) {
    parts.push("");
    parts.push("<b>Highlights:</b>");
    for (const highlight of analysis.highlights) {
      parts.push(`• ${escapeHtml(highlight)}`);
    }
  }

  // Link
  parts.push("");
  parts.push(`<a href="${payload.url}">View Release</a>`);

  return parts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
