export interface Env {
  // Secrets
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;

  // Deprioritized
  DB?: D1Database;
  DISCORD_WEBHOOK_URL?: string;
}
