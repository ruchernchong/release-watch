export interface Env {
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;

  // Deprioritized
  DB?: D1Database;
  DISCORD_WEBHOOK_URL?: string;
}
