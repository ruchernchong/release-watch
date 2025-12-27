import type {
  AIAnalysisResult,
  ChannelConfig,
  TelegramChannelConfig,
  TelegramLinkRequest,
} from "@release-watch/types";

// Key prefixes for each KV namespace
// REPOS KV - tracked repos per chat
const CHAT_PREFIX = "chat:";
// NOTIFICATIONS KV - last notified tag per chat/repo
const NOTIFIED_PREFIX = "notified:";
// CACHE KV - AI analysis cache per release
const RELEASE_PREFIX = "release:";
// CHANNELS KV - user notification channels + integration mappings
const CHANNELS_PREFIX = "channels:";
const TELEGRAM_PREFIX = "telegram:";
const LINK_PREFIX = "link:";

export async function getTrackedRepos(
  kv: KVNamespace,
  chatId: string,
): Promise<string[]> {
  const data = await kv.get<string[]>(`${CHAT_PREFIX}${chatId}`, "json");
  return data ?? [];
}

export async function addTrackedRepo(
  kv: KVNamespace,
  chatId: string,
  repo: string,
): Promise<void> {
  const trackedRepos = await getTrackedRepos(kv, chatId);
  if (!trackedRepos.includes(repo)) {
    trackedRepos.push(repo);
    await kv.put(`${CHAT_PREFIX}${chatId}`, JSON.stringify(trackedRepos));
  }
}

export async function removeTrackedRepo(
  kv: KVNamespace,
  chatId: string,
  repo: string,
): Promise<void> {
  const trackedRepos = await getTrackedRepos(kv, chatId);
  const filtered = trackedRepos.filter((trackedRepo) => trackedRepo !== repo);
  if (filtered.length === 0) {
    await kv.delete(`${CHAT_PREFIX}${chatId}`);
  } else {
    await kv.put(`${CHAT_PREFIX}${chatId}`, JSON.stringify(filtered));
  }
}

export async function getAllChatIds(kv: KVNamespace): Promise<string[]> {
  const chatIds: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix: CHAT_PREFIX, cursor });
    for (const key of result.keys) {
      chatIds.push(key.name.replace(CHAT_PREFIX, ""));
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return chatIds;
}

// Notification tracking
function notifiedKey(chatId: string, repo: string): string {
  return `${NOTIFIED_PREFIX}${chatId}:${repo}`;
}

export async function getLastNotifiedTag(
  kv: KVNamespace,
  chatId: string,
  repo: string,
): Promise<string | null> {
  return kv.get(notifiedKey(chatId, repo));
}

export async function setLastNotifiedTag(
  kv: KVNamespace,
  chatId: string,
  repo: string,
  tag: string,
): Promise<void> {
  await kv.put(notifiedKey(chatId, repo), tag);
}

export async function getAllTrackedRepos(
  kv: KVNamespace,
): Promise<Map<string, string[]>> {
  const trackedReposMap = new Map<string, string[]>();
  const chatIds = await getAllChatIds(kv);

  for (const chatId of chatIds) {
    const repos = await getTrackedRepos(kv, chatId);
    trackedReposMap.set(chatId, repos);
  }

  return trackedReposMap;
}

// Release analysis cache
function releaseKey(repo: string, tag: string): string {
  return `${RELEASE_PREFIX}${repo}:${tag}`;
}

export async function getCachedAnalysis(
  kv: KVNamespace,
  repo: string,
  tag: string,
): Promise<AIAnalysisResult | null> {
  return kv.get<AIAnalysisResult>(releaseKey(repo, tag), "json");
}

export async function setCachedAnalysis(
  kv: KVNamespace,
  repo: string,
  tag: string,
  analysis: AIAnalysisResult,
): Promise<void> {
  await kv.put(releaseKey(repo, tag), JSON.stringify(analysis));
}

// ============================================
// Multi-channel support
// ============================================

export async function getChannels(
  kv: KVNamespace,
  userId: string,
): Promise<ChannelConfig[]> {
  const data = await kv.get<ChannelConfig[]>(
    `${CHANNELS_PREFIX}${userId}`,
    "json",
  );
  return data ?? [];
}

export async function addChannel(
  kv: KVNamespace,
  userId: string,
  channel: ChannelConfig,
): Promise<void> {
  const channels = await getChannels(kv, userId);

  const isDuplicate = channels.some((existingChannel) => {
    if (existingChannel.type === "telegram" && channel.type === "telegram") {
      return existingChannel.chatId === channel.chatId;
    }
    if (existingChannel.type === "discord" && channel.type === "discord") {
      return existingChannel.webhookUrl === channel.webhookUrl;
    }
    return false;
  });

  if (!isDuplicate) {
    channels.push(channel);
    await kv.put(`${CHANNELS_PREFIX}${userId}`, JSON.stringify(channels));
  }
}

export async function removeChannel(
  kv: KVNamespace,
  userId: string,
  channelType: ChannelConfig["type"],
  identifier: string,
): Promise<void> {
  const channels = await getChannels(kv, userId);
  const filtered = channels.filter((existingChannel) => {
    if (existingChannel.type !== channelType) return true;
    if (existingChannel.type === "telegram")
      return existingChannel.chatId !== identifier;
    if (existingChannel.type === "discord")
      return existingChannel.webhookUrl !== identifier;
    return true;
  });

  if (filtered.length === 0) {
    await kv.delete(`${CHANNELS_PREFIX}${userId}`);
  } else {
    await kv.put(`${CHANNELS_PREFIX}${userId}`, JSON.stringify(filtered));
  }
}

export async function updateChannelEnabled(
  kv: KVNamespace,
  userId: string,
  channelType: ChannelConfig["type"],
  identifier: string,
  enabled: boolean,
): Promise<void> {
  const channels = await getChannels(kv, userId);
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
      existingChannel.webhookUrl === identifier
    ) {
      if (existingChannel.enabled === enabled) return existingChannel;
      changed = true;
      return { ...existingChannel, enabled };
    }
    return existingChannel;
  });
  if (!changed) return;
  await kv.put(`${CHANNELS_PREFIX}${userId}`, JSON.stringify(updated));
}

// ============================================
// Telegram account linking
// ============================================

const LINK_CODE_TTL = 10 * 60; // 10 minutes in seconds

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 6;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    // chars.length === 32, so bytes[i] & 31 yields a uniform index 0–31
    const index = bytes[i] & 31;
    code += chars.charAt(index);
  }
  return code;
}

export async function createTelegramLinkCode(
  kv: KVNamespace,
  userId: string,
): Promise<string> {
  const code = generateLinkCode();
  const request: TelegramLinkRequest = {
    userId,
    expiresAt: new Date(Date.now() + LINK_CODE_TTL * 1000).toISOString(),
  };
  await kv.put(`${LINK_PREFIX}${code}`, JSON.stringify(request), {
    expirationTtl: LINK_CODE_TTL,
  });
  return code;
}

export async function validateTelegramLinkCode(
  kv: KVNamespace,
  code: string,
): Promise<TelegramLinkRequest | null> {
  const data = await kv.get<TelegramLinkRequest>(
    `${LINK_PREFIX}${code}`,
    "json",
  );
  if (!data) return null;

  if (new Date(data.expiresAt) < new Date()) {
    await kv.delete(`${LINK_PREFIX}${code}`);
    return null;
  }
  return data;
}

export async function completeTelegramLink(
  kv: KVNamespace,
  code: string,
  chatId: string,
): Promise<{ userId: string; alreadyLinked?: boolean } | null> {
  const linkRequest = await validateTelegramLinkCode(kv, code);
  if (!linkRequest) return null;

  // Check if chatId is already linked to a different user
  const existingUserId = await getUserIdByTelegramChat(kv, chatId);
  if (existingUserId && existingUserId !== linkRequest.userId) {
    return { userId: existingUserId, alreadyLinked: true };
  }

  // Create telegram -> userId mapping
  await kv.put(`${TELEGRAM_PREFIX}${chatId}`, linkRequest.userId);

  // Add telegram channel to user's channels
  const telegramChannel: TelegramChannelConfig = {
    type: "telegram",
    chatId,
    enabled: true,
    addedAt: new Date().toISOString(),
  };
  await addChannel(kv, linkRequest.userId, telegramChannel);

  // Delete used link code
  await kv.delete(`${LINK_PREFIX}${code}`);

  return { userId: linkRequest.userId };
}

export async function getUserIdByTelegramChat(
  kv: KVNamespace,
  chatId: string,
): Promise<string | null> {
  return kv.get(`${TELEGRAM_PREFIX}${chatId}`);
}

export async function unlinkTelegramChat(
  kv: KVNamespace,
  chatId: string,
): Promise<void> {
  const userId = await getUserIdByTelegramChat(kv, chatId);
  if (userId) {
    await removeChannel(kv, userId, "telegram", chatId);
    await kv.delete(`${TELEGRAM_PREFIX}${chatId}`);
  }
}
