import { authClient } from "./auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private token: string | null = null;
  private tokenPromise: Promise<void> | null = null;

  private async fetchToken(): Promise<string | null> {
    const { data, error } = await authClient.token();
    if (error || !data?.token) {
      console.error("Failed to fetch JWT token:", error);
      return null;
    }
    return data.token;
  }

  private async ensureToken(): Promise<string | null> {
    if (this.token) return this.token;

    if (!this.tokenPromise) {
      this.tokenPromise = (async () => {
        this.token = await this.fetchToken();
        this.tokenPromise = null;
      })();
    }

    await this.tokenPromise;
    return this.token;
  }

  private async refreshToken(): Promise<string | null> {
    this.token = null;
    return this.ensureToken();
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      const newToken = await this.refreshToken();
      if (!newToken) {
        throw new Error("Session expired");
      }

      const retryResponse = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({}));
        throw new Error(error.error || "Request failed");
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  clearToken() {
    this.token = null;
  }
}

export const api = new ApiClient();
