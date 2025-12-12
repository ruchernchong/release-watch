import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { AIAnalysisResult } from "../services/ai.service";
import {
  type ChangelogEntry,
  createOctokit,
  type GitHubRelease,
  getChangelogEntry,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  getAllSubscriptions,
  getLastNotifiedTag,
  setLastNotifiedTag,
} from "../services/kv.service";
import {
  incrementNotificationsSent,
  incrementReleasesNotified,
} from "../services/stats.service";
import { sendTelegramNotification } from "../services/telegram.service";
import type { NotificationPayload } from "../types";
import type { Env } from "../types/env";
import type { AIAnalysisOutput, AIAnalysisParams } from "./ai-analysis";

export type ReleaseCheckParams = {
  triggeredAt: string;
};

type ReleaseInfo =
  | { type: "release"; data: GitHubRelease }
  | { type: "changelog"; data: ChangelogEntry };

const GITHUB_RETRY_CONFIG = {
  retries: {
    limit: 5,
    delay: "30 seconds",
    backoff: "exponential" as const,
  },
  timeout: "2 minutes",
};

const TELEGRAM_RETRY_CONFIG = {
  retries: {
    limit: 3,
    delay: "5 seconds",
    backoff: "linear" as const,
  },
  timeout: "30 seconds",
};

const KV_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "1 second",
    backoff: "constant" as const,
  },
  timeout: "10 seconds",
};

const AI_WORKFLOW_RETRY_CONFIG = {
  retries: {
    limit: 2,
    delay: "5 seconds",
    backoff: "exponential" as const,
  },
  timeout: "60 seconds",
};

export class ReleaseCheckWorkflow extends WorkflowEntrypoint<
  Env,
  ReleaseCheckParams
> {
  async run(event: WorkflowEvent<ReleaseCheckParams>, step: WorkflowStep) {
    console.log(`[Workflow] Started at ${event.payload.triggeredAt}`);

    const subscriptions = await step.do(
      "fetch-subscriptions",
      KV_RETRY_CONFIG,
      async () => {
        const subs = await getAllSubscriptions(this.env.SUBSCRIPTIONS);
        return Array.from(subs.entries());
      },
    );

    if (subscriptions.length === 0) {
      console.log("[Workflow] No subscriptions found");
      return { processed: 0, notificationsSent: 0 };
    }

    const repoToChats = await step.do("build-repo-map", async () => {
      const map: Record<string, string[]> = {};
      for (const [chatId, repos] of subscriptions) {
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
    let notificationsSent = 0;

    for (const repoFullName of repos) {
      const chatIds = repoToChats[repoFullName];
      let releaseCountedForStats = false;

      let releaseInfo: ReleaseInfo | null = null;
      try {
        releaseInfo = await step.do(
          `fetch:${repoFullName}`,
          GITHUB_RETRY_CONFIG,
          async () => {
            const octokit = createOctokit(this.env.GITHUB_TOKEN);
            const { owner, repo } = parseFullName(repoFullName);

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
        continue;
      }

      if (!releaseInfo) {
        continue;
      }

      const tagName =
        releaseInfo.type === "release"
          ? releaseInfo.data.tag_name
          : releaseInfo.data.version;

      // AI analysis via child workflow (handles caching internally)
      let aiAnalysis: AIAnalysisResult | null = null;
      try {
        const body =
          releaseInfo.type === "release"
            ? releaseInfo.data.body
            : releaseInfo.data.content;
        const releaseName =
          releaseInfo.type === "release"
            ? releaseInfo.data.name
            : `v${releaseInfo.data.version}`;

        const aiResult = await step.do(
          `ai-workflow:${repoFullName}:${tagName}`,
          AI_WORKFLOW_RETRY_CONFIG,
          async () => {
            const params: AIAnalysisParams = {
              repoFullName,
              tagName,
              releaseName,
              body,
            };

            // Create AI analysis workflow instance
            const instance = await this.env.AI_ANALYSIS_WORKFLOW.create({
              id: `ai-${repoFullName.replace("/", "-")}-${tagName}`,
              params,
            });

            // Poll for completion
            let status = await instance.status();
            while (
              status.status !== "complete" &&
              status.status !== "errored" &&
              status.status !== "terminated"
            ) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              status = await instance.status();
            }

            if (status.status === "complete" && status.output) {
              return status.output as AIAnalysisOutput;
            }

            if (status.error) {
              throw new Error(status.error);
            }

            return null;
          },
        );

        if (aiResult) {
          aiAnalysis = aiResult.analysis;
          if (aiResult.cached) {
            console.log(
              `[Workflow] AI cache hit for ${repoFullName}@${tagName}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `[Workflow] AI workflow failed for ${repoFullName}:`,
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
              this.env.SUBSCRIPTIONS,
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
                this.env.SUBSCRIPTIONS,
                chatId,
                repoFullName,
                tagName,
              );
            },
          );
          notificationsSent++;

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
            notificationsSent++;
          }
        }
      }
    }

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
