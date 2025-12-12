import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubRelease =
  RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][number];

export interface ChangelogEntry {
  version: string;
  date: string | null;
  content: string;
  url: string;
}

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

export async function getChangelogEntry(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<ChangelogEntry | null> {
  const filenames = ["CHANGELOG.md", "CHANGELOG", "changelog.md", "HISTORY.md"];

  for (const filename of filenames) {
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: filename,
      });

      if ("content" in response.data && response.data.type === "file") {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8",
        );
        const entry = parseChangelog(content);
        if (entry) {
          return {
            ...entry,
            url: `https://github.com/${owner}/${repo}/blob/main/${filename}`,
          };
        }
      }
    } catch {}
  }

  return null;
}

function parseChangelog(content: string): Omit<ChangelogEntry, "url"> | null {
  // Common changelog heading patterns:
  // ## 2.0.67 (claude-code style)
  // ## [1.0.0] - 2024-01-01
  // ## [1.0.0] (2024-01-01)
  // ## 1.0.0 - 2024-01-01
  // ## v1.0.0
  const versionPattern =
    /^##\s+\[?v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)\]?(?:\s*[-–(]\s*(\d{4}-\d{2}-\d{2}))?/m;

  const match = content.match(versionPattern);
  if (!match) {
    return null;
  }

  const version = match[1];
  const date = match[2] || null;

  // Extract content until the next version heading or end of file
  const startIndex = match.index! + match[0].length;
  const nextVersionMatch = content
    .slice(startIndex)
    .match(/\n##\s+\[?v?\d+\.\d+/);
  const endIndex = nextVersionMatch
    ? startIndex + nextVersionMatch.index!
    : content.length;

  const entryContent = content.slice(startIndex, endIndex).trim();

  return {
    version,
    date,
    content: entryContent.slice(0, 2000),
  };
}
