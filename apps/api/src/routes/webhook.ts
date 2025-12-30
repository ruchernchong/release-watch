import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { createBot } from "../bot";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>()
  .basePath("/webhook")
  .post("/", async (c) => {
    const bot = await createBot(c.env);
    return webhookCallback(bot, "hono")(c);
  });

export default app;
