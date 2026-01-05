import { createMiddleware } from "hono/factory";
import { logger } from "../lib/logger";
import type { AuthEnv } from "./auth";

/**
 * Rate limiting middleware for write operations.
 * Uses Cloudflare's native rate limiting binding.
 *
 * Limits: 20 requests per 60 seconds per user.
 * Applied to: POST, DELETE, PATCH operations on repos and channels.
 */
export const rateLimit = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");

  // Skip if no rate limiter binding (local dev without bindings)
  if (!c.env.RATE_LIMITER) {
    await next();
    return;
  }

  const { success } = await c.env.RATE_LIMITER.limit({
    key: `user:${user.sub}`,
  });

  if (!success) {
    logger.api.warn("Rate limit exceeded", undefined, { userId: user.sub });
    return c.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      },
      429,
    );
  }

  await next();
});
