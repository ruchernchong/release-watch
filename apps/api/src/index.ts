import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "./bot";
import { db, type Database } from "./db";
import { handleSchedule } from "./handlers/schedule";
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

// ============================================
// Dashboard API (protected by API key)
// ============================================

type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database };
};

const api = new Hono<ApiEnv>();

api.use("*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  if (!apiKey || apiKey !== c.env.DASHBOARD_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("db", db(c.env.HYPERDRIVE));
  await next();
});

api.post("/link/telegram/generate", async (c) => {
  let body: { userId: string };
  try {
    body = await c.req.json<{ userId: string }>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.userId || typeof body.userId !== "string") {
    return c.json({ error: "userId is required" }, 400);
  }

  const userId = body.userId.trim();
  if (!userId) {
    return c.json({ error: "userId cannot be empty" }, 400);
  }

  try {
    const code = await createTelegramLinkCode(c.env.SUBSCRIPTIONS, userId);
    return c.json({ code });
  } catch (err) {
    console.error("Failed to create Telegram link code:", err);
    return c.json({ error: "Failed to generate link code" }, 500);
  }
});

api.get("/link/telegram/status", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId query param is required" }, 400);
  }

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return c.json({ error: "userId cannot be empty" }, 400);
  }

  try {
    const channels = await getChannels(c.env.SUBSCRIPTIONS, trimmedUserId);
    const telegramChannel = channels.find((ch) => ch.type === "telegram");

    if (!telegramChannel) {
      return c.json({ linked: false });
    }

    return c.json({ linked: true });
  } catch (err) {
    console.error("Error fetching telegram link status:", err);
    return c.json({ error: "Failed to fetch link status" }, 500);
  }
});

// ============================================
// Dashboard Stats & Data Endpoints
// ============================================

api.get("/dashboard/stats", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId query param is required" }, 400);
  }

  try {
    const database = c.get("db");

    const repos = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, userId),
      columns: { id: true },
    });

    const channels = await getChannels(c.env.SUBSCRIPTIONS, userId);
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
  const userId = c.req.query("userId");
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(Number.parseInt(limitParam, 10), 20) : 5;

  if (!userId) {
    return c.json({ error: "userId query param is required" }, 400);
  }

  try {
    const database = c.get("db");
    const octokit = createOctokit(c.env.GITHUB_TOKEN);

    const repos = await database.query.userRepos.findMany({
      where: (userRepos, { eq }) => eq(userRepos.userId, userId),
      columns: { repoName: true },
      limit: 10,
    });

    const releases = await Promise.all(
      repos.map(async ({ repoName }) => {
        try {
          const { owner, repo } = parseFullName(repoName);
          const latestReleases = await getLatestReleases(octokit, owner, repo, 1);

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

api.patch("/channels/telegram/toggle", async (c) => {
  let body: { userId: string; chatId: string; enabled: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { userId, chatId, enabled } = body;

  if (!userId || !chatId || typeof enabled !== "boolean") {
    return c.json(
      { error: "userId, chatId, and enabled are required" },
      400,
    );
  }

  try {
    await updateChannelEnabled(
      c.env.SUBSCRIPTIONS,
      userId,
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

app.route("/api", api);

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
