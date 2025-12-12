import { Bot, InlineKeyboard } from "grammy";
import {
  createOctokit,
  type GitHubRelease,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  addSubscription,
  getSubscriptions,
  removeSubscription,
} from "../services/kv.service";
import type { Env } from "../types/env";

const GITHUB_URL_PATTERN =
  /(?:https?:\/\/)?github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i;

function formatLatestRelease(release: GitHubRelease): string {
  const title = release.name || release.tag_name;
  const truncatedBody = release.body
    ? release.body.substring(0, 500) + (release.body.length > 500 ? "..." : "")
    : "No release notes";

  return (
    `📦 <b>Latest Release: ${escapeHtml(title)}</b>\n\n` +
    `${escapeHtml(truncatedBody)}\n\n` +
    `<a href="${release.html_url}">View Release</a>`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function fetchAndFormatLatestRelease(
  env: Env,
  repo: string,
): Promise<string | null> {
  try {
    const octokit = createOctokit(env.GITHUB_TOKEN);
    const { owner, repo: repoName } = parseFullName(repo);
    const releases = await getLatestReleases(octokit, owner, repoName, 1);

    if (releases.length > 0) {
      return formatLatestRelease(releases[0]);
    }
    return null;
  } catch {
    return null;
  }
}

export async function createBot(env: Env): Promise<Bot> {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const kv = env.SUBSCRIPTIONS;

  await bot.api.setMyCommands([
    {
      command: "start",
      description: "Start the bot and see available commands",
    },
    { command: "unsubscribe", description: "Unsubscribe from a repository" },
    { command: "list", description: "List your subscriptions" },
  ]);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Welcome to ReleaseWatch!\n\n" +
        "I monitor GitHub releases and notify you when new versions are published.\n\n" +
        "To subscribe, simply paste a GitHub repository URL:\n" +
        "https://github.com/vercel/next.js\n\n" +
        "Commands:\n" +
        "/unsubscribe - Select a repository to unsubscribe\n" +
        "/list - List your subscriptions",
    );
  });

  bot.command("unsubscribe", async (ctx) => {
    const repo = ctx.match?.trim();
    const chatId = ctx.chat.id.toString();
    const subscriptions = await getSubscriptions(kv, chatId);

    if (subscriptions.length === 0) {
      await ctx.reply("No subscriptions to remove.");
      return;
    }

    // If no repo specified, show inline keyboard with subscriptions
    if (!repo) {
      const keyboard = new InlineKeyboard();
      for (const sub of subscriptions) {
        keyboard.text(`❌ ${sub}`, `unsub:${sub}`).row();
      }

      await ctx.reply("Select a repository to unsubscribe:", {
        reply_markup: keyboard,
      });
      return;
    }

    // Case-insensitive matching for typed repo name
    const matchedRepo = subscriptions.find(
      (s) => s.toLowerCase() === repo.toLowerCase(),
    );

    if (!matchedRepo) {
      await ctx.reply(`Not subscribed to ${repo}`);
      return;
    }

    await removeSubscription(kv, chatId, matchedRepo);
    await ctx.reply(`✅ Unsubscribed from ${matchedRepo}`);
  });

  bot.command("list", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const subscriptions = await getSubscriptions(kv, chatId);

    if (subscriptions.length === 0) {
      await ctx.reply("No subscriptions yet. Paste a GitHub URL to subscribe.");
      return;
    }

    const list = subscriptions.map((repo) => `• ${repo}`).join("\n");
    await ctx.reply(`📋 Your subscriptions:\n\n${list}`);
  });

  // Handle inline keyboard button clicks for unsubscribe
  bot.callbackQuery(/^unsub:(.+)$/, async (ctx) => {
    const repo = ctx.match[1];
    const chatId = ctx.chat?.id.toString();

    if (!chatId) {
      await ctx.answerCallbackQuery({ text: "Error: Could not identify chat" });
      return;
    }

    const subscriptions = await getSubscriptions(kv, chatId);
    if (!subscriptions.includes(repo)) {
      await ctx.answerCallbackQuery({ text: "Already unsubscribed" });
      await ctx.editMessageText("Repository already unsubscribed.");
      return;
    }

    await removeSubscription(kv, chatId, repo);
    await ctx.answerCallbackQuery({ text: "Unsubscribed!" });
    await ctx.editMessageText(`✅ Unsubscribed from ${repo}`);
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const match = text.match(GITHUB_URL_PATTERN);

    if (!match) return;

    const repo = match[1].replace(/\/$/, "");
    const chatId = ctx.chat.id.toString();

    const subscriptions = await getSubscriptions(kv, chatId);
    if (subscriptions.includes(repo)) {
      await ctx.reply(`Already subscribed to ${repo}`);
      return;
    }

    await addSubscription(kv, chatId, repo);
    await ctx.reply(`✅ Subscribed to ${repo}`);

    const latestRelease = await fetchAndFormatLatestRelease(env, repo);
    if (latestRelease) {
      await ctx.reply(latestRelease, { parse_mode: "HTML" });
    }
  });

  return bot;
}
