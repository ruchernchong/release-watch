import { createMiddleware } from "hono/factory";
import { type JWK, importJWK, jwtVerify } from "jose";
import type { Database } from "../db";
import { logger } from "../lib/logger";
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

interface JWKSResponse {
  keys: JWK[];
}

// Cache JWKS keys per isolate with TTL
let cachedKeys: Map<string, CryptoKey> | null = null;
let cachedJWKSUrl: string | null = null;
let cacheExpiry = 0;
let fetchPromise: Promise<Map<string, CryptoKey>> | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchAndCacheJWKS(
  jwksUrl: string
): Promise<Map<string, CryptoKey>> {
  const response = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 600, cacheEverything: true }, // Cloudflare edge cache for 10 min
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const jwks: JWKSResponse = await response.json();
  const keyMap = new Map<string, CryptoKey>();

  for (const jwk of jwks.keys) {
    if (jwk.kid) {
      const key = await importJWK(jwk, jwk.alg || "RS256");
      keyMap.set(jwk.kid, key as CryptoKey);
    }
  }

  return keyMap;
}

async function getKey(jwksUrl: string, kid: string): Promise<CryptoKey> {
  const now = Date.now();

  // Return cached key if valid
  if (cachedKeys && cachedJWKSUrl === jwksUrl && now < cacheExpiry) {
    const key = cachedKeys.get(kid);
    if (key) return key;
  }

  // Deduplicate concurrent fetches with singleton promise
  if (!fetchPromise) {
    fetchPromise = fetchAndCacheJWKS(jwksUrl).finally(() => {
      fetchPromise = null;
    });
  }

  const keys = await fetchPromise;
  cachedKeys = keys;
  cachedJWKSUrl = jwksUrl;
  cacheExpiry = now + CACHE_TTL_MS;

  const key = keys.get(kid);
  if (!key) {
    throw new Error(`Key with kid "${kid}" not found in JWKS`);
  }
  return key;
}

function getKeyResolver(jwksUrl: string) {
  return async (protectedHeader: { kid?: string }) => {
    if (!protectedHeader.kid) {
      throw new Error("JWT missing kid header");
    }
    return getKey(jwksUrl, protectedHeader.kid);
  };
}

export const jwtAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const jwksUrl = c.env.JWKS_URL;

  if (!jwksUrl) {
    logger.auth.error("JWKS_URL environment variable is not set");
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const keyResolver = getKeyResolver(jwksUrl);
    const { payload } = await jwtVerify(token, keyResolver);

    c.set("user", payload as JWTPayload);
    await next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return c.json({ error: "Token expired" }, 401);
      }
      logger.auth.warn("JWT verification failed", error);
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
