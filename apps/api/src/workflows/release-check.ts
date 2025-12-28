import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
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
  setCachedAnalysis,
  setLastNotifiedTag,
} from "../services/kv.service";
import {
  incrementNotificationsSent,
  incrementReleasesNotified,
} from "../services/stats.service";
import { sendTelegramNotification } from "../services/telegram.service";
import type { NotificationPayload } from "../types";
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
    console.log(`[Workflow] Started at ${event.payload.triggeredAt}`);

    const trackedRepos = await step.do(
      "fetch-tracked-repos",
      KV_RETRY_CONFIG,
      async () => {
        const reposMap = await getAllTrackedRepos(this.env.REPOS);
        return Array.from(reposMap.entries());
      },
    );

    if (trackedRepos.length === 0) {
      console.log("[Workflow] No tracked repos found");
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
          console.error(`[Workflow] Failed to fetch ${repoFullName}:`, error);
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
            console.log(
              `[Workflow] AI cache hit for ${repoFullName}@${tagName}`,
            );
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
              console.log(
                `[Workflow] Cached AI analysis for ${repoFullName}@${tagName}`,
              );
            }
          }
        } catch (error) {
          console.error(
            `[Workflow] AI analysis failed for ${repoFullName}:`,
            error,
          );
          // Continue without AI analysis - graceful degradation
        }

        for (const chatId of chatIds) {
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
            console.error(
              `[Workflow] Failed to send notification to ${chatId} for ${repoFullName}:`,
              error,
            );
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
            // Notification was sent but save failed - log warning about potential duplicate
            console.error(
              `[Workflow] Failed to save tag for ${chatId}:${repoFullName} after successful notification. ` +
                `Duplicate notification may occur on next run.`,
              error,
            );
            // Still count as sent since user received the notification
            if (notificationSent) {
              repoNotificationsSent++;
            }
          }
        }

        return repoNotificationsSent;
      }),
    );

    const notificationsSent = results.reduce((sum, count) => sum + count, 0);
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
