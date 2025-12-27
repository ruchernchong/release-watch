import { Bot, InlineKeyboard } from "grammy";
import {
  createOctokit,
  type GitHubRelease,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  addTrackedRepo,
  completeTelegramLink,
  getTrackedRepos,
  removeTrackedRepo,
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
  const reposKv = env.REPOS;
  const channelsKv = env.CHANNELS;

  await bot.api.setMyCommands([
    {
      command: "start",
      description: "Start the bot and see available commands",
    },
    { command: "check", description: "Manually check for new releases" },
    { command: "untrack", description: "Stop tracking a repository" },
    { command: "list", description: "List your tracked repos" },
    { command: "link", description: "Link to your web dashboard account" },
  ]);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Welcome to ReleaseWatch!\n\n" +
        "I monitor GitHub releases and notify you when new versions are published.\n\n" +
        "To track a repo, simply paste a GitHub repository URL:\n" +
        "https://github.com/owner/repo\n\n" +
        "Commands:\n" +
        "/check - Manually check for new releases\n" +
        "/untrack - Stop tracking a repository\n" +
        "/list - List your tracked repos\n" +
        "/link - Link to your web dashboard account",
    );
  });

  bot.command("check", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const trackedRepos = await getTrackedRepos(reposKv, chatId);

    if (trackedRepos.length === 0) {
      await ctx.reply("No tracked repos yet. Paste a GitHub URL to start tracking.");
      return;
    }

    await ctx.reply("🔍 Checking for new releases...");

    try {
      const instanceId = `manual-check-${chatId}-${Date.now()}`;
      await env.RELEASE_CHECK_WORKFLOW.create({
        id: instanceId,
        params: { triggeredAt: new Date().toISOString() },
      });
      await ctx.reply(
        `✅ Release check triggered for ${trackedRepos.length} tracked repo(s)`,
      );
    } catch (error) {
      console.error("[Bot] Failed to trigger release check:", error);
      await ctx.reply("❌ Failed to trigger release check. Please try again.");
    }
  });

  bot.command("untrack", async (ctx) => {
    const repo = ctx.match?.trim();
    const chatId = ctx.chat.id.toString();
    const trackedRepos = await getTrackedRepos(reposKv, chatId);

    if (trackedRepos.length === 0) {
      await ctx.reply("No tracked repos to remove.");
      return;
    }

    // If no repo specified, show inline keyboard with tracked repos
    if (!repo) {
      const keyboard = new InlineKeyboard();
      for (const trackedRepo of trackedRepos) {
        keyboard.text(`❌ ${trackedRepo}`, `untrack:${trackedRepo}`).row();
      }

      await ctx.reply("Select a repository to stop tracking:", {
        reply_markup: keyboard,
      });
      return;
    }

    // Case-insensitive matching for typed repo name
    const matchedRepo = trackedRepos.find(
      (trackedRepo) => trackedRepo.toLowerCase() === repo.toLowerCase(),
    );

    if (!matchedRepo) {
      await ctx.reply(`Not tracking ${repo}`);
      return;
    }

    await removeTrackedRepo(reposKv, chatId, matchedRepo);
    await ctx.reply(`✅ Stopped tracking ${matchedRepo}`);
  });

  bot.command("list", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const trackedRepos = await getTrackedRepos(reposKv, chatId);

    if (trackedRepos.length === 0) {
      await ctx.reply("No tracked repos yet. Paste a GitHub URL to start tracking.");
      return;
    }

    const list = trackedRepos.map((repo) => `• ${repo}`).join("\n");
    await ctx.reply(`📋 Your tracked repos:\n\n${list}`);
  });

  bot.command("link", async (ctx) => {
    const code = ctx.match?.trim().toUpperCase();
    const chatId = ctx.chat.id.toString();

    if (!code) {
      await ctx.reply(
        "🔗 To link your Telegram account:\n\n" +
          "1. Go to the ReleaseWatch dashboard\n" +
          "2. Click 'Link Telegram'\n" +
          "3. Copy the 6-character code\n" +
          "4. Send /link CODE here\n\n" +
          "Example: /link ABC123",
      );
      return;
    }

    // Valid characters: A-H, J-N, P-Z, 2-9 (excludes I, O, 0, 1 to avoid confusion)
    const validCodePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    if (!validCodePattern.test(code)) {
      await ctx.reply(
        "❌ Invalid code format. Please enter a 6-character code using only letters and numbers.",
      );
      return;
    }

    const result = await completeTelegramLink(channelsKv, code, chatId);

    if (!result) {
      await ctx.reply(
        "❌ Invalid or expired code. Please generate a new one from the dashboard.",
      );
      return;
    }

    if (result.alreadyLinked) {
      await ctx.reply(
        "⚠️ This Telegram account is already linked to another user.",
      );
      return;
    }

    await ctx.reply("✅ Successfully linked to your ReleaseWatch account!");
  });

  // Handle inline keyboard button clicks for untrack
  bot.callbackQuery(/^untrack:(.+)$/, async (ctx) => {
    const repo = ctx.match[1];
    const chatId = ctx.chat?.id.toString();

    if (!chatId) {
      await ctx.answerCallbackQuery({ text: "Error: Could not identify chat" });
      return;
    }

    const trackedRepos = await getTrackedRepos(reposKv, chatId);
    if (!trackedRepos.includes(repo)) {
      await ctx.answerCallbackQuery({ text: "Already removed" });
      await ctx.editMessageText("Repository already removed.");
      return;
    }

    await removeTrackedRepo(reposKv, chatId, repo);
    await ctx.answerCallbackQuery({ text: "Removed!" });
    await ctx.editMessageText(`✅ Stopped tracking ${repo}`);
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const match = text.match(GITHUB_URL_PATTERN);

    if (!match) return;

    const repo = match[1].replace(/\/$/, "");
    const chatId = ctx.chat.id.toString();

    const trackedRepos = await getTrackedRepos(reposKv, chatId);
    if (trackedRepos.includes(repo)) {
      await ctx.reply(`Already tracking ${repo}`);
      return;
    }

    await addTrackedRepo(reposKv, chatId, repo);
    await ctx.reply(`✅ Now tracking ${repo}`);

    const latestRelease = await fetchAndFormatLatestRelease(env, repo);
    if (latestRelease) {
      await ctx.reply(latestRelease, { parse_mode: "HTML" });
    }
  });

  return bot;
}
