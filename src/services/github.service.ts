import { Octokit } from "@octokit/rest";
import type { GitHubRelease } from "../types";

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function getLatestReleases(
  octokit: Octokit,
  owner: string,
  repo: string,
  perPage = 10,
): Promise<GitHubRelease[]> {
  const response = await octokit.repos.listReleases({
    owner,
    repo,
    per_page: perPage,
  });

  // Filter out drafts
  return response.data.filter((release) => !release.draft) as GitHubRelease[];
}

export function parseFullName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo] = fullName.split("/");
  return { owner, repo };
}
