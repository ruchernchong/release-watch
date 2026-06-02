import { db, userRepos } from "@shipradar/database";
import type { AIAnalysisResult, NotificationPayload } from "@shipradar/types";
import { eq } from "drizzle-orm";
import { analyzeRelease } from "../services/ai.service";
import {
  type ChangelogEntry,
  createOctokit,
  type GitHubRelease,
  getChangelogEntry,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  getAllTrackedRepos,
  getCachedAnalysis,
  getChannels,
  getLastNotifiedTag,
  getTelegramChatIdsByUserIds,
  getTrackedRepos,
  getUserIdByTelegramChat,
  normalizeTelegramChatId,
  setCachedAnalysis,
  setLastNotifiedTag,
} from "../services/kv.service";
import { captureEvent, flushPostHog, getPostHog } from "../services/posthog";
import {
  incrementNotificationsSent,
  incrementReleasesNotified,
} from "../services/stats.service";
import { sendTelegramNotification } from "../services/telegram.service";

export type ReleaseCheckParams = {
  triggeredAt: string;
  chatId?: string;
};

type ReleaseInfo =
  | { type: "release"; data: GitHubRelease }
  | { type: "changelog"; data: ChangelogEntry };

type RepoProcessResult = {
  notificationsSent: number;
  releasesNotified: number;
};

const REPO_BATCH_SIZE = 4;
const REPO_CONCURRENCY = 2;

export async function runReleaseCheck(params: ReleaseCheckParams) {
  "use workflow";

  return processReleaseCheck(params);
}

async function processReleaseCheck(params: ReleaseCheckParams) {
  const normalizedScopedChatId = normalizeTelegramChatId(params.chatId);
  console.log("Release check started", {
    triggeredAt: params.triggeredAt,
    chatId: params.chatId,
  });

  const [kvTrackedRepos, dbSource] = await Promise.all([
    getKvTrackedRepos(normalizedScopedChatId),
    getDbTrackedRepos(normalizedScopedChatId),
  ]);

  const pausedReposSet = new Map<string, Set<string>>();
  for (const { userId, repoName } of dbSource.paused) {
    const set = pausedReposSet.get(userId) ?? new Set<string>();
    set.add(repoName);
    pausedReposSet.set(userId, set);
  }

  const trackedRepos: [string, string[]][] = [];
  for (const [chatId, repos] of [...kvTrackedRepos, ...dbSource.chatEntries]) {
    const normalizedChatId = normalizeTelegramChatId(chatId);
    if (!normalizedChatId || repos.length === 0) continue;
    trackedRepos.push([normalizedChatId, repos]);
  }

  if (trackedRepos.length === 0) {
    console.log("No tracked repos found");
    return { processed: 0, notificationsSent: 0 };
  }

  const chatToUserId = await resolveChatUserIds(
    trackedRepos,
    dbSource.chatUserIds,
  );
  const repoToChats = buildRepoMap(trackedRepos);
  const repos = Object.keys(repoToChats);
  const posthog = getPostHog(process.env.POSTHOG_API_KEY);

  const results: RepoProcessResult[] = [];
  for (let start = 0; start < repos.length; start += REPO_BATCH_SIZE) {
    const batch = repos.slice(start, start + REPO_BATCH_SIZE);
    const batchResults = await mapWithConcurrency(
      batch,
      REPO_CONCURRENCY,
      async (repoFullName) =>
        processRepo(repoFullName, repoToChats, chatToUserId, pausedReposSet),
    );
    results.push(...batchResults);
  }

  const notificationsSent = results.reduce(
    (sum, result) => sum + result.notificationsSent,
    0,
  );
  const releasesNotified = results.reduce(
    (sum, result) => sum + result.releasesNotified,
    0,
  );

  if (notificationsSent > 0) {
    await incrementNotificationsSent(notificationsSent);
  }
  if (releasesNotified > 0) {
    await incrementReleasesNotified(releasesNotified);
  }

  await flushPostHog(posthog);

  console.log("Release check completed", {
    reposProcessed: repos.length,
    notificationsSent,
  });

  return { processed: repos.length, notificationsSent };
}

async function getKvTrackedRepos(
  scopedChatId: string | null,
): Promise<[string, string[]][]> {
  if (scopedChatId) {
    const repos = await getTrackedRepos(scopedChatId);
    return repos.length > 0 ? [[scopedChatId, repos]] : [];
  }

  return Array.from((await getAllTrackedRepos()).entries());
}

async function getDbTrackedRepos(scopedChatId: string | null) {
  const scopedUserId = scopedChatId
    ? await getUserIdByTelegramChat(scopedChatId)
    : null;

  if (scopedChatId && !scopedUserId) {
    return {
      chatEntries: [] as [string, string[]][],
      chatUserIds: [] as [string, string][],
      paused: [] as { userId: string; repoName: string }[],
    };
  }

  const rows = scopedUserId
    ? await db
        .select({
          userId: userRepos.userId,
          repoName: userRepos.repoName,
          paused: userRepos.paused,
        })
        .from(userRepos)
        .where(eq(userRepos.userId, scopedUserId))
    : await db
        .select({
          userId: userRepos.userId,
          repoName: userRepos.repoName,
          paused: userRepos.paused,
        })
        .from(userRepos);

  const byUser = new Map<string, string[]>();
  const paused: { userId: string; repoName: string }[] = [];
  for (const row of rows) {
    if (row.paused) {
      paused.push({ userId: row.userId, repoName: row.repoName });
      continue;
    }
    const repos = byUser.get(row.userId) ?? [];
    repos.push(row.repoName);
    byUser.set(row.userId, repos);
  }

  const chatEntries: [string, string[]][] = [];
  const chatUserIds: [string, string][] = [];
  const usersNeedingFallback = new Map<string, string[]>();

  for (const [userId, repos] of byUser) {
    if (scopedUserId === userId && scopedChatId) {
      chatEntries.push([scopedChatId, repos]);
      chatUserIds.push([scopedChatId, userId]);
      continue;
    }

    const channels = await getChannels(userId);
    let addedTelegramChannel = false;
    for (const channel of channels) {
      if (channel.type !== "telegram" || !channel.enabled) continue;
      const chatId = normalizeTelegramChatId(channel.chatId);
      if (!chatId) continue;
      chatEntries.push([chatId, repos]);
      chatUserIds.push([chatId, userId]);
      addedTelegramChannel = true;
    }

    if (!addedTelegramChannel) {
      usersNeedingFallback.set(userId, repos);
    }
  }

  const fallbackChatIds = await getTelegramChatIdsByUserIds(
    new Set(usersNeedingFallback.keys()),
  );
  for (const [userId, repos] of usersNeedingFallback) {
    for (const chatId of fallbackChatIds.get(userId) ?? []) {
      chatEntries.push([chatId, repos]);
      chatUserIds.push([chatId, userId]);
    }
  }

  return { chatEntries, chatUserIds, paused };
}

async function resolveChatUserIds(
  trackedRepos: [string, string[]][],
  knownEntries: [string, string][],
) {
  const entries = [...knownEntries];
  const seenChatIds = new Set(entries.map(([chatId]) => chatId));

  for (const [chatId] of trackedRepos) {
    if (seenChatIds.has(chatId)) continue;
    seenChatIds.add(chatId);
    const userId = await getUserIdByTelegramChat(chatId);
    if (userId) entries.push([chatId, userId]);
  }

  return new Map(entries);
}

function buildRepoMap(trackedRepos: [string, string[]][]) {
  const map: Record<string, string[]> = {};
  const seen = new Map<string, Set<string>>();
  for (const [chatId, repos] of trackedRepos) {
    for (const repo of repos) {
      const chats = seen.get(repo) ?? new Set<string>();
      if (!seen.has(repo)) {
        seen.set(repo, chats);
        map[repo] = [];
      }
      if (!chats.has(chatId)) {
        chats.add(chatId);
        map[repo].push(chatId);
      }
    }
  }
  return map;
}

async function processRepo(
  repoFullName: string,
  repoToChats: Record<string, string[]>,
  chatToUserId: Map<string, string>,
  pausedReposSet: Map<string, Set<string>>,
): Promise<RepoProcessResult> {
  const chatIds = repoToChats[repoFullName];
  let releaseCountedForStats = false;
  let repoNotificationsSent = 0;
  let repoReleasesNotified = 0;
  const posthog = getPostHog(process.env.POSTHOG_API_KEY);

  const releaseInfo = await getReleaseInfo(repoFullName);
  if (!releaseInfo) {
    return { notificationsSent: 0, releasesNotified: 0 };
  }

  const tagName =
    releaseInfo.type === "release"
      ? releaseInfo.data.tag_name
      : releaseInfo.data.version;
  const aiAnalysis = await getAiAnalysis(repoFullName, tagName, releaseInfo);

  for (const chatId of chatIds) {
    const userId = chatToUserId.get(chatId);
    const isPaused = userId
      ? (pausedReposSet.get(userId)?.has(repoFullName) ?? false)
      : false;
    if (isPaused) continue;

    const lastNotified = await getLastNotifiedTag(chatId, repoFullName);
    if (lastNotified === tagName) continue;

    try {
      await sendTelegramNotification(
        process.env.TELEGRAM_BOT_TOKEN as string,
        chatId,
        toNotificationPayload(repoFullName, releaseInfo, aiAnalysis),
      );
      captureEvent(posthog, {
        distinctId: `telegram:${chatId}`,
        event: "Telegram Notification Sent",
        properties: { repo: repoFullName, tag: tagName },
      });
    } catch (error) {
      console.error("Failed to send notification", error, {
        repo: repoFullName,
        chatId,
      });
      continue;
    }

    try {
      await setLastNotifiedTag(chatId, repoFullName, tagName);
      repoNotificationsSent++;
      if (!releaseCountedForStats) {
        repoReleasesNotified++;
        releaseCountedForStats = true;
      }
    } catch (error) {
      console.warn(
        "Failed to save tag after notification sent, duplicate may occur",
        error,
        { repo: repoFullName, chatId },
      );
      repoNotificationsSent++;
    }
  }

  return {
    notificationsSent: repoNotificationsSent,
    releasesNotified: repoReleasesNotified,
  };
}

async function getReleaseInfo(
  repoFullName: string,
): Promise<ReleaseInfo | null> {
  try {
    const octokit = createOctokit(process.env.GITHUB_TOKEN as string);
    const parsed = parseFullName(repoFullName);
    if (!parsed) return null;

    const releases = await getLatestReleases(
      octokit,
      parsed.owner,
      parsed.repo,
      1,
    );
    if (releases.length > 0) {
      return { type: "release", data: releases[0] };
    }

    const changelog = await getChangelogEntry(
      octokit,
      parsed.owner,
      parsed.repo,
    );
    return changelog ? { type: "changelog", data: changelog } : null;
  } catch (error) {
    console.error("Failed to fetch repo", error, { repo: repoFullName });
    return null;
  }
}

async function getAiAnalysis(
  repoFullName: string,
  tagName: string,
  releaseInfo: ReleaseInfo,
): Promise<AIAnalysisResult | null> {
  const cachedAnalysis = await getCachedAnalysis(repoFullName, tagName);
  if (cachedAnalysis) return cachedAnalysis;

  const body =
    releaseInfo.type === "release"
      ? (releaseInfo.data.body ?? null)
      : releaseInfo.data.content;
  const releaseName =
    releaseInfo.type === "release"
      ? releaseInfo.data.name
      : `v${releaseInfo.data.version}`;

  const analysis = await analyzeRelease(
    repoFullName,
    tagName,
    releaseName,
    body,
  );
  if (analysis) {
    await setCachedAnalysis(repoFullName, tagName, analysis);
  }
  return analysis;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex++;
        results[currentIndex] = await mapper(items[currentIndex]);
      }
    }),
  );

  return results;
}

function toNotificationPayload(
  repoFullName: string,
  releaseInfo: ReleaseInfo,
  aiAnalysis: AIAnalysisResult | null,
): NotificationPayload {
  if (releaseInfo.type === "release") {
    const release = releaseInfo.data;
    return {
      repoName: repoFullName,
      tagName: release.tag_name,
      releaseName: release.name ?? null,
      body: release.body ?? null,
      url: release.html_url,
      author: release.author?.login ?? null,
      publishedAt: release.published_at ?? new Date().toISOString(),
      aiAnalysis,
    };
  }

  const changelog = releaseInfo.data;
  return {
    repoName: repoFullName,
    tagName: changelog.version,
    releaseName: `v${changelog.version}`,
    body: changelog.content,
    url: changelog.url,
    author: null,
    publishedAt: changelog.date ?? new Date().toISOString(),
    aiAnalysis,
  };
}
