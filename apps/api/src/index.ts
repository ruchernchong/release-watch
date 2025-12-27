import {
  accounts,
  sessions,
  userChannels,
  userRepos,
  users,
} from "@release-watch/database";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBot } from "./bot";
import { db } from "./db";
import { handleSchedule } from "./handlers/schedule";
import { type AuthEnv, adminOnly, jwtAuth } from "./middleware/auth";
import {
  createOctokit,
  getLatestReleases,
  parseFullName,
} from "./services/github.service";
import {
  createTelegramLinkCode,
  getCachedAnalysis,
  getChannels,
  updateChannelEnabled,
} from "./services/kv.service";
import { getSystemStats } from "./services/stats.service";
import type { Env } from "./types/env";

export { Stats } from "./durable-objects/stats";
export { ReleaseCheckWorkflow } from "./workflows/release-check";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (origin.includes("localhost")) return origin;
      if (origin.includes("releasewatch.dev")) return origin;
      return null;
    },
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.get("/", (c) => {
  return c.json({
    name: "ReleaseWatch",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/stats", async (c) => {
  const stats = await getSystemStats(c.env);
  return c.json(stats);
});

app.post("/webhook", async (c) => {
  const bot = await createBot(c.env);
  return webhookCallback(bot, "hono")(c);
});

const api = new Hono<AuthEnv>();

api.use("*", jwtAuth);

api.use("*", async (c, next) => {
  c.set("db", db(c.env.HYPERDRIVE));
  await next();
});

api.post("/integrations/telegram/generate", async (c) => {
  const user = c.get("user");

  try {
    const code = await createTelegramLinkCode(c.env.SUBSCRIPTIONS, user.sub);
    return c.json({ code });
  } catch (err) {
    console.error("Failed to create Telegram link code:", err);
    return c.json({ error: "Failed to generate link code" }, 500);
  }
});

api.get("/integrations/telegram/status", async (c) => {
  const user = c.get("user");

  try {
    const channels = await getChannels(c.env.SUBSCRIPTIONS, user.sub);
    const telegramChannel = channels.find(
      (channel) => channel.type === "telegram",
    );
    return c.json({ linked: !!telegramChannel });
  } catch (err) {
    console.error("Error fetching telegram link status:", err);
    return c.json({ error: "Failed to fetch link status" }, 500);
  }
});

api.get("/dashboard/stats", async (c) => {
  const user = c.get("user");

  try {
    const database = c.get("db");

    const repos = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
      columns: { id: true },
    });

    const channels = await getChannels(c.env.SUBSCRIPTIONS, user.sub);
    const activeChannels = channels.filter((ch) => ch.enabled).length;

    return c.json({
      reposWatched: repos.length,
      activeChannels,
      totalChannels: channels.length,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

api.get("/dashboard/releases", async (c) => {
  const user = c.get("user");
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(Number.parseInt(limitParam, 10), 20) : 5;

  try {
    const database = c.get("db");
    const octokit = createOctokit(c.env.GITHUB_TOKEN);

    const repos = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
      columns: { repoName: true },
      limit: 10,
    });

    const releases = await Promise.all(
      repos.map(async ({ repoName }) => {
        try {
          const { owner, repo } = parseFullName(repoName);
          const latestReleases = await getLatestReleases(
            octokit,
            owner,
            repo,
            1,
          );

          if (latestReleases.length === 0) return null;

          const release = latestReleases[0];
          const aiAnalysis = await getCachedAnalysis(
            c.env.SUBSCRIPTIONS,
            repoName,
            release.tag_name,
          );

          return {
            repoName,
            tagName: release.tag_name,
            releaseName: release.name,
            url: release.html_url,
            publishedAt: release.published_at,
            author: release.author?.login ?? null,
            aiAnalysis,
          };
        } catch {
          return null;
        }
      }),
    );

    const validReleases = releases
      .filter((r) => r !== null)
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    return c.json({ releases: validReleases });
  } catch (err) {
    console.error("Error fetching releases:", err);
    return c.json({ error: "Failed to fetch releases" }, 500);
  }
});

api.patch("/integrations/telegram/toggle", async (c) => {
  const user = c.get("user");

  let body: { chatId: string; enabled: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { chatId, enabled } = body;

  if (!chatId || typeof enabled !== "boolean") {
    return c.json({ error: "chatId and enabled are required" }, 400);
  }

  try {
    await updateChannelEnabled(
      c.env.SUBSCRIPTIONS,
      user.sub,
      "telegram",
      chatId,
      enabled,
    );
    return c.json({ success: true, enabled });
  } catch (err) {
    console.error("Error toggling telegram channel:", err);
    return c.json({ error: "Failed to toggle channel" }, 500);
  }
});

api.get("/subscriptions", async (c) => {
  const user = c.get("user");

  try {
    const database = c.get("db");
    const subscriptions = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
    });

    return c.json({ subscriptions });
  } catch (err) {
    console.error("Failed to fetch subscriptions:", err);
    return c.json({ error: "Failed to fetch subscriptions" }, 500);
  }
});

api.post("/subscriptions", async (c) => {
  const user = c.get("user");

  let body: { repoName: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { repoName } = body;

  if (!repoName || typeof repoName !== "string") {
    return c.json({ error: "repoName is required" }, 400);
  }

  const normalizedRepo = repoName.trim().toLowerCase();
  const repoPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

  if (!repoPattern.test(normalizedRepo)) {
    return c.json({ error: "Invalid repository format. Use owner/repo" }, 400);
  }

  try {
    const octokit = createOctokit(c.env.GITHUB_TOKEN);
    const { owner, repo } = parseFullName(normalizedRepo);

    try {
      await octokit.repos.get({ owner, repo });
    } catch {
      return c.json({ error: "Repository not found on GitHub" }, 404);
    }

    const database = c.get("db");

    const [subscription] = await database
      .insert(userRepos)
      .values({
        userId: user.sub,
        repoName: normalizedRepo,
      })
      .onConflictDoNothing()
      .returning();

    if (!subscription) {
      return c.json({ error: "Already subscribed to this repository" }, 409);
    }

    return c.json({ subscription }, 201);
  } catch (err) {
    console.error("Failed to add subscription:", err);
    return c.json({ error: "Failed to add subscription" }, 500);
  }
});

api.delete("/subscriptions/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const database = c.get("db");

    const [deleted] = await database
      .delete(userRepos)
      .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
      .returning();

    if (!deleted) {
      return c.json({ error: "Subscription not found" }, 404);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to delete subscription:", err);
    return c.json({ error: "Failed to delete subscription" }, 500);
  }
});

const admin = new Hono<AuthEnv>();

admin.use("*", jwtAuth);
admin.use("*", adminOnly);

admin.use("*", async (c, next) => {
  c.set("db", db(c.env.HYPERDRIVE));
  await next();
});

admin.get("/users", async (c) => {
  const search = c.req.query("search") || "";
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);
  const sortOrder = c.req.query("sortOrder") || "desc";

  try {
    const database = c.get("db");

    const whereClause = search
      ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
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
          subscriptionCount: sql<number>`(
            SELECT COUNT(*) FROM ${userRepos} WHERE ${userRepos.userId} = ${users.id}
          )`,
        })
        .from(users)
        .where(whereClause)
        .orderBy(sortOrder === "asc" ? users.createdAt : desc(users.createdAt))
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
    console.error("Failed to fetch users:", err);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

admin.get("/users/:id", async (c) => {
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

    const [subscriptions, channels, connectedAccounts] = await Promise.all([
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

    return c.json({ user, subscriptions, channels, connectedAccounts });
  } catch (err) {
    console.error("Failed to fetch user details:", err);
    return c.json({ error: "Failed to fetch user details" }, 500);
  }
});

admin.post("/users/:id/ban", async (c) => {
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
    return c.json({ error: "Invalid action. Must be 'ban' or 'unban'" }, 400);
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
    console.error("Failed to update user ban status:", err);
    return c.json({ error: "Failed to update user ban status" }, 500);
  }
});

admin.get("/activity", async (c) => {
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "50", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

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
    console.error("Failed to fetch activity logs:", err);
    return c.json({ error: "Failed to fetch activity logs" }, 500);
  }
});

admin.get("/stats", async (c) => {
  const stats = await getSystemStats(c.env);
  return c.json(stats);
});

app.route("/", api);
app.route("/admin", admin);

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
