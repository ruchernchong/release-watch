import type { DurableObjectNamespace, Workflow } from "cloudflare:workers";

export interface Env {
  DEBUG: string;
  GITHUB_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  SUBSCRIPTIONS: KVNamespace;
  RELEASE_CHECK_WORKFLOW: Workflow;
  STATS: DurableObjectNamespace;

  // Deprioritized
  DISCORD_WEBHOOK_URL?: string;
}
