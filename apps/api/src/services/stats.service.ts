import type { Stats } from "../durable-objects/stats";
import type { SystemStats } from "../types";
import type { Env } from "../types/env";
import { getAllTrackedRepos } from "./kv.service";

const STATS_ID = "global-stats";
const NOTIFICATIONS_SENT_KEY = "notifications_sent";
const RELEASES_NOTIFIED_KEY = "releases_notified";

function getStatsStub(env: Env): DurableObjectStub<Stats> {
  const id = env.STATS.idFromName(STATS_ID);
  return env.STATS.get(id) as DurableObjectStub<Stats>;
}

async function computeStats(
  kv: KVNamespace,
): Promise<Pick<SystemStats, "uniqueUsers" | "reposWatched" | "reposTracked">> {
  const trackedReposMap = await getAllTrackedRepos(kv);

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

export async function incrementNotificationsSent(env: Env): Promise<number> {
  const stub = getStatsStub(env);
  return stub.increment(NOTIFICATIONS_SENT_KEY);
}

export async function incrementReleasesNotified(env: Env): Promise<number> {
  const stub = getStatsStub(env);
  return stub.increment(RELEASES_NOTIFIED_KEY);
}

export async function getSystemStats(env: Env): Promise<SystemStats> {
  const [computed, doStats] = await Promise.all([
    computeStats(env.REPOS),
    getStatsStub(env).getAll(),
  ]);

  return {
    ...computed,
    notificationsSent: doStats[NOTIFICATIONS_SENT_KEY] ?? 0,
    releasesNotified: doStats[RELEASES_NOTIFIED_KEY] ?? 0,
  };
}
