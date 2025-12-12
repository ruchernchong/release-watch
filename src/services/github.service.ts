import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubRelease =
  RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][number];

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

  return response.data.filter((release) => !release.draft);
}

export function parseFullName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo] = fullName.split("/");
  return { owner, repo };
}
