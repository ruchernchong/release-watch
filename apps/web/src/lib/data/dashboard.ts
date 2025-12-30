import { getApi } from "@/lib/api";

export interface DashboardStats {
  reposWatched: number;
  activeChannels: number;
  totalChannels: number;
}

export interface Release {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  url: string;
  publishedAt: string | null;
  author: string | null;
  aiAnalysis: string | null;
}

export async function getDashboardStats() {
  const api = await getApi();
  const res = await api.dashboard.stats.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  return res.json();
}

export async function getReleases(limit = 5) {
  const api = await getApi();
  const res = await api.dashboard.releases.$get({
    query: { limit: limit.toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch releases");
  }

  return res.json();
}
