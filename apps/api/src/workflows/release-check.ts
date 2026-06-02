import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { db, userRepos } from "@release-watch/database";
import type {
  AIAnalysisResult,
  NotificationPayload,
} from "@release-watch/types";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
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
  pruneInvalidTelegramChannels,
  setCachedAnalysis,
  setLastNotifiedTag,
} from "../services/kv.service";
import { captureEvent, flushPostHog, getPostHog } from "../services/posthog";
import {
  incrementNotificationsSent,
  incrementReleasesNotified,
} from "../services/stats.service";
import { sendTelegramNotification } from "../services/telegram.service";
import type { Env } from "../types/env";

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

const GITHUB_RETRY_CONFIG = {
  retries: {
    limit: 5,
    delay: "30 seconds" as const,
    backoff: "exponential" as const,
  },
  timeout: "2 minutes" as const,
};

const TELEGRAM_RETRY_CONFIG = {
  retries: {
    limit: 3,
    delay: "5 seconds" as const,
    backoff: "linear" as const,
  },
  timeout: "30 seconds" as const,
};

const KV_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "1 second" as const,
    backoff: "constant" as const,
  },
  timeout: "10 seconds" as const,
};

const AI_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "2 seconds" as const,
    backoff: "exponential" as const,
  },
  timeout: "30 seconds" as const,
};

const POSTHOG_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "1 second" as const,
    backoff: "constant" as const,
  },
  timeout: "10 seconds" as const,
};

export class ReleaseCheckWorkflow extends WorkflowEntrypoint<
  Env,
  ReleaseCheckParams
> {
  async run(event: WorkflowEvent<ReleaseCheckParams>, step: WorkflowStep) {
    const { chatId: scopedChatId } = event.payload;
    const normalizedScopedChatId = normalizeTelegramChatId(scopedChatId);
    logger.workflow.info("Started", {
      triggeredAt: event.payload.triggeredAt,
      chatId: scopedChatId,
    });

    const kvTrackedRepos = await step.do(
      "fetch-kv-repos",
      KV_RETRY_CONFIG,
      async () => {
        if (normalizedScopedChatId) {
          const repos = await getTrackedRepos(
            this.env.REPOS,
            normalizedScopedChatId,
          );
          const entries: [string, string[]][] =
            repos.length > 0 ? [[normalizedScopedChatId, repos]] : [];
          return entries;
        }
        const reposMap = await getAllTrackedRepos(this.env.REPOS);
        return Array.from(reposMap.entries());
      },
    );

    // Fetch DB-tracked repos and resolve userId → telegram chatIds.
    // This captures repos added via the web dashboard (userRepos) that do not
    // live in KV. Paused rows are returned alongside so the pause filter below
    // uses the same snapshot.
    const dbSource = await step.do(
      "fetch-db-repos",
      KV_RETRY_CONFIG,
      async () => {
        let scopedUserId: string | null = null;
        if (normalizedScopedChatId) {
          scopedUserId = await getUserIdByTelegramChat(
            this.env.CHANNELS,
            normalizedScopedChatId,
          );
          if (!scopedUserId) {
            return {
              chatEntries: [] as [string, string[]][],
              chatUserIds: [] as [string, string][],
              paused: [] as { userId: string; repoName: string }[],
            };
          }
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
          const repos = byUser.get(row.userId);
          if (repos) {
            repos.push(row.repoName);
          } else {
            byUser.set(row.userId, [row.repoName]);
          }
        }

        const chatEntries: [string, string[]][] = [];
        const chatUserIds: [string, string][] = [];
        const usersNeedingFallback = new Map<string, string[]>();
        const usersWithInvalidTelegramChannels = new Set<string>();
        const addChatTarget = (
          chatId: string,
          userId: string,
          repos: string[],
        ) => {
          chatEntries.push([chatId, repos]);
          chatUserIds.push([chatId, userId]);
        };

        for (const [userId, repos] of byUser) {
          if (scopedUserId === userId && normalizedScopedChatId) {
            addChatTarget(normalizedScopedChatId, userId, repos);
            continue;
          }

          const channels = await getChannels(this.env.CHANNELS, userId);
          let addedTelegramChannel = false;
          for (const channel of channels) {
            if (channel.type === "telegram" && channel.enabled) {
              const chatId = normalizeTelegramChatId(channel.chatId);
              if (!chatId) {
                usersWithInvalidTelegramChannels.add(userId);
                continue;
              }
              addChatTarget(chatId, userId, repos);
              addedTelegramChannel = true;
            }
          }
          if (!addedTelegramChannel) {
            usersNeedingFallback.set(userId, repos);
          }
        }

        if (usersNeedingFallback.size > 0) {
          const fallbackChatIds = await getTelegramChatIdsByUserIds(
            this.env.CHANNELS,
            new Set(usersNeedingFallback.keys()),
          );

          for (const [userId, repos] of usersNeedingFallback) {
            const chatIds = fallbackChatIds.get(userId) ?? [];
            for (const chatId of chatIds) {
              addChatTarget(chatId, userId, repos);
            }

            if (
              chatIds.length > 0 &&
              usersWithInvalidTelegramChannels.has(userId)
            ) {
              logger.workflow.warn(
                "Recovered Telegram chatId from KV mapping",
                undefined,
                { userId, recovered: chatIds.length },
              );
              continue;
            }

            if (!usersWithInvalidTelegramChannels.has(userId)) continue;

            const removed = await pruneInvalidTelegramChannels(
              this.env.CHANNELS,
              userId,
            );
            if (removed > 0) {
              logger.workflow.warn(
                "Pruned Telegram channels missing chatId",
                undefined,
                { userId, removed },
              );
            }
          }
        }

        return { chatEntries, chatUserIds, paused };
      },
    );

    const pausedReposSet = new Map<string, Set<string>>();
    for (const { userId, repoName } of dbSource.paused) {
      let set = pausedReposSet.get(userId);
      if (!set) {
        set = new Set();
        pausedReposSet.set(userId, set);
      }
      set.add(repoName);
    }

    const trackedRepos: [string, string[]][] = [];
    for (const [chatId, repos] of [
      ...kvTrackedRepos,
      ...dbSource.chatEntries,
    ]) {
      const normalizedChatId = normalizeTelegramChatId(chatId);
      if (!normalizedChatId || repos.length === 0) continue;
      trackedRepos.push([normalizedChatId, repos]);
    }

    if (trackedRepos.length === 0) {
      logger.workflow.info("No tracked repos found");
      return { processed: 0, notificationsSent: 0 };
    }

    const chatUserIdEntries = await step.do(
      "resolve-chat-user-ids",
      KV_RETRY_CONFIG,
      async () => {
        if (pausedReposSet.size === 0) {
          return [] as [string, string][];
        }

        const entries = [...dbSource.chatUserIds];
        const seenChatIds = new Set(entries.map(([chatId]) => chatId));

        for (const [chatId] of trackedRepos) {
          if (seenChatIds.has(chatId)) continue;
          seenChatIds.add(chatId);

          const userId = await getUserIdByTelegramChat(
            this.env.CHANNELS,
            chatId,
          );
          if (userId) {
            entries.push([chatId, userId]);
          }
        }

        return entries;
      },
    );
    const chatToUserId = new Map(chatUserIdEntries);

    const repoToChats = await step.do("build-repo-map", async () => {
      const map: Record<string, string[]> = {};
      const seen = new Map<string, Set<string>>();
      for (const [chatId, repos] of trackedRepos) {
        for (const repo of repos) {
          let chats = seen.get(repo);
          if (!chats) {
            chats = new Set();
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
    });

    const repos = Object.keys(repoToChats);
    const posthog = getPostHog(this.env.POSTHOG_API_KEY);

    const processRepo = async (
      repoFullName: string,
    ): Promise<RepoProcessResult> => {
      const chatIds = repoToChats[repoFullName];
      let releaseCountedForStats = false;
      let repoNotificationsSent = 0;
      let repoReleasesNotified = 0;

      let releaseInfo: ReleaseInfo | null = null;
      try {
        releaseInfo = await step.do(
          `fetch:${repoFullName}`,
          GITHUB_RETRY_CONFIG,
          async () => {
            const octokit = createOctokit(this.env.GITHUB_TOKEN);
            const parsed = parseFullName(repoFullName);
            if (!parsed) return null;
            const { owner, repo } = parsed;

            // Try GitHub releases first
            const releases = await getLatestReleases(octokit, owner, repo, 1);
            if (releases.length > 0) {
              return { type: "release" as const, data: releases[0] };
            }

            // Fallback to CHANGELOG.md
            const changelog = await getChangelogEntry(octokit, owner, repo);
            if (changelog) {
              return { type: "changelog" as const, data: changelog };
            }

            return null;
          },
        );
      } catch (error) {
        logger.workflow.error("Failed to fetch repo", error, {
          repo: repoFullName,
        });
        return {
          notificationsSent: repoNotificationsSent,
          releasesNotified: repoReleasesNotified,
        };
      }

      if (!releaseInfo) {
        return {
          notificationsSent: repoNotificationsSent,
          releasesNotified: repoReleasesNotified,
        };
      }

      const tagName =
        releaseInfo.type === "release"
          ? releaseInfo.data.tag_name
          : releaseInfo.data.version;

      // AI analysis with KV caching
      let aiAnalysis: AIAnalysisResult | null = null;
      try {
        const body =
          releaseInfo.type === "release"
            ? (releaseInfo.data.body ?? null)
            : releaseInfo.data.content;
        const releaseName =
          releaseInfo.type === "release"
            ? releaseInfo.data.name
            : `v${releaseInfo.data.version}`;

        // Check cache first
        const cachedAnalysis = await step.do(
          `ai-cache-get:${repoFullName}:${tagName}`,
          KV_RETRY_CONFIG,
          async () => {
            return getCachedAnalysis(this.env.CACHE, repoFullName, tagName);
          },
        );

        if (cachedAnalysis) {
          logger.workflow.debug("AI cache hit", {
            repo: repoFullName,
            tag: tagName,
          });
          aiAnalysis = cachedAnalysis;
        } else {
          // Run AI analysis
          const analysis = await step.do(
            `ai-analyze:${repoFullName}:${tagName}`,
            AI_RETRY_CONFIG,
            async () => {
              return analyzeRelease(
                this.env.AI,
                this.env.AI_GATEWAY_ID,
                repoFullName,
                tagName,
                releaseName,
                body,
              );
            },
          );

          if (analysis) {
            aiAnalysis = analysis;
            // Cache the result
            await step.do(
              `ai-cache-set:${repoFullName}:${tagName}`,
              KV_RETRY_CONFIG,
              async () => {
                await setCachedAnalysis(
                  this.env.CACHE,
                  repoFullName,
                  tagName,
                  analysis,
                );
              },
            );
            logger.workflow.info("Cached AI analysis", {
              repo: repoFullName,
              tag: tagName,
            });
          }
        }
      } catch (error) {
        logger.workflow.warn(
          "AI analysis failed, continuing without summary",
          error,
          { repo: repoFullName },
        );
      }

      for (const chatId of chatIds) {
        // Check if this repo is paused for this user
        const userId = chatToUserId.get(chatId);
        const isPaused = userId
          ? (pausedReposSet.get(userId)?.has(repoFullName) ?? false)
          : false;

        if (isPaused) {
          logger.workflow.debug("Skipping paused repo", {
            repo: repoFullName,
            chatId,
          });
          continue;
        }

        const lastNotified = await step.do(
          `check:${repoFullName}:${chatId}`,
          KV_RETRY_CONFIG,
          async () => {
            return getLastNotifiedTag(
              this.env.NOTIFICATIONS,
              chatId,
              repoFullName,
            );
          },
        );

        if (lastNotified === tagName) {
          continue;
        }

        // Separate try-catch blocks to handle each step independently
        // This prevents duplicate notifications: if notify succeeds but save fails,
        // we log the save failure separately and don't retry the notification
        let notificationSent = false;
        try {
          await step.do(
            `notify:${repoFullName}:${chatId}`,
            TELEGRAM_RETRY_CONFIG,
            async () => {
              const payload = toNotificationPayload(
                repoFullName,
                releaseInfo,
                aiAnalysis,
              );
              await sendTelegramNotification(
                this.env.TELEGRAM_BOT_TOKEN,
                chatId,
                payload,
              );
            },
          );
          notificationSent = true;
          captureEvent(posthog, {
            distinctId: `telegram:${chatId}`,
            event: "Telegram Notification Sent",
            properties: { repo: repoFullName, tag: tagName },
          });
        } catch (error) {
          logger.workflow.error("Failed to send notification", error, {
            repo: repoFullName,
            chatId,
          });
          captureEvent(posthog, {
            distinctId: `telegram:${chatId}`,
            event: "Telegram Notification Failed",
            properties: {
              repo: repoFullName,
              tag: tagName,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          continue;
        }

        try {
          await step.do(
            `save:${repoFullName}:${chatId}`,
            KV_RETRY_CONFIG,
            async () => {
              await setLastNotifiedTag(
                this.env.NOTIFICATIONS,
                chatId,
                repoFullName,
                tagName,
              );
            },
          );
          repoNotificationsSent++;

          if (!releaseCountedForStats) {
            repoReleasesNotified++;
            releaseCountedForStats = true;
          }
        } catch (error) {
          logger.workflow.warn(
            "Failed to save tag after notification sent, duplicate may occur",
            error,
            {
              repo: repoFullName,
              chatId,
            },
          );
          if (notificationSent) {
            repoNotificationsSent++;
          }
        }
      }

      return {
        notificationsSent: repoNotificationsSent,
        releasesNotified: repoReleasesNotified,
      };
    };

    const results: RepoProcessResult[] = [];
    for (let start = 0; start < repos.length; start += REPO_BATCH_SIZE) {
      const batch = repos.slice(start, start + REPO_BATCH_SIZE);
      const batchResults = await mapWithConcurrency(
        batch,
        REPO_CONCURRENCY,
        processRepo,
      );
      results.push(...batchResults);

      if (start + REPO_BATCH_SIZE < repos.length) {
        await step.sleep(
          `yield-after-repos:${start + batch.length}`,
          "1 second",
        );
      }
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
      try {
        await step.do("stats:notifications", KV_RETRY_CONFIG, async () => {
          await incrementNotificationsSent(this.env, notificationsSent);
        });
      } catch (error) {
        logger.workflow.warn("Failed to update notification stats", error);
      }
    }

    if (releasesNotified > 0) {
      try {
        await step.do("stats:releases", KV_RETRY_CONFIG, async () => {
          await incrementReleasesNotified(this.env, releasesNotified);
        });
      } catch (error) {
        logger.workflow.warn("Failed to update release stats", error);
      }
    }

    if (posthog) {
      try {
        await step.do("posthog:flush", POSTHOG_RETRY_CONFIG, async () => {
          await flushPostHog(posthog);
        });
      } catch (error) {
        logger.workflow.warn("Failed to flush PostHog events", error);
      }
    }

    logger.workflow.info("Completed", {
      reposProcessed: repos.length,
      notificationsSent,
    });

    return { processed: repos.length, notificationsSent };
  }
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
