import { Bot } from "grammy";
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

const REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const GITHUB_URL_PATTERN =
  /(?:https?:\/\/)?github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i;

function formatLatestRelease(release: GitHubRelease): string {
  const title = release.name || release.tag_name;
  const truncatedBody = release.body
    ? release.body.substring(0, 300) + (release.body.length > 300 ? "..." : "")
    : "No release notes";

  const publishedDate = release.published_at
    ? new Date(release.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  return (
    `\n\n📦 <b>Latest Release:</b>\n` +
    `<b>${escapeHtml(title)}</b>\n` +
    `📅 ${publishedDate}\n\n` +
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
    {
      command: "subscribe",
      description: "Subscribe to a repository (owner/repo)",
    },
    { command: "unsubscribe", description: "Unsubscribe from a repository" },
    { command: "list", description: "List your subscriptions" },
  ]);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Welcome to ReleaseWatch!\n\n" +
        "I monitor GitHub releases and notify you when new versions are published.\n\n" +
        "Commands:\n" +
        "/subscribe <owner/repo> - Subscribe to a repository\n" +
        "/unsubscribe <owner/repo> - Unsubscribe from a repository\n" +
        "/list - List your subscriptions\n\n" +
        "💡 Tip: You can also paste a GitHub URL directly to subscribe!",
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

    const latestRelease = await fetchAndFormatLatestRelease(env, repo);
    const message = `✅ Subscribed to ${repo}${latestRelease || ""}`;

    await ctx.reply(message, { parse_mode: "HTML" });
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

    const latestRelease = await fetchAndFormatLatestRelease(env, repo);
    const message = `✅ Subscribed to ${repo}${latestRelease || ""}`;

    await ctx.reply(message, { parse_mode: "HTML" });
  });

  return bot;
}
