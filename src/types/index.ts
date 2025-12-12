// GitHub API types
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  author: {
    login: string;
  } | null;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

// Notification payload
export interface NotificationPayload {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
  url: string;
  author: string | null;
  publishedAt: string;
}
