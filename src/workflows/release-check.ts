import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
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

      let latestRelease: GitHubRelease | null = null;
      try {
        latestRelease = await step.do(
          `fetch:${repoFullName}`,
          GITHUB_RETRY_CONFIG,
          async () => {
            const octokit = createOctokit(this.env.GITHUB_TOKEN);
            const { owner, repo } = parseFullName(repoFullName);
            const releases = await getLatestReleases(octokit, owner, repo, 1);
            return releases.length > 0 ? releases[0] : null;
          },
        );
      } catch (error) {
        console.error(`[Workflow] Failed to fetch ${repoFullName}:`, error);
        continue;
      }

      if (!latestRelease) {
        continue;
      }

      // Capture release in a const for type safety inside closures
      const release = latestRelease;

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

        if (lastNotified === release.tag_name) {
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
              const payload = toNotificationPayload(repoFullName, release);
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
                release.tag_name,
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
              `stats:release:${repoFullName}:${release.tag_name}`,
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
