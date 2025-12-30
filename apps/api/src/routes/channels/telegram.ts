import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";
import { logger } from "../../lib/logger";
import type { AuthEnv } from "../../middleware/auth";
import {
  createTelegramLinkCode,
  getChannels,
  invalidateUserStatsCache,
  updateChannelEnabled,
} from "../../services/kv.service";

const app = new Hono<AuthEnv>()
  .basePath("/channels/telegram")
  .post("/generate", async (c) => {
    const user = c.get("user");

    try {
      const code = await createTelegramLinkCode(c.env.CHANNELS, user.sub);
      return c.json({ code });
    } catch (err) {
      logger.api.error("Failed to create Telegram link code", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to generate link code" }, 500);
    }
  })
  .get("/status", async (c) => {
    const user = c.get("user");

    try {
      const channels = await getChannels(c.env.CHANNELS, user.sub);
      const telegramChannel = channels.find(
        (channel) => channel.type === "telegram",
      );
      return c.json({ linked: !!telegramChannel });
    } catch (err) {
      logger.api.error("Failed to fetch telegram link status", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to fetch link status" }, 500);
    }
  })
  .patch(
    "/toggle",
    zValidator(
      "json",
      z.object({
        chatId: z.string().min(1),
        enabled: z.boolean(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const { chatId, enabled } = c.req.valid("json");

      try {
        await updateChannelEnabled(
          c.env.CHANNELS,
          user.sub,
          "telegram",
          chatId,
          enabled,
        );
        await invalidateUserStatsCache(c.env.CACHE, user.sub);
        return c.json({ success: true, enabled });
      } catch (err) {
        logger.api.error("Failed to toggle telegram channel", err, {
          userId: user.sub,
          chatId,
        });
        return c.json({ error: "Failed to toggle channel" }, 500);
      }
    },
  );

export default app;
