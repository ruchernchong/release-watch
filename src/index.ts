import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "./bot";
import { handleSchedule } from "./handlers/schedule";
import type { Env } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({
    name: "ReleaseWatch",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhook", async (c) => {
  const bot = await createBot(c.env);
  return webhookCallback(bot, "hono")(c);
});

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
