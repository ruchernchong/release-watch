import * as Sentry from "@sentry/cloudflare";
import { app } from "./app";
import { handleSchedule } from "./handlers/schedule";
import type { Env } from "./types/env";

export { Stats } from "./durable-objects/stats";
export { ReleaseCheckWorkflow } from "./workflows/release-check";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0,
  }),
  {
    fetch: app.fetch,
    scheduled: handleSchedule,
  } satisfies ExportedHandler<Env>,
);
