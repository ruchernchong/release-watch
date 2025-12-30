import type { AppType } from "@release-watch/api/types";
import { hc } from "hono/client";
import { headers } from "next/headers";
import { auth } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function getToken(): Promise<string> {
  const response = await auth.api.getToken({
    headers: await headers(),
  });

  if (!response?.token) {
    throw new Error("Not authenticated");
  }

  return response.token;
}

export async function getApi() {
  const token = await getToken();

  return hc<AppType>(API_BASE, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      }),
  });
}
