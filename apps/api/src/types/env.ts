// Extend the generated Env with secrets (not in wrangler.jsonc)
export type Env = Cloudflare.Env & {
  SENTRY_DSN?: string;
  POSTHOG_API_KEY?: string;
};
