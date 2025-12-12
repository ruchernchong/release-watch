import type { Workflow } from "cloudflare:workers";

export interface Env {
  DEBUG: string;
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  SUBSCRIPTIONS: KVNamespace;
  RELEASE_CHECK_WORKFLOW: Workflow;

  // Deprioritized
  DISCORD_WEBHOOK_URL?: string;
}
