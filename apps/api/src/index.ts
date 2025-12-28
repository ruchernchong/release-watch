import { zValidator } from "@hono/zod-validator";
import {
  accounts,
  sessions,
  userChannels,
  userRepos,
  users,
} from "@release-watch/database";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as z from "zod";
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

// app.use(logger());

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8787",
  "https://releasewatch.dev",
  "https://www.releasewatch.dev",
];

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      return ALLOWED_ORIGINS.includes(origin) ? origin : null;
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
    const code = await createTelegramLinkCode(c.env.CHANNELS, user.sub);
    return c.json({ code });
  } catch (err) {
    console.error("Failed to create Telegram link code:", err);
    return c.json({ error: "Failed to generate link code" }, 500);
  }
});

api.get("/integrations/telegram/status", async (c) => {
  const user = c.get("user");

  try {
    const channels = await getChannels(c.env.CHANNELS, user.sub);
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

    const channels = await getChannels(c.env.CHANNELS, user.sub);
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

api.get(
  "/dashboard/releases",
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().int().min(1).max(20).default(5),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { limit } = c.req.valid("query");

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
            const parsed = parseFullName(repoName);
            if (!parsed) return null;
            const { owner, repo } = parsed;
            const latestReleases = await getLatestReleases(
              octokit,
              owner,
              repo,
              1,
            );

            if (latestReleases.length === 0) return null;

            const release = latestReleases[0];
            const aiAnalysis = await getCachedAnalysis(
              c.env.CACHE,
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
  },
);

api.patch("/integrations/telegram/toggle", async (c) => {
  const user = c.get("user");

  let body: { chatId: string; enabled: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { chatId, enabled } = body;

  if (!chatId) {
    return c.json({ error: "chatId and enabled are required" }, 400);
  }

  try {
    await updateChannelEnabled(
      c.env.CHANNELS,
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

api.get("/repos", async (c) => {
  const user = c.get("user");

  try {
    const database = c.get("db");
    const repos = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
    });

    return c.json({ repos });
  } catch (err) {
    console.error("Failed to fetch repos:", err);
    return c.json({ error: "Failed to fetch repos" }, 500);
  }
});

api.post("/repos", async (c) => {
  const user = c.get("user");

  let body: { repoName: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { repoName } = body;

  if (!repoName) {
    return c.json({ error: "repoName is required" }, 400);
  }

  const normalizedRepo = repoName.trim().toLowerCase();
  const repoPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

  if (!repoPattern.test(normalizedRepo)) {
    return c.json({ error: "Invalid repository format. Use owner/repo" }, 400);
  }

  try {
    const octokit = createOctokit(c.env.GITHUB_TOKEN);
    const parsed = parseFullName(normalizedRepo);
    if (!parsed) {
      return c.json({ error: "Invalid repository format" }, 400);
    }
    const { owner, repo } = parsed;

    try {
      await octokit.repos.get({ owner, repo });
    } catch {
      return c.json({ error: "Repository not found on GitHub" }, 404);
    }

    const database = c.get("db");

    const [trackedRepo] = await database
      .insert(userRepos)
      .values({
        userId: user.sub,
        repoName: normalizedRepo,
      })
      .onConflictDoNothing()
      .returning();

    if (!trackedRepo) {
      return c.json({ error: "Already tracking this repository" }, 409);
    }

    return c.json({ repo: trackedRepo }, 201);
  } catch (err) {
    console.error("Failed to add repo:", err);
    return c.json({ error: "Failed to add repo" }, 500);
  }
});

api.delete("/repos/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const database = c.get("db");

    const [deleted] = await database
      .delete(userRepos)
      .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
      .returning();

    if (!deleted) {
      return c.json({ error: "Repo not found" }, 404);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to delete repo:", err);
    return c.json({ error: "Failed to delete repo" }, 500);
  }
});

api.patch("/repos/:id/pause", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  let body: { paused: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { paused } = body;

  if (typeof paused !== "boolean") {
    return c.json({ error: "paused must be a boolean" }, 400);
  }

  try {
    const database = c.get("db");

    // First verify the repo exists and belongs to the user
    const [repo] = await database
      .select()
      .from(userRepos)
      .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
      .limit(1);

    if (!repo) {
      return c.json({ error: "Repo not found" }, 404);
    }

    // If unpausing, update lastNotifiedTag to latest release to avoid spam
    const updateData: { paused: boolean; lastNotifiedTag?: string } = {
      paused,
    };

    if (!paused) {
      try {
        const octokit = createOctokit(c.env.GITHUB_TOKEN);
        const parsed = parseFullName(repo.repoName);
        if (parsed) {
          const { owner, repo: repoName } = parsed;
          const latestReleases = await getLatestReleases(
            octokit,
            owner,
            repoName,
            1,
          );
          if (latestReleases.length > 0) {
            updateData.lastNotifiedTag = latestReleases[0].tag_name;
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest release when unpausing:", err);
        // Continue anyway - we'll just not update lastNotifiedTag
      }
    }

    const [updated] = await database
      .update(userRepos)
      .set(updateData)
      .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
      .returning();

    return c.json({ repo: updated });
  } catch (err) {
    console.error("Failed to update repo pause status:", err);
    return c.json({ error: "Failed to update repo pause status" }, 500);
  }
});

const admin = new Hono<AuthEnv>();

admin.use("*", jwtAuth);
admin.use("*", adminOnly);

admin.use("*", async (c, next) => {
  c.set("db", db(c.env.HYPERDRIVE));
  await next();
});

admin.get(
  "/users",
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
      console.error("Failed to fetch users:", err);
      return c.json({ error: "Failed to fetch users" }, 500);
    }
  },
);

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

admin.get(
  "/activity",
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
      console.error("Failed to fetch activity logs:", err);
      return c.json({ error: "Failed to fetch activity logs" }, 500);
    }
  },
);

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
