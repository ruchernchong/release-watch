import { db, userRepos } from "@shipradar/database";
import { and, eq } from "drizzle-orm";
import {
  addTrackedRepo,
  clearTrackedRepos,
  getTrackedRepos,
  getUserIdByTelegramChat,
  invalidateRepoRelatedCaches,
  removeTrackedRepo,
} from "./kv.service";

export type TrackedRepoState = { repoName: string; paused: boolean };

export type SetPausedResult =
  | { status: "updated"; paused: boolean }
  | { status: "unchanged"; paused: boolean }
  | { status: "not-linked" }
  | { status: "not-found" };

export async function addTrackedRepoForChat(
  chatId: string,
  repo: string,
): Promise<{ added: boolean }> {
  const normalized = repo.toLowerCase();
  const userId = await getUserIdByTelegramChat(chatId);

  if (userId) {
    const [row] = await db
      .insert(userRepos)
      .values({ userId, repoName: normalized })
      .onConflictDoNothing()
      .returning();
    if (row) {
      await invalidateRepoRelatedCaches(userId);
      return { added: true };
    }
    return { added: false };
  }

  return addTrackedRepo(chatId, normalized);
}

export async function removeTrackedRepoForChat(
  chatId: string,
  repo: string,
): Promise<void> {
  const normalized = repo.toLowerCase();
  const userId = await getUserIdByTelegramChat(chatId);

  if (userId) {
    await db
      .delete(userRepos)
      .where(
        and(eq(userRepos.userId, userId), eq(userRepos.repoName, normalized)),
      );
    await invalidateRepoRelatedCaches(userId);
    return;
  }

  await removeTrackedRepo(chatId, normalized);
}

export async function getTrackedReposForChat(
  chatId: string,
): Promise<string[]> {
  const userId = await getUserIdByTelegramChat(chatId);

  if (userId) {
    const rows = await db
      .select({ repoName: userRepos.repoName })
      .from(userRepos)
      .where(eq(userRepos.userId, userId));
    return rows.map((row) => row.repoName);
  }

  return getTrackedRepos(chatId);
}

export async function getTrackedReposWithStateForChat(
  chatId: string,
): Promise<{ linked: boolean; repos: TrackedRepoState[] }> {
  const userId = await getUserIdByTelegramChat(chatId);

  if (userId) {
    const rows = await db
      .select({ repoName: userRepos.repoName, paused: userRepos.paused })
      .from(userRepos)
      .where(eq(userRepos.userId, userId));
    return { linked: true, repos: rows };
  }

  const repos = await getTrackedRepos(chatId);
  return {
    linked: false,
    repos: repos.map((repoName) => ({ repoName, paused: false })),
  };
}

export async function setRepoPausedForChat(
  chatId: string,
  repo: string,
  paused: boolean,
): Promise<SetPausedResult> {
  const userId = await getUserIdByTelegramChat(chatId);
  if (!userId) return { status: "not-linked" };

  const normalized = repo.toLowerCase();
  const [row] = await db
    .select({ paused: userRepos.paused })
    .from(userRepos)
    .where(
      and(eq(userRepos.userId, userId), eq(userRepos.repoName, normalized)),
    );

  if (!row) return { status: "not-found" };
  if (row.paused === paused) return { status: "unchanged", paused };

  await db
    .update(userRepos)
    .set({ paused })
    .where(
      and(eq(userRepos.userId, userId), eq(userRepos.repoName, normalized)),
    );
  await invalidateRepoRelatedCaches(userId);
  return { status: "updated", paused };
}

export async function migrateChatReposToDb(
  chatId: string,
  userId: string,
): Promise<{ migrated: number }> {
  const kvRepos = await getTrackedRepos(chatId);
  if (kvRepos.length === 0) {
    return { migrated: 0 };
  }

  const rows = kvRepos.map((repo) => ({
    userId,
    repoName: repo.toLowerCase(),
  }));

  const inserted = await db
    .insert(userRepos)
    .values(rows)
    .onConflictDoNothing()
    .returning();

  await clearTrackedRepos(chatId);
  await invalidateRepoRelatedCaches(userId);

  return { migrated: inserted.length };
}
