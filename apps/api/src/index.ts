import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "./bot";
import { handleSchedule } from "./handlers/schedule";
import { createTelegramLinkCode, getChannels } from "./services/kv.service";
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

const api = new Hono<{ Bindings: Env }>();

api.use("*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  if (!apiKey || apiKey !== c.env.DASHBOARD_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
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

app.route("/api", api);

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
