import {
  createOctokit,
  getLatestReleases,
  parseFullName,
} from "../services/github.service";
import type { Env } from "../types/env";

// Hardcoded repos for now (DB integration later)
const WATCHED_REPOS: string[] = [];

export async function handleSchedule(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(checkReleases(env));
}

async function checkReleases(env: Env): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting release check...`);

  const octokit = createOctokit(env.GITHUB_TOKEN);

  for (const repoFullName of WATCHED_REPOS) {
    try {
      await processRepo(repoFullName, octokit);
    } catch (error) {
      console.error(`Error processing repo ${repoFullName}:`, error);
    }
  }

  console.log(`[${new Date().toISOString()}] Release check completed`);
}

async function processRepo(
  repoFullName: string,
  octokit: ReturnType<typeof createOctokit>,
): Promise<void> {
  const { owner, repo } = parseFullName(repoFullName);

  const releases = await getLatestReleases(octokit, owner, repo, 5);
  console.log(`Found ${releases.length} releases for ${repoFullName}`);

  for (const release of releases) {
    console.log(`Release: ${release.tag_name} - ${release.name}`);
  }
}
