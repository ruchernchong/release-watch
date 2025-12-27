import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Database } from "../db";
import type { Env } from "../types/env";

export interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export type AuthVariables = {
  user: JWTPayload;
  db: Database;
};

export type AuthEnv = {
  Bindings: Env;
  Variables: AuthVariables;
};

// Cache JWKS per isolate to avoid refetching on every request
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJWKSUrl: string | null = null;

function getJWKS(jwksUrl: string) {
  if (cachedJWKS && cachedJWKSUrl === jwksUrl) {
    return cachedJWKS;
  }
  cachedJWKS = createRemoteJWKSet(new URL(jwksUrl));
  cachedJWKSUrl = jwksUrl;
  return cachedJWKS;
}

export const jwtAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const jwksUrl = c.env.JWKS_URL;

  if (!jwksUrl) {
    console.error("JWKS_URL environment variable is not set");
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const JWKS = getJWKS(jwksUrl);
    const { payload } = await jwtVerify(token, JWKS);

    c.set("user", payload as JWTPayload);
    await next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return c.json({ error: "Token expired" }, 401);
      }
      console.error("JWT verification failed:", error.message);
    }
    return c.json({ error: "Invalid token" }, 401);
  }
});

export const adminOnly = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
});
