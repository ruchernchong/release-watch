import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "./bot";
import { handleSchedule } from "./handlers/schedule";
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

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
