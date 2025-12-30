import { zValidator } from "@hono/zod-validator";
import {
  accounts,
  userChannels,
  userRepos,
  users,
} from "@release-watch/database";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { logger } from "../../lib/logger";
import type { AuthEnv } from "../../middleware/auth";

const app = new Hono<AuthEnv>()
  .basePath("/users")
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        search: z.string().default(""),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    ),
    async (c) => {
      const { search, limit, offset, sortOrder } = c.req.valid("query");

      try {
        const database = c.get("db");

        const whereClause = search
          ? or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
            )
          : undefined;

        const [userList, totalCount] = await Promise.all([
          database
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
              role: users.role,
              banned: users.banned,
              banReason: users.banReason,
              banExpires: users.banExpires,
              createdAt: users.createdAt,
              repoCount: database.$count(
                userRepos,
                eq(userRepos.userId, users.id),
              ),
            })
            .from(users)
            .where(whereClause)
            .orderBy(
              sortOrder === "asc" ? users.createdAt : desc(users.createdAt),
            )
            .limit(limit)
            .offset(offset),
          database
            .select({ count: count() })
            .from(users)
            .where(whereClause)
            .then((res) => res[0]?.count ?? 0),
        ]);

        return c.json({ users: userList, total: totalCount, limit, offset });
      } catch (err) {
        logger.api.error("Failed to fetch users", err);
        return c.json({ error: "Failed to fetch users" }, 500);
      }
    },
  )
  .get("/:id", async (c) => {
    const id = c.req.param("id");

    try {
      const database = c.get("db");

      const [user] = await database
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          role: users.role,
          banned: users.banned,
          banReason: users.banReason,
          banExpires: users.banExpires,
          twoFactorEnabled: users.twoFactorEnabled,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const [repos, channels, connectedAccounts] = await Promise.all([
        database
          .select({
            id: userRepos.id,
            repoName: userRepos.repoName,
            lastNotifiedTag: userRepos.lastNotifiedTag,
            createdAt: userRepos.createdAt,
          })
          .from(userRepos)
          .where(eq(userRepos.userId, id)),
        database
          .select({
            id: userChannels.id,
            type: userChannels.type,
            enabled: userChannels.enabled,
            createdAt: userChannels.createdAt,
          })
          .from(userChannels)
          .where(eq(userChannels.userId, id)),
        database
          .select({
            id: accounts.id,
            providerId: accounts.providerId,
            createdAt: accounts.createdAt,
          })
          .from(accounts)
          .where(eq(accounts.userId, id)),
      ]);

      return c.json({ user, repos, channels, connectedAccounts });
    } catch (err) {
      logger.api.error("Failed to fetch user details", err, {
        targetUserId: id,
      });
      return c.json({ error: "Failed to fetch user details" }, 500);
    }
  })
  .post("/:id/ban", async (c) => {
    const adminUser = c.get("user");
    const id = c.req.param("id");

    if (id === adminUser.sub) {
      return c.json({ error: "Cannot ban yourself" }, 400);
    }

    let body: { action: string; banReason?: string; banExpiresIn?: number };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { action, banReason, banExpiresIn } = body;

    if (action !== "ban" && action !== "unban") {
      return c.json(
        { error: "Invalid action. Must be 'ban' or 'unban'" },
        400,
      );
    }

    try {
      const database = c.get("db");

      const [targetUser] = await database
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!targetUser) {
        return c.json({ error: "User not found" }, 404);
      }

      if (targetUser.role === "admin") {
        return c.json({ error: "Cannot ban admin users" }, 400);
      }

      if (action === "ban") {
        const banExpires = banExpiresIn
          ? new Date(Date.now() + banExpiresIn * 1000)
          : null;

        await database
          .update(users)
          .set({
            banned: true,
            banReason: banReason || null,
            banExpires,
          })
          .where(eq(users.id, id));

        return c.json({ success: true, action: "banned" });
      }

      await database
        .update(users)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
        })
        .where(eq(users.id, id));

      return c.json({ success: true, action: "unbanned" });
    } catch (err) {
      logger.api.error("Failed to update user ban status", err, {
        adminId: adminUser.sub,
        targetUserId: id,
        action,
      });
      return c.json({ error: "Failed to update user ban status" }, 500);
    }
  });

export default app;
