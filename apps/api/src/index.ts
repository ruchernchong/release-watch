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
  const body = await c.req.json<{ userId: string }>();

  if (!body.userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const code = await createTelegramLinkCode(c.env.SUBSCRIPTIONS, body.userId);
  return c.json({ code });
});

api.get("/link/telegram/status", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId query param is required" }, 400);
  }

  const channels = await getChannels(c.env.SUBSCRIPTIONS, userId);
  const telegramChannel = channels.find((ch) => ch.type === "telegram");

  if (!telegramChannel || telegramChannel.type !== "telegram") {
    return c.json({ linked: false });
  }

  return c.json({
    linked: true,
    chatId: telegramChannel.chatId,
  });
});

app.route("/api", api);

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
