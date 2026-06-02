import { zValidator } from "@hono/zod-validator";
import { db } from "@shipradar/database";
import { Hono } from "hono";
import * as z from "zod";
import type { AuthEnv } from "../middleware/auth";
import {
  createOctokit,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import {
  getCached,
  getCachedAnalysis,
  getChannels,
  RELEASES_CACHE_TTL,
  releasesCacheKey,
  STATS_CACHE_TTL,
  setCache,
  statsCacheKey,
} from "../services/kv.service";

const app = new Hono<AuthEnv>()
  .basePath("/dashboard")
  .get("/stats", async (c) => {
    const user = c.get("user");
    const cacheKey = statsCacheKey(user.sub);

    try {
      const cached = await getCached<{
        reposWatched: number;
        activeChannels: number;
        totalChannels: number;
      }>(cacheKey);
      if (cached) return c.json(cached);

      const repos = await db.query.userRepos.findMany({
        where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
        columns: { id: true },
      });

      const channels = await getChannels(user.sub);
      const activeChannels = channels.filter((ch) => ch.enabled).length;

      const response = {
        reposWatched: repos.length,
        activeChannels,
        totalChannels: channels.length,
      };
      await setCache(cacheKey, response, STATS_CACHE_TTL);
      return c.json(response);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err, {
        userId: user.sub,
      });
      return c.json({ error: "Failed to fetch stats" }, 500);
    }
  })
  .get(
    "/releases",
    zValidator(
      "query",
      z.object({
        limit: z.coerce.number().int().min(1).max(20).default(5),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const { limit } = c.req.valid("query");
      const cacheKey = releasesCacheKey(user.sub, limit);

      try {
        const cached = await getCached<{ releases: unknown[] }>(cacheKey);
        if (cached) return c.json(cached);

        const octokit = createOctokit(process.env.GITHUB_TOKEN as string);

        const repos = await db.query.userRepos.findMany({
          where: (userRepos, { eq }) => eq(userRepos.userId, user.sub),
          columns: { repoName: true },
          limit: 10,
        });

        const releases = await Promise.all(
          repos.map(async ({ repoName }) => {
            try {
              const parsed = parseFullName(repoName);
              if (!parsed) return null;
              const { owner, repo } = parsed;
              const latestReleases = await getLatestReleases(
                octokit,
                owner,
                repo,
                1,
              );

              if (latestReleases.length === 0) return null;

              const release = latestReleases[0];
              const aiAnalysis = await getCachedAnalysis(
                repoName,
                release.tag_name,
              );

              return {
                repoName,
                tagName: release.tag_name,
                releaseName: release.name,
                url: release.html_url,
                publishedAt: release.published_at,
                author: release.author?.login ?? null,
                aiAnalysis,
              };
            } catch {
              return null;
            }
          }),
        );

        const validReleases = releases
          .filter((r) => r !== null)
          .sort((a, b) => {
            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, limit);

        const response = { releases: validReleases };
        await setCache(cacheKey, response, RELEASES_CACHE_TTL);
        return c.json(response);
      } catch (err) {
        console.error("Failed to fetch releases", err, { userId: user.sub });
        return c.json({ error: "Failed to fetch releases" }, 500);
      }
    },
  );

export default app;
