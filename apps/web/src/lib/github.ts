// Types for GitHub API responses used in client-side fetches

export interface GitHubRepoResponse {
  name: string;
  owner: { login: string };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
}

export type GitHubLanguageColors = Record<string, { color: string }>;
