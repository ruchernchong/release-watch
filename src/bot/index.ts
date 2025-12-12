import { Bot } from "grammy";
import {
  addSubscription,
  getSubscriptions,
  removeSubscription,
} from "../services/kv.service";
import type { Env } from "../types/env";

const REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const kv = env.SUBSCRIPTIONS;

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Welcome to ReleaseWatch!\n\n" +
        "I monitor GitHub releases and notify you when new versions are published.\n\n" +
        "Commands:\n" +
        "/subscribe <owner/repo> - Subscribe to a repository\n" +
        "/unsubscribe <owner/repo> - Unsubscribe from a repository\n" +
        "/list - List your subscriptions",
    );
  });

  bot.command("subscribe", async (ctx) => {
    const repo = ctx.match?.trim();
    const chatId = ctx.chat.id.toString();

    if (!repo) {
      await ctx.reply(
        "Usage: /subscribe <owner/repo>\nExample: /subscribe vercel/next.js",
      );
      return;
    }

    if (!REPO_PATTERN.test(repo)) {
      await ctx.reply("Invalid repository format. Use: owner/repo");
      return;
    }

    const subscriptions = await getSubscriptions(kv, chatId);
    if (subscriptions.includes(repo)) {
      await ctx.reply(`Already subscribed to ${repo}`);
      return;
    }

    await addSubscription(kv, chatId, repo);
    await ctx.reply(`✅ Subscribed to ${repo}`);
  });

  bot.command("unsubscribe", async (ctx) => {
    const repo = ctx.match?.trim();
    const chatId = ctx.chat.id.toString();

    if (!repo) {
      await ctx.reply(
        "Usage: /unsubscribe <owner/repo>\nExample: /unsubscribe vercel/next.js",
      );
      return;
    }

    const subscriptions = await getSubscriptions(kv, chatId);
    if (!subscriptions.includes(repo)) {
      await ctx.reply(`Not subscribed to ${repo}`);
      return;
    }

    await removeSubscription(kv, chatId, repo);
    await ctx.reply(`✅ Unsubscribed from ${repo}`);
  });

  bot.command("list", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const subscriptions = await getSubscriptions(kv, chatId);

    if (subscriptions.length === 0) {
      await ctx.reply(
        "No subscriptions yet. Use /subscribe <owner/repo> to add one.",
      );
      return;
    }

    const list = subscriptions.map((repo) => `• ${repo}`).join("\n");
    await ctx.reply(`📋 Your subscriptions:\n\n${list}`);
  });

  return bot;
}
