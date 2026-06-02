import type { AuthEnv } from "@api/middleware/auth";
import {
  createTelegramLinkCode,
  getChannels,
  invalidateUserStatsCache,
  normalizeTelegramChatId,
  updateChannelEnabled,
} from "@api/services/kv.service";
import { captureEvent, flushPostHog, getPostHog } from "@api/services/posthog";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";

const app = new Hono<AuthEnv>()
  .basePath("/channels/telegram")
  .post("/generate", async (c) => {
    const user = c.get("user");

    try {
      const code = await createTelegramLinkCode(user.sub);

      const posthog = getPostHog(process.env.POSTHOG_API_KEY);
      captureEvent(posthog, {
        distinctId: user.sub,
        event: "Telegram Link Generated",
      });
      await flushPostHog(posthog);

      return c.json({ code });
    } catch (err) {
      console.error("Failed to create Telegram link code", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to generate link code" }, 500);
    }
  })
  .get("/status", async (c) => {
    const user = c.get("user");

    try {
      const channels = await getChannels(user.sub);
      const telegramChannel = channels.find(
        (channel) =>
          channel.type === "telegram" &&
          normalizeTelegramChatId(channel.chatId),
      );
      return c.json({ linked: !!telegramChannel });
    } catch (err) {
      console.error("Failed to fetch telegram link status", err, {
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
        await updateChannelEnabled(user.sub, "telegram", chatId, enabled);

        const posthog = getPostHog(process.env.POSTHOG_API_KEY);
        captureEvent(posthog, {
          distinctId: user.sub,
          event: "Telegram Toggled",
          properties: { enabled },
        });
        await flushPostHog(posthog);

        await invalidateUserStatsCache(user.sub);
        return c.json({ success: true, enabled });
      } catch (err) {
        console.error("Failed to toggle telegram channel", err, {
          userId: user.sub,
          chatId,
        });
        return c.json({ error: "Failed to toggle channel" }, 500);
      }
    },
  );

export default app;
