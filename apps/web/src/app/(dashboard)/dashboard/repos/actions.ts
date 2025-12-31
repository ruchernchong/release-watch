"use server";

import { revalidatePath } from "next/cache";
import { getApi } from "@/lib/api";

export async function createRepo(repoName: string) {
  const api = await getApi();
  const res = await api.repos.$post({
    json: { repoName },
  });

  if (!res.ok) {
    const data = await res.json();

    // Handle Zod validation errors (from @hono/zod-validator)
    if (data?.success === false && data?.error?.issues) {
      const issue = data.error.issues[0];
      throw new Error(issue?.message ?? "Validation failed");
    }

    // Handle API error responses
    const message =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "Failed to add repository";
    throw new Error(message);
  }

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
