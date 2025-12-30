import { getApi } from "@/lib/api";

export interface Repo {
  id: string;
  repoName: string;
  lastNotifiedTag: string | null;
  paused: boolean;
  createdAt: string;
}

export async function getRepos(): Promise<{ repos: Repo[] }> {
  const api = await getApi();
  const res = await api.repos.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch repos");
  }

  const data = await res.json();
  return data as { repos: Repo[] };
}
