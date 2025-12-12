import {
  createOctokit,
  type GitHubRelease,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  getAllSubscriptions,
  getLastNotifiedTag,
  setLastNotifiedTag,
} from "../services/kv.service";
import { sendTelegramNotification } from "../services/telegram.service";
import type { NotificationPayload } from "../types";
import type { Env } from "../types/env";

export async function handleSchedule(
  _event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(checkReleases(env));
}

async function checkReleases(env: Env): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting release check...`);

  const subscriptions = await getAllSubscriptions(env.SUBSCRIPTIONS);
  if (subscriptions.size === 0) {
    console.log("No subscriptions found");
    return;
  }

  // Build reverse map: repo -> chat IDs
  const repoToChats = new Map<string, string[]>();
  for (const [chatId, repos] of subscriptions) {
    for (const repo of repos) {
      const chats = repoToChats.get(repo) ?? [];
      chats.push(chatId);
      repoToChats.set(repo, chats);
    }
  }

  const octokit = createOctokit(env.GITHUB_TOKEN);

  for (const [repoFullName, chatIds] of repoToChats) {
    try {
      await processRepo(repoFullName, chatIds, octokit, env);
    } catch (error) {
      console.error(`Error processing repo ${repoFullName}:`, error);
    }
  }

  console.log(`[${new Date().toISOString()}] Release check completed`);
}

async function processRepo(
  repoFullName: string,
  chatIds: string[],
  octokit: ReturnType<typeof createOctokit>,
  env: Env,
): Promise<void> {
  const { owner, repo } = parseFullName(repoFullName);

  const releases = await getLatestReleases(octokit, owner, repo, 1);
  if (releases.length === 0) {
    return;
  }

  const latestRelease = releases[0];
  console.log(`Latest release for ${repoFullName}: ${latestRelease.tag_name}`);

  for (const chatId of chatIds) {
    const lastNotified = await getLastNotifiedTag(
      env.SUBSCRIPTIONS,
      chatId,
      repoFullName,
    );

    if (lastNotified === latestRelease.tag_name) {
      continue;
    }

    const payload = toNotificationPayload(repoFullName, latestRelease);
    try {
      await sendTelegramNotification(env.TELEGRAM_BOT_TOKEN, chatId, payload);
      await setLastNotifiedTag(
        env.SUBSCRIPTIONS,
        chatId,
        repoFullName,
        latestRelease.tag_name,
      );
      console.log(
        `Notified chat ${chatId} about ${repoFullName}@${latestRelease.tag_name}`,
      );
    } catch (error) {
      console.error(`Failed to notify chat ${chatId}:`, error);
    }
  }
}

function toNotificationPayload(
  repoFullName: string,
  release: GitHubRelease,
): NotificationPayload {
  return {
    repoName: repoFullName,
    tagName: release.tag_name,
    releaseName: release.name ?? null,
    body: release.body ?? null,
    url: release.html_url,
    author: release.author?.login ?? null,
    publishedAt: release.published_at ?? new Date().toISOString(),
  };
}
