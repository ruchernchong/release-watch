import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { userRepos } from "@release-watch/database";
import type { NotificationPayload } from "@release-watch/types";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../lib/logger";
import { type AIAnalysisResult, analyzeRelease } from "../services/ai.service";
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
  getLastNotifiedTag,
  getUserIdByTelegramChat,
  setCachedAnalysis,
  setLastNotifiedTag,
} from "../services/kv.service";
import {
  incrementNotificationsSent,
  incrementReleasesNotified,
} from "../services/stats.service";
import { sendTelegramNotification } from "../services/telegram.service";
import type { Env } from "../types/env";

export type ReleaseCheckParams = {
  triggeredAt: string;
};

type ReleaseInfo =
  | { type: "release"; data: GitHubRelease }
  | { type: "changelog"; data: ChangelogEntry };

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

export class ReleaseCheckWorkflow extends WorkflowEntrypoint<
  Env,
  ReleaseCheckParams
> {
  async run(event: WorkflowEvent<ReleaseCheckParams>, step: WorkflowStep) {
    logger.workflow.info("Started", { triggeredAt: event.payload.triggeredAt });

    const trackedRepos = await step.do(
      "fetch-tracked-repos",
      KV_RETRY_CONFIG,
      async () => {
        const reposMap = await getAllTrackedRepos(this.env.REPOS);
        return Array.from(reposMap.entries());
      },
    );

    // Fetch paused repos from database to filter them out
    const pausedReposSet = await step.do(
      "fetch-paused-repos",
      KV_RETRY_CONFIG,
      async () => {
        const database = db(this.env.HYPERDRIVE);
        const pausedRepos = await database
          .select({ repoName: userRepos.repoName, userId: userRepos.userId })
          .from(userRepos)
          .where(eq(userRepos.paused, true));

        // Build a map of userId -> Set<repoName> for efficient lookup
        const pausedMap = new Map<string, Set<string>>();
        for (const { userId, repoName } of pausedRepos) {
          if (!pausedMap.has(userId)) {
            pausedMap.set(userId, new Set());
          }
          pausedMap.get(userId)?.add(repoName);
        }
        return pausedMap;
      },
    );

    if (trackedRepos.length === 0) {
      logger.workflow.info("No tracked repos found");
      return { processed: 0, notificationsSent: 0 };
    }

    const repoToChats = await step.do("build-repo-map", async () => {
      const map: Record<string, string[]> = {};
      for (const [chatId, repos] of trackedRepos) {
        for (const repo of repos) {
          if (!map[repo]) {
            map[repo] = [];
          }
          map[repo].push(chatId);
        }
      }
      return map;
    });

    const repos = Object.keys(repoToChats);

    // Process all repositories in parallel
    const results = await Promise.all(
      repos.map(async (repoFullName) => {
        const chatIds = repoToChats[repoFullName];
        let releaseCountedForStats = false;
        let repoNotificationsSent = 0;

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
          return repoNotificationsSent;
        }

        if (!releaseInfo) {
          return repoNotificationsSent;
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
          const isPaused = await step.do(
            `check-paused:${repoFullName}:${chatId}`,
            KV_RETRY_CONFIG,
            async () => {
              const userId = await getUserIdByTelegramChat(
                this.env.CHANNELS,
                chatId,
              );
              if (!userId) return false;
              return (
                pausedReposSet.has(userId) &&
                (pausedReposSet.get(userId)?.has(repoFullName) ?? false)
              );
            },
          );

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
          } catch (error) {
            logger.workflow.error("Failed to send notification", error, {
              repo: repoFullName,
              chatId,
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

            // Track stats: increment notifications sent
            await step.do(
              `stats:notification:${repoFullName}:${chatId}`,
              KV_RETRY_CONFIG,
              async () => {
                await incrementNotificationsSent(this.env);
              },
            );

            // Track stats: increment releases notified (once per unique release)
            if (!releaseCountedForStats) {
              await step.do(
                `stats:release:${repoFullName}:${tagName}`,
                KV_RETRY_CONFIG,
                async () => {
                  await incrementReleasesNotified(this.env);
                },
              );
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

        return repoNotificationsSent;
      }),
    );

    const notificationsSent = results.reduce((sum, count) => sum + count, 0);

    logger.workflow.info("Completed", {
      reposProcessed: repos.length,
      notificationsSent,
    });

    return { processed: repos.length, notificationsSent };
  }
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
