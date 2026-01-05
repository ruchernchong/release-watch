import type { Release } from "@/components/dashboard/release-card";
import { getApi } from "@/lib/api";

export interface DashboardStats {
  reposWatched: number;
  activeChannels: number;
  totalChannels: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const api = await getApi();
  const res = await api.dashboard.stats.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  return res.json() as Promise<DashboardStats>;
}

export async function getReleases(limit = 5): Promise<{ releases: Release[] }> {
  const api = await getApi();
  const res = await api.dashboard.releases.$get({
    query: { limit: limit.toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch releases");
  }

  const data = await res.json();
  return { releases: data.releases as Release[] };
}
