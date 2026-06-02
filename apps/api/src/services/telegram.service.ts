import * as Sentry from "@sentry/cloudflare";
import type { NotificationPayload, ReleaseCategory } from "@shipradar/types";

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
    parts.push(formatFallbackReleaseNotes(payload.body));
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

const MAX_FALLBACK_BULLETS = 8;
const MAX_FALLBACK_LINE_CHARS = 200;

// Renders raw GitHub release notes into HTML-ready Telegram content when no AI
// summary is available: bold section headings, one bullet per changelog item,
// and an "…and N more" overflow line. Returns escaped HTML — do NOT re-escape.
export function formatFallbackReleaseNotes(
  body: string | null | undefined,
): string {
  if (!body?.trim()) {
    return "No release notes";
  }

  const withoutCodeFences = body.replace(/```[\s\S]*?```/g, " ");
  const lines: string[] = [];
  let bulletCount = 0;
  let droppedBullets = 0;

  for (const rawLine of withoutCodeFences.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      const text = renderFallbackText(headingMatch[1]);
      if (text) {
        lines.push(`<b>${text}</b>`);
      }
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const text = renderFallbackText(bulletMatch[1]);
      if (!text) {
        continue;
      }
      if (bulletCount >= MAX_FALLBACK_BULLETS) {
        droppedBullets++;
        continue;
      }
      lines.push(`• ${text}`);
      bulletCount++;
      continue;
    }

    const text = renderFallbackText(line);
    if (text) {
      lines.push(text);
    }
  }

  if (droppedBullets > 0) {
    lines.push(`…and ${droppedBullets} more`);
  }

  if (lines.length === 0) {
    return "No release notes";
  }

  return lines.join("\n");
}

// Strips markdown noise from a single line, truncates on a word boundary, then
// HTML-escapes the result so it is safe to embed in a Telegram HTML message.
function renderFallbackText(text: string): string {
  const cleaned = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[(.*?)\]\(https?:\/\/[^\s)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return escapeHtml(truncateAtWord(cleaned, MAX_FALLBACK_LINE_CHARS));
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength - 3);
  const lastSpace = slice.lastIndexOf(" ");
  const head = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice)
    .replace(/[\s•·,;:]+$/, "")
    .trimEnd();

  return `${head}...`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
