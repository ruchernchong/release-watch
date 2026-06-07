import { db, userRepos } from "@shipradar/database";
import { redis } from "@shipradar/redis";
import type { SystemStats } from "@shipradar/types";

// System-wide stats are global (not user-specific), so use shared `use cache`.
export async function getSystemStats(): Promise<SystemStats> {
  "use cache";

  const [chatKeys, dbRepos, notificationsSent, releasesNotified] =
    await Promise.all([
      redis.keys("repos:chat:*"),
      db
        .select({ userId: userRepos.userId, repoName: userRepos.repoName })
        .from(userRepos),
      redis.get<number>("notifications:sent"),
      redis.get<number>("releases:notified"),
    ]);

  const users = new Set<string>();
  const repos = new Set<string>();
  let reposTracked = 0;

  for (const key of chatKeys) {
    const tracked = (await redis.get<string[]>(key)) ?? [];
    users.add(`telegram:${key.replace("repos:chat:", "")}`);
    reposTracked += tracked.length;
    for (const repo of tracked) repos.add(repo);
  }

  for (const row of dbRepos) {
    users.add(`user:${row.userId}`);
    repos.add(row.repoName);
    reposTracked++;
  }

  return {
    uniqueUsers: users.size,
    reposWatched: repos.size,
    reposTracked,
    notificationsSent: notificationsSent ?? 0,
    releasesNotified: releasesNotified ?? 0,
  };
}
