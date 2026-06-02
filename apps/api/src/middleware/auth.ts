import { createMiddleware } from "hono/factory";
import { importJWK, type JWK, jwtVerify } from "jose";

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
};

export type AuthEnv = {
  Variables: AuthVariables;
};

interface JWKSResponse {
  keys: JWK[];
}

type JWKSKey = Awaited<ReturnType<typeof importJWK>>;

// Cache JWKS keys per isolate with TTL
let cachedKeys: Map<string, JWKSKey> | null = null;
let cachedJWKSUrl: string | null = null;
let cacheExpiry = 0;
let fetchPromise: Promise<Map<string, JWKSKey>> | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchAndCacheJWKS(
  jwksUrl: string,
): Promise<Map<string, JWKSKey>> {
  const response = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const jwks = (await response.json()) as JWKSResponse;
  const keyMap = new Map<string, JWKSKey>();

  for (const jwk of jwks.keys) {
    if (jwk.kid) {
      const key = await importJWK(jwk, jwk.alg || "RS256");
      keyMap.set(jwk.kid, key);
    }
  }

  return keyMap;
}

async function getKey(jwksUrl: string, kid: string): Promise<JWKSKey> {
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
  const jwksUrl = process.env.JWKS_URL as string;

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
      console.warn("JWT verification failed", error);
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
