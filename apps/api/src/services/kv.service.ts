import { redis } from "@shipradar/redis";
import type {
  AIAnalysisResult,
  ChannelConfig,
  TelegramChannelConfig,
  TelegramLinkRequest,
} from "@shipradar/types";

type KVGetType = "text" | "json" | "arrayBuffer" | "stream";

type KVListOptions = {
  prefix?: string;
  cursor?: string;
  limit?: number;
};

type KVPutOptions = {
  expirationTtl?: number;
};

type KVListResult = {
  keys: { name: string }[];
  list_complete: boolean;
  cursor?: string;
};

type KVNamespaceLike = {
  get(key: string): Promise<string | null>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  get(key: string, type: Exclude<KVGetType, "json">): Promise<string | null>;
  put(key: string, value: string, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
};

function createKVNamespace(namespace: string): KVNamespaceLike {
  const key = (key: string) => `${namespace}:${key}`;
  const stripNamespace = (redisKey: string) =>
    redisKey.startsWith(`${namespace}:`)
      ? redisKey.slice(namespace.length + 1)
      : redisKey;

  async function get(keyName: string): Promise<string | null>;
  async function get<T>(keyName: string, type: "json"): Promise<T | null>;
  async function get(
    keyName: string,
    type: Exclude<KVGetType, "json">,
  ): Promise<string | null>;
  async function get(
    keyName: string,
    type?: KVGetType,
  ): Promise<unknown | null> {
    const value = await redis.get<unknown>(key(keyName));
    if (value === null) return null;

    if (type === "json") {
      if (typeof value === "string") return JSON.parse(value) as unknown;
      return value as unknown;
    }

    if (typeof value === "string") return value;
    return JSON.stringify(value);
  }

  return {
    get,
    async put(keyName, value, options) {
      if (options?.expirationTtl) {
        await redis.set(key(keyName), value, { ex: options.expirationTtl });
        return;
      }

      await redis.set(key(keyName), value);
    },
    async delete(keyName) {
      await redis.del(key(keyName));
    },
    async list(options = {}) {
      const prefix = key(options.prefix ?? "");
      const cursor = options.cursor ?? "0";
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: options.limit ?? 100,
      });

      return {
        keys: keys.map((redisKey) => ({ name: stripNamespace(redisKey) })),
        list_complete: nextCursor === "0",
        cursor: nextCursor === "0" ? undefined : nextCursor,
      };
    },
  };
}

const reposKv = createKVNamespace("repos");
const notificationsKv = createKVNamespace("notifications");
const cacheKv = createKVNamespace("cache");
const channelsKv = createKVNamespace("channels");

const CHAT_PREFIX = "chat:";
const NOTIFIED_PREFIX = "notified:";
const RELEASE_PREFIX = "release:";
const CHANNELS_PREFIX = "channels:";
const TELEGRAM_PREFIX = "telegram:";
const LINK_PREFIX = "link:";

export async function getTrackedRepos(chatId: string): Promise<string[]> {
  const data = await reposKv.get<string[]>(`${CHAT_PREFIX}${chatId}`, "json");
  return data ?? [];
}

export async function addTrackedRepo(
  chatId: string,
  repo: string,
): Promise<{ added: boolean }> {
  const normalized = repo.toLowerCase();
  const trackedRepos = await getTrackedRepos(chatId);
  if (trackedRepos.some((existing) => existing.toLowerCase() === normalized)) {
    return { added: false };
  }
  trackedRepos.push(normalized);
  await reposKv.put(`${CHAT_PREFIX}${chatId}`, JSON.stringify(trackedRepos));
  return { added: true };
}

export async function removeTrackedRepo(
  chatId: string,
  repo: string,
): Promise<void> {
  const trackedRepos = await getTrackedRepos(chatId);
  const filtered = trackedRepos.filter((trackedRepo) => trackedRepo !== repo);
  if (filtered.length === 0) {
    await reposKv.delete(`${CHAT_PREFIX}${chatId}`);
  } else {
    await reposKv.put(`${CHAT_PREFIX}${chatId}`, JSON.stringify(filtered));
  }
}

export async function clearTrackedRepos(chatId: string): Promise<void> {
  await reposKv.delete(`${CHAT_PREFIX}${chatId}`);
}

export async function getAllChatIds(): Promise<string[]> {
  const chatIds: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await reposKv.list({ prefix: CHAT_PREFIX, cursor });
    for (const key of result.keys) {
      chatIds.push(key.name.replace(CHAT_PREFIX, ""));
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return chatIds;
}

function notifiedKey(chatId: string, repo: string): string {
  return `${NOTIFIED_PREFIX}${chatId}:${repo}`;
}

export async function getLastNotifiedTag(
  chatId: string,
  repo: string,
): Promise<string | null> {
  return notificationsKv.get(notifiedKey(chatId, repo));
}

export async function setLastNotifiedTag(
  chatId: string,
  repo: string,
  tag: string,
): Promise<void> {
  await notificationsKv.put(notifiedKey(chatId, repo), tag);
}

export async function getAllTrackedRepos(): Promise<Map<string, string[]>> {
  const trackedReposMap = new Map<string, string[]>();
  const chatIds = await getAllChatIds();

  for (const chatId of chatIds) {
    const repos = await getTrackedRepos(chatId);
    trackedReposMap.set(chatId, repos);
  }

  return trackedReposMap;
}

function releaseKey(repo: string, tag: string): string {
  return `${RELEASE_PREFIX}${repo}:${tag}`;
}

export async function getCachedAnalysis(
  repo: string,
  tag: string,
): Promise<AIAnalysisResult | null> {
  return cacheKv.get<AIAnalysisResult>(releaseKey(repo, tag), "json");
}

export async function setCachedAnalysis(
  repo: string,
  tag: string,
  analysis: AIAnalysisResult,
): Promise<void> {
  await cacheKv.put(releaseKey(repo, tag), JSON.stringify(analysis));
}

export async function getChannels(userId: string): Promise<ChannelConfig[]> {
  const data = await channelsKv.get<ChannelConfig[]>(
    `${CHANNELS_PREFIX}${userId}`,
    "json",
  );
  return data ?? [];
}

export function normalizeTelegramChatId(chatId: unknown): string | null {
  if (typeof chatId !== "string") return null;
  const trimmed = chatId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getTelegramChatIdsByUserIds(
  userIds: Set<string>,
): Promise<Map<string, string[]>> {
  const chatIdsByUserId = new Map<string, string[]>();
  if (userIds.size === 0) return chatIdsByUserId;

  let cursor: string | undefined;
  do {
    const result = await channelsKv.list({ prefix: TELEGRAM_PREFIX, cursor });
    for (const key of result.keys) {
      const chatId = normalizeTelegramChatId(
        key.name.slice(TELEGRAM_PREFIX.length),
      );
      if (!chatId) continue;

      const userId = await channelsKv.get(key.name);
      if (!userId || !userIds.has(userId)) continue;

      const chatIds = chatIdsByUserId.get(userId);
      if (chatIds) {
        chatIds.push(chatId);
      } else {
        chatIdsByUserId.set(userId, [chatId]);
      }
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return chatIdsByUserId;
}

export async function pruneInvalidTelegramChannels(
  userId: string,
): Promise<number> {
  const channels = await getChannels(userId);
  let removed = 0;
  const validChannels = channels.filter((channel) => {
    if (channel.type !== "telegram") return true;
    if (normalizeTelegramChatId(channel.chatId)) return true;
    removed++;
    return false;
  });

  if (removed === 0) return 0;

  if (validChannels.length === 0) {
    await channelsKv.delete(`${CHANNELS_PREFIX}${userId}`);
  } else {
    await channelsKv.put(
      `${CHANNELS_PREFIX}${userId}`,
      JSON.stringify(validChannels),
    );
  }

  return removed;
}

export async function addChannel(
  userId: string,
  channel: ChannelConfig,
): Promise<void> {
  const channels = await getChannels(userId);

  const isDuplicate = channels.some((existingChannel) => {
    if (existingChannel.type === "telegram" && channel.type === "telegram") {
      return existingChannel.chatId === channel.chatId;
    }
    if (existingChannel.type === "discord" && channel.type === "discord") {
      return existingChannel.channelId === channel.channelId;
    }
    return false;
  });

  if (!isDuplicate) {
    channels.push(channel);
    await channelsKv.put(
      `${CHANNELS_PREFIX}${userId}`,
      JSON.stringify(channels),
    );
  }
}

export async function removeChannel(
  userId: string,
  channelType: ChannelConfig["type"],
  identifier: string,
): Promise<void> {
  const channels = await getChannels(userId);
  const filtered = channels.filter((existingChannel) => {
    if (existingChannel.type !== channelType) return true;
    if (existingChannel.type === "telegram") {
      return existingChannel.chatId !== identifier;
    }
    if (existingChannel.type === "discord") {
      return existingChannel.channelId !== identifier;
    }
    return true;
  });

  if (filtered.length === 0) {
    await channelsKv.delete(`${CHANNELS_PREFIX}${userId}`);
  } else {
    await channelsKv.put(
      `${CHANNELS_PREFIX}${userId}`,
      JSON.stringify(filtered),
    );
  }
}

export async function updateChannelEnabled(
  userId: string,
  channelType: ChannelConfig["type"],
  identifier: string,
  enabled: boolean,
): Promise<void> {
  const channels = await getChannels(userId);
  let changed = false;
  const updated = channels.map((existingChannel) => {
    if (existingChannel.type !== channelType) return existingChannel;
    if (
      existingChannel.type === "telegram" &&
      existingChannel.chatId === identifier
    ) {
      if (existingChannel.enabled === enabled) return existingChannel;
      changed = true;
      return { ...existingChannel, enabled };
    }
    if (
      existingChannel.type === "discord" &&
      existingChannel.channelId === identifier
    ) {
      if (existingChannel.enabled === enabled) return existingChannel;
      changed = true;
      return { ...existingChannel, enabled };
    }
    return existingChannel;
  });
  if (!changed) return;
  await channelsKv.put(`${CHANNELS_PREFIX}${userId}`, JSON.stringify(updated));
}

const LINK_CODE_TTL = 10 * 60;

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 6;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    const index = bytes[i] & 31;
    code += chars.charAt(index);
  }
  return code;
}

export async function createTelegramLinkCode(userId: string): Promise<string> {
  const code = generateLinkCode();
  const request: TelegramLinkRequest = {
    userId,
    expiresAt: new Date(Date.now() + LINK_CODE_TTL * 1000).toISOString(),
  };
  await channelsKv.put(`${LINK_PREFIX}${code}`, JSON.stringify(request), {
    expirationTtl: LINK_CODE_TTL,
  });
  return code;
}

export async function validateTelegramLinkCode(
  code: string,
): Promise<TelegramLinkRequest | null> {
  const data = await channelsKv.get<TelegramLinkRequest>(
    `${LINK_PREFIX}${code}`,
    "json",
  );
  if (!data) return null;

  if (new Date(data.expiresAt) < new Date()) {
    await channelsKv.delete(`${LINK_PREFIX}${code}`);
    return null;
  }
  return data;
}

export async function completeTelegramLink(
  code: string,
  chatId: string,
): Promise<{ userId: string; alreadyLinked?: boolean } | null> {
  const linkRequest = await validateTelegramLinkCode(code);
  if (!linkRequest) return null;

  const existingUserId = await getUserIdByTelegramChat(chatId);
  if (existingUserId && existingUserId !== linkRequest.userId) {
    return { userId: existingUserId, alreadyLinked: true };
  }

  await channelsKv.put(`${TELEGRAM_PREFIX}${chatId}`, linkRequest.userId);

  const telegramChannel: TelegramChannelConfig = {
    type: "telegram",
    chatId,
    enabled: true,
    addedAt: new Date().toISOString(),
  };
  await addChannel(linkRequest.userId, telegramChannel);
  await channelsKv.delete(`${LINK_PREFIX}${code}`);

  return { userId: linkRequest.userId };
}

export async function getUserIdByTelegramChat(
  chatId: string,
): Promise<string | null> {
  return channelsKv.get(`${TELEGRAM_PREFIX}${chatId}`);
}

export async function unlinkTelegramChat(chatId: string): Promise<void> {
  const userId = await getUserIdByTelegramChat(chatId);
  if (userId) {
    await removeChannel(userId, "telegram", chatId);
    await channelsKv.delete(`${TELEGRAM_PREFIX}${chatId}`);
  }
}

const API_REPOS_PREFIX = "api:repos:";
const API_STATS_PREFIX = "api:stats:";
const API_RELEASES_PREFIX = "api:releases:";

export const REPOS_CACHE_TTL = 5 * 60;
export const STATS_CACHE_TTL = 5 * 60;
export const RELEASES_CACHE_TTL = 10 * 60;

export async function getCached<T>(key: string): Promise<T | null> {
  return cacheKv.get<T>(key, "json");
}

export async function setCache<T>(
  key: string,
  value: T,
  ttl: number,
): Promise<void> {
  await cacheKv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}

export function reposCacheKey(userId: string): string {
  return `${API_REPOS_PREFIX}${userId}`;
}

export function statsCacheKey(userId: string): string {
  return `${API_STATS_PREFIX}${userId}`;
}

export function releasesCacheKey(userId: string, limit: number): string {
  return `${API_RELEASES_PREFIX}${userId}:${limit}`;
}

export async function invalidateUserReposCache(userId: string): Promise<void> {
  await cacheKv.delete(reposCacheKey(userId));
}

export async function invalidateUserStatsCache(userId: string): Promise<void> {
  await cacheKv.delete(statsCacheKey(userId));
}

export async function invalidateUserReleasesCache(
  userId: string,
): Promise<void> {
  const prefix = `${API_RELEASES_PREFIX}${userId}:`;
  let cursor: string | undefined;
  do {
    const result = await cacheKv.list({ prefix, cursor });
    await Promise.all(result.keys.map((key) => cacheKv.delete(key.name)));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
}

export async function invalidateRepoRelatedCaches(
  userId: string,
): Promise<void> {
  await Promise.all([
    invalidateUserReposCache(userId),
    invalidateUserStatsCache(userId),
    invalidateUserReleasesCache(userId),
  ]);
}
