import type { NotificationPayload } from "../types";

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  payload: NotificationPayload
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
  const truncatedBody = payload.body
    ? payload.body.substring(0, 500) + (payload.body.length > 500 ? "..." : "")
    : "No release notes";

  return `<b>New Release: ${escapeHtml(payload.repoName)}</b>

<b>${escapeHtml(title)}</b>
${escapeHtml(truncatedBody)}

<a href="${payload.url}">View Release</a>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
