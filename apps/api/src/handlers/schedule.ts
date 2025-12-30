import { logger } from "../lib/logger";
import type { Env } from "../types/env";

export async function handleSchedule(
  _event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  const instanceId = `release-check-${Date.now()}`;

  ctx.waitUntil(
    (async () => {
      try {
        const instance = await env.RELEASE_CHECK_WORKFLOW.create({
          id: instanceId,
          params: { triggeredAt: new Date().toISOString() },
        });
        logger.scheduler.info("Workflow started", { instanceId: instance.id });
      } catch (error) {
        logger.scheduler.error("Failed to start workflow", error);
      }
    })(),
  );
}
