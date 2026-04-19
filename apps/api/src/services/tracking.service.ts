import { db, userRepos } from "@release-watch/database";
import { and, eq } from "drizzle-orm";
import type { Env } from "../types/env";
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
  env: Env,
  chatId: string,
  repo: string,
): Promise<{ added: boolean }> {
  const normalized = repo.toLowerCase();
  const userId = await getUserIdByTelegramChat(env.CHANNELS, chatId);

  if (userId) {
    const [row] = await db
      .insert(userRepos)
      .values({ userId, repoName: normalized })
      .onConflictDoNothing()
      .returning();
    if (row) {
      await invalidateRepoRelatedCaches(env.CACHE, userId);
      return { added: true };
    }
    return { added: false };
  }

  return addTrackedRepo(env.REPOS, chatId, normalized);
}

export async function removeTrackedRepoForChat(
  env: Env,
  chatId: string,
  repo: string,
): Promise<void> {
  const normalized = repo.toLowerCase();
  const userId = await getUserIdByTelegramChat(env.CHANNELS, chatId);

  if (userId) {
    await db
      .delete(userRepos)
      .where(
        and(eq(userRepos.userId, userId), eq(userRepos.repoName, normalized)),
      );
    await invalidateRepoRelatedCaches(env.CACHE, userId);
    return;
  }

  await removeTrackedRepo(env.REPOS, chatId, normalized);
}

export async function getTrackedReposForChat(
  env: Env,
  chatId: string,
): Promise<string[]> {
  const userId = await getUserIdByTelegramChat(env.CHANNELS, chatId);

  if (userId) {
    const rows = await db
      .select({ repoName: userRepos.repoName })
      .from(userRepos)
      .where(eq(userRepos.userId, userId));
    return rows.map((row) => row.repoName);
  }

  return getTrackedRepos(env.REPOS, chatId);
}

export async function getTrackedReposWithStateForChat(
  env: Env,
  chatId: string,
): Promise<{ linked: boolean; repos: TrackedRepoState[] }> {
  const userId = await getUserIdByTelegramChat(env.CHANNELS, chatId);

  if (userId) {
    const rows = await db
      .select({ repoName: userRepos.repoName, paused: userRepos.paused })
      .from(userRepos)
      .where(eq(userRepos.userId, userId));
    return { linked: true, repos: rows };
  }

  const repos = await getTrackedRepos(env.REPOS, chatId);
  return {
    linked: false,
    repos: repos.map((repoName) => ({ repoName, paused: false })),
  };
}

export async function setRepoPausedForChat(
  env: Env,
  chatId: string,
  repo: string,
  paused: boolean,
): Promise<SetPausedResult> {
  const userId = await getUserIdByTelegramChat(env.CHANNELS, chatId);
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
  await invalidateRepoRelatedCaches(env.CACHE, userId);
  return { status: "updated", paused };
}

export async function migrateChatReposToDb(
  env: Env,
  chatId: string,
  userId: string,
): Promise<{ migrated: number }> {
  const kvRepos = await getTrackedRepos(env.REPOS, chatId);
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

  await clearTrackedRepos(env.REPOS, chatId);
  await invalidateRepoRelatedCaches(env.CACHE, userId);

  return { migrated: inserted.length };
}
