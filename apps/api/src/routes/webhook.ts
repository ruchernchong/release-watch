import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "../bot";

const app = new Hono().basePath("/webhook").post("/", async (c) => {
  const bot = createBot();
  return webhookCallback(bot, "hono")(c);
});

export default app;
