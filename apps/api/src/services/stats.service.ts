import { redis } from "@shipradar/redis";
import type { SystemStats } from "@shipradar/types";
import { getAllTrackedRepos } from "./kv.service";

const NOTIFICATIONS_SENT_KEY = "notifications_sent";
const RELEASES_NOTIFIED_KEY = "releases_notified";

async function computeStats(): Promise<
  Pick<SystemStats, "uniqueUsers" | "reposWatched" | "reposTracked">
> {
  const trackedReposMap = await getAllTrackedRepos();

  const uniqueUsers = trackedReposMap.size;
  const allRepos = new Set<string>();
  let reposTracked = 0;

  for (const repos of trackedReposMap.values()) {
    reposTracked += repos.length;
    for (const repo of repos) {
      allRepos.add(repo);
    }
  }

  return {
    uniqueUsers,
    reposWatched: allRepos.size,
    reposTracked,
  };
}

export async function incrementNotificationsSent(amount = 1): Promise<number> {
  return redis.incrby(NOTIFICATIONS_SENT_KEY, amount);
}

export async function incrementReleasesNotified(amount = 1): Promise<number> {
  return redis.incrby(RELEASES_NOTIFIED_KEY, amount);
}

export async function getSystemStats(): Promise<SystemStats> {
  const [computed, notificationsSent, releasesNotified] = await Promise.all([
    computeStats(),
    redis.get<number>(NOTIFICATIONS_SENT_KEY),
    redis.get<number>(RELEASES_NOTIFIED_KEY),
  ]);

  return {
    ...computed,
    notificationsSent: notificationsSent ?? 0,
    releasesNotified: releasesNotified ?? 0,
  };
}
