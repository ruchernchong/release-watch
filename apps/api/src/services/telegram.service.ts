import type {
  NotificationPayload,
  ReleaseCategory,
} from "@release-watch/types";
import * as Sentry from "@sentry/cloudflare";

const CATEGORY_EMOJI: Record<ReleaseCategory, string> = {
  major: "🚀",
  minor: "✨",
  patch: "🔧",
  security: "🔒",
  breaking: "⚠️",
  unknown: "📦",
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
    const body = await response.text();
    const error = new Error(`Telegram API error ${response.status}: ${body}`);
    Sentry.captureException(error, {
      tags: { service: "telegram", op: "sendMessage" },
      extra: {
        chatId,
        repo: payload.repoName,
        tag: payload.tagName,
        status: response.status,
      },
    });
    throw error;
  }

  return true;
}

function formatTelegramMessage(payload: NotificationPayload): string {
  const analysis = payload.aiAnalysis;

  const category = analysis?.category ?? "unknown";
  const emoji = CATEGORY_EMOJI[category];

  const parts: string[] = [];

  parts.push(
    `${emoji} <b>${escapeHtml(payload.repoName)} ${escapeHtml(payload.tagName)}</b>`,
  );

  if (payload.releaseName && payload.releaseName !== payload.tagName) {
    parts.push(escapeHtml(payload.releaseName));
  }

  if (analysis?.hasBreakingChanges) {
    parts.push("");
    parts.push("⚠️ <b>Breaking changes included</b>");
  }

  parts.push("");
  if (analysis?.summary) {
    parts.push(escapeHtml(analysis.summary));
  } else {
    parts.push(escapeHtml(formatFallbackReleaseNotes(payload.body)));
  }

  if (analysis?.highlights && analysis.highlights.length > 0) {
    parts.push("");
    parts.push("<b>Highlights:</b>");
    for (const highlight of analysis.highlights) {
      parts.push(`• ${escapeHtml(highlight)}`);
    }
  }

  parts.push("");
  parts.push(`<a href="${escapeHtmlAttribute(payload.url)}">View Release</a>`);

  return parts.join("\n");
}

function formatFallbackReleaseNotes(body: string | null): string {
  if (!body?.trim()) {
    return "No release notes";
  }

  const cleaned = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[(.*?)\]\(https?:\/\/[^\s)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[>*_~]/g, "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return truncate(cleaned || "No release notes", 360);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
