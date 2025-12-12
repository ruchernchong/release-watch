// Database row types
export interface RepoRow {
  id: number;
  full_name: string;
  enabled: number; // SQLite uses 0/1 for boolean
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseRow {
  id: number;
  repo_id: number;
  github_release_id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  author_login: string | null;
  published_at: string;
  created_at: string;
}

export interface NotificationRow {
  id: number;
  release_id: number;
  channel_type: "telegram" | "discord";
  channel_id: string;
  sent_at: string;
  success: number; // SQLite uses 0/1 for boolean
  error_message: string | null;
}

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
