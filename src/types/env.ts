export interface Env {
  DEBUG: string;
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  SUBSCRIPTIONS: KVNamespace;

  // Deprioritized
  DISCORD_WEBHOOK_URL?: string;
}
