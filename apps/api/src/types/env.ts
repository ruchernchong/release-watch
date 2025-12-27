// Extends the generated Env from worker-configuration.d.ts with secrets
export interface Env extends Cloudflare.Env {
  DEBUG?: string;
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  JWKS_URL: string;

  // Deprioritized
  DISCORD_WEBHOOK_URL?: string;
}
