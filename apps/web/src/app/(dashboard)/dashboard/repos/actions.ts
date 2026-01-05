"use server";

import { revalidatePath } from "next/cache";
import { getApi } from "@/lib/api";

export async function createRepo(repoName: string) {
  const api = await getApi();
  const res = await api.repos.$post({
    json: { repoName },
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Failed to add repository");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/repos");
  return res.json();
}

export async function deleteRepo(id: string) {
  const api = await getApi();
  const res = await api.repos[":id"].$delete({
    param: { id },
  });

  if (!res.ok) {
    throw new Error("Failed to delete repository");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/repos");
  return res.json();
}

export async function toggleRepoPause(id: string, paused: boolean) {
  const api = await getApi();
  const res = await api.repos[":id"].pause.$patch({
    param: { id },
    json: { paused },
  });

  if (!res.ok) {
    throw new Error("Failed to update repository status");
  }

  revalidatePath("/dashboard/repos");
  return res.json();
}
