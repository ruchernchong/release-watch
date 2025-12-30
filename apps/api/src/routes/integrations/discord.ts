import { Hono } from "hono";
import { logger } from "../../lib/logger";
import type { AuthEnv } from "../../middleware/auth";
import {
  fetchGuildChannels,
  fetchUserGuilds,
  isBotInGuild,
} from "../../services/discord.service";
import {
  addChannel,
  getChannels,
  invalidateUserStatsCache,
  removeChannel,
  updateChannelEnabled,
} from "../../services/kv.service";

const app = new Hono<AuthEnv>()
  .basePath("/integrations/discord")
  .get("/status", async (c) => {
    const user = c.get("user");

    try {
      const database = c.get("db");

      const discordAccount = await database.query.accounts.findFirst({
        where: (accounts, { and, eq }) =>
          and(
            eq(accounts.userId, user.sub),
            eq(accounts.providerId, "discord"),
          ),
      });

      const channels = await getChannels(c.env.CHANNELS, user.sub);
      const discordChannels = channels.filter(
        (channel) => channel.type === "discord",
      );

      return c.json({
        connected: !!discordAccount,
        channels: discordChannels.map((channel) => ({
          channelId: channel.channelId,
          channelName: channel.channelName,
          guildId: channel.guildId,
          guildName: channel.guildName,
          enabled: channel.enabled,
        })),
      });
    } catch (err) {
      logger.discord.error("Failed to fetch status", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to fetch status" }, 500);
    }
  })
  .get("/guilds", async (c) => {
    const user = c.get("user");
    const database = c.get("db");

    try {
      const discordAccount = await database.query.accounts.findFirst({
        where: (accounts, { and, eq }) =>
          and(
            eq(accounts.userId, user.sub),
            eq(accounts.providerId, "discord"),
          ),
      });

      if (!discordAccount?.accessToken) {
        return c.json({ error: "Discord not connected" }, 400);
      }

      const userGuilds = await fetchUserGuilds(discordAccount.accessToken);

      const guildsWithBotStatus = await Promise.all(
        userGuilds.map(async (guild) => {
          const botPresent = await isBotInGuild(
            c.env.DISCORD_BOT_TOKEN,
            guild.id,
          );
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            botPresent,
          };
        }),
      );

      return c.json({ guilds: guildsWithBotStatus });
    } catch (err) {
      logger.discord.error("Failed to fetch guilds", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to fetch guilds" }, 500);
    }
  })
  .get("/guilds/:guildId/channels", async (c) => {
    const guildId = c.req.param("guildId");

    try {
      const botPresent = await isBotInGuild(c.env.DISCORD_BOT_TOKEN, guildId);

      if (!botPresent) {
        return c.json(
          {
            error: "Bot not in server",
            inviteUrl: `https://discord.com/oauth2/authorize?client_id=${c.env.DISCORD_CLIENT_ID}&permissions=2048&scope=bot&guild_id=${guildId}`,
          },
          400,
        );
      }

      const channels = await fetchGuildChannels(
        c.env.DISCORD_BOT_TOKEN,
        guildId,
      );

      return c.json({
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          parentId: channel.parent_id,
        })),
      });
    } catch (err) {
      logger.discord.error("Failed to fetch channels", err, { guildId });
      return c.json({ error: "Failed to fetch channels" }, 500);
    }
  })
  .post("/channels", async (c) => {
    const user = c.get("user");

    let body: {
      guildId: string;
      guildName: string;
      channelId: string;
      channelName: string;
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { guildId, guildName, channelId, channelName } = body;

    if (!guildId || !channelId || !guildName || !channelName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    try {
      const botPresent = await isBotInGuild(c.env.DISCORD_BOT_TOKEN, guildId);
      if (!botPresent) {
        return c.json({ error: "Bot not in server" }, 400);
      }

      await addChannel(c.env.CHANNELS, user.sub, {
        type: "discord",
        guildId,
        guildName,
        channelId,
        channelName,
        enabled: true,
        addedAt: new Date().toISOString(),
      });

      await invalidateUserStatsCache(c.env.CACHE, user.sub);
      return c.json({ success: true }, 201);
    } catch (err) {
      logger.discord.error("Failed to add channel", err, {
        userId: user.sub,
        guildId,
        channelId,
      });
      return c.json({ error: "Failed to add channel" }, 500);
    }
  })
  .delete("/channels/:channelId", async (c) => {
    const user = c.get("user");
    const channelId = c.req.param("channelId");

    try {
      await removeChannel(c.env.CHANNELS, user.sub, "discord", channelId);
      await invalidateUserStatsCache(c.env.CACHE, user.sub);
      return c.json({ success: true });
    } catch (err) {
      logger.discord.error("Failed to remove channel", err, {
        userId: user.sub,
        channelId,
      });
      return c.json({ error: "Failed to remove channel" }, 500);
    }
  })
  .patch("/toggle", async (c) => {
    const user = c.get("user");

    let body: { channelId: string; enabled: boolean };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { channelId, enabled } = body;

    if (!channelId) {
      return c.json({ error: "channelId is required" }, 400);
    }

    try {
      await updateChannelEnabled(
        c.env.CHANNELS,
        user.sub,
        "discord",
        channelId,
        enabled,
      );
      await invalidateUserStatsCache(c.env.CACHE, user.sub);
      return c.json({ success: true, enabled });
    } catch (err) {
      logger.discord.error("Failed to toggle channel", err, {
        userId: user.sub,
        channelId,
      });
      return c.json({ error: "Failed to toggle channel" }, 500);
    }
  });

export default app;
