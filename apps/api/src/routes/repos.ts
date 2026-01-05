import { zValidator } from "@hono/zod-validator";
import { userRepos } from "@release-watch/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { logger } from "../lib/logger";
import type { AuthEnv } from "../middleware/auth";
import {
  createOctokit,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  getCached,
  invalidateRepoRelatedCaches,
  invalidateUserReposCache,
  REPOS_CACHE_TTL,
  reposCacheKey,
  setCache,
} from "../services/kv.service";
import { captureEvent, flushPostHog, getPostHog } from "@api/services/posthog";

const app = new Hono<AuthEnv>()
  .basePath("/repos")
  .get("/", async (c) => {
    const user = c.get("user");
    const cacheKey = reposCacheKey(user.sub);

    try {
      const cached = await getCached<{ repos: unknown[] }>(
        c.env.CACHE,
        cacheKey,
      );
      if (cached) return c.json(cached);

      const database = c.get("db");
      const repos = await database.query.userRepos.findMany({
        where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
      });

      const response = { repos };
      await setCache(c.env.CACHE, cacheKey, response, REPOS_CACHE_TTL);
      return c.json(response);
    } catch (err) {
      logger.api.error("Failed to fetch repos", err, { userId: user.sub });
      return c.json({ error: "Failed to fetch repos" }, 500);
    }
  })
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        repoName: z.string().min(1),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const { repoName } = c.req.valid("json");

      const normalizedRepo = repoName.trim().toLowerCase();
      const repoPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

      if (!repoPattern.test(normalizedRepo)) {
        return c.json(
          { error: "Invalid repository format. Use owner/repo" },
          400,
        );
      }

      try {
        const octokit = createOctokit(c.env.GITHUB_TOKEN);
        const parsed = parseFullName(normalizedRepo);
        if (!parsed) {
          return c.json({ error: "Invalid repository format" }, 400);
        }
        const { owner, repo } = parsed;

        try {
          await octokit.repos.get({ owner, repo });
        } catch {
          return c.json({ error: "Repository not found on GitHub" }, 404);
        }

        const database = c.get("db");

        const [trackedRepo] = await database
          .insert(userRepos)
          .values({
            userId: user.sub,
            repoName: normalizedRepo,
          })
          .onConflictDoNothing()
          .returning();

        if (!trackedRepo) {
          return c.json({ error: "Already tracking this repository" }, 409);
        }

        const posthog = getPostHog(c.env.POSTHOG_API_KEY);
        captureEvent(posthog, {
          distinctId: user.sub,
          event: "Repo Added",
          properties: { repo: normalizedRepo },
        });
        c.executionCtx.waitUntil(flushPostHog(posthog));

        await invalidateRepoRelatedCaches(c.env.CACHE, user.sub);
        return c.json({ repo: trackedRepo }, 201);
      } catch (err) {
        logger.api.error("Failed to add repo", err, {
          userId: user.sub,
          repoName: normalizedRepo,
        });
        return c.json({ error: "Failed to add repo" }, 500);
      }
    },
  )
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    try {
      const database = c.get("db");

      const [deleted] = await database
        .delete(userRepos)
        .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
        .returning();

      if (!deleted) {
        return c.json({ error: "Repo not found" }, 404);
      }

      const posthog = getPostHog(c.env.POSTHOG_API_KEY);
      captureEvent(posthog, {
        distinctId: user.sub,
        event: "Repo Removed",
        properties: { repo: deleted.repoName },
      });
      c.executionCtx.waitUntil(flushPostHog(posthog));

      await invalidateRepoRelatedCaches(c.env.CACHE, user.sub);
      return c.json({ success: true });
    } catch (err) {
      logger.api.error("Failed to delete repo", err, {
        userId: user.sub,
        repoId: id,
      });
      return c.json({ error: "Failed to delete repo" }, 500);
    }
  })
  .patch(
    "/:id/pause",
    zValidator(
      "json",
      z.object({
        paused: z.boolean(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const id = c.req.param("id");
      const { paused } = c.req.valid("json");

      try {
        const database = c.get("db");

        const [repo] = await database
          .select()
          .from(userRepos)
          .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
          .limit(1);

        if (!repo) {
          return c.json({ error: "Repo not found" }, 404);
        }

        const updateData: { paused: boolean; lastNotifiedTag?: string } = {
          paused,
        };

        if (!paused) {
          try {
            const octokit = createOctokit(c.env.GITHUB_TOKEN);
            const parsed = parseFullName(repo.repoName);
            if (parsed) {
              const { owner, repo: repoName } = parsed;
              const latestReleases = await getLatestReleases(
                octokit,
                owner,
                repoName,
                1,
              );
              if (latestReleases.length > 0) {
                updateData.lastNotifiedTag = latestReleases[0].tag_name;
              }
            }
          } catch (err) {
            logger.api.warn(
              "Failed to fetch latest release when unpausing",
              err,
              {
                repoName: repo.repoName,
              },
            );
          }
        }

        const [updated] = await database
          .update(userRepos)
          .set(updateData)
          .where(and(eq(userRepos.id, id), eq(userRepos.userId, user.sub)))
          .returning();

        await invalidateUserReposCache(c.env.CACHE, user.sub);
        return c.json({ repo: updated });
      } catch (err) {
        logger.api.error("Failed to update repo pause status", err, {
          userId: user.sub,
          repoId: id,
        });
        return c.json({ error: "Failed to update repo pause status" }, 500);
      }
    },
  );

export default app;
