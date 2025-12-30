import { zValidator } from "@hono/zod-validator";
import { sessions, users } from "@release-watch/database";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { logger } from "../../lib/logger";
import type { AuthEnv } from "../../middleware/auth";

const app = new Hono<AuthEnv>().basePath("/activity").get(
  "/",
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (c) => {
    const { limit, offset } = c.req.valid("query");

    try {
      const database = c.get("db");

      const activityLogs = await database
        .select({
          id: sessions.id,
          userId: sessions.userId,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          createdAt: sessions.createdAt,
          expiresAt: sessions.expiresAt,
          impersonatedBy: sessions.impersonatedBy,
        })
        .from(sessions)
        .leftJoin(users, eq(sessions.userId, users.id))
        .orderBy(desc(sessions.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({ activity: activityLogs, limit, offset });
    } catch (err) {
      logger.api.error("Failed to fetch activity logs", err);
      return c.json({ error: "Failed to fetch activity logs" }, 500);
    }
  },
);

export default app;
