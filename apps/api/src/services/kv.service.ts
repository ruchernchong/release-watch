import type {
  ChannelConfig,
  TelegramChannelConfig,
  TelegramLinkRequest,
} from "@release-watch/types";
import type { AIAnalysisResult } from "./ai.service";

const CHAT_PREFIX = "chat:";
const NOTIFIED_PREFIX = "notified:";
const RELEASE_PREFIX = "release:";
const CHANNELS_PREFIX = "channels:";
const TELEGRAM_PREFIX = "telegram:";
const LINK_PREFIX = "link:";

export async function getSubscriptions(
  kv: KVNamespace,
  chatId: string,
): Promise<string[]> {
  const data = await kv.get<string[]>(`${CHAT_PREFIX}${chatId}`, "json");
  return data ?? [];
}

export async function addSubscription(
  kv: KVNamespace,
  chatId: string,
  repo: string,
): Promise<void> {
  const subscriptions = await getSubscriptions(kv, chatId);
  if (!subscriptions.includes(repo)) {
    subscriptions.push(repo);
    await kv.put(`${CHAT_PREFIX}${chatId}`, JSON.stringify(subscriptions));
  }
}

export async function removeSubscription(
  kv: KVNamespace,
  chatId: string,
  repo: string,
): Promise<void> {
  const subscriptions = await getSubscriptions(kv, chatId);
  const filtered = subscriptions.filter((r) => r !== repo);
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

export async function getAllSubscriptions(
  kv: KVNamespace,
): Promise<Map<string, string[]>> {
  const subscriptions = new Map<string, string[]>();
  const chatIds = await getAllChatIds(kv);

  for (const chatId of chatIds) {
    const repos = await getSubscriptions(kv, chatId);
    subscriptions.set(chatId, repos);
  }

  return subscriptions;
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

  const isDuplicate = channels.some((c) => {
    if (c.type === "telegram" && channel.type === "telegram") {
      return c.chatId === channel.chatId;
    }
    if (c.type === "discord" && channel.type === "discord") {
      return c.webhookUrl === channel.webhookUrl;
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
  const filtered = channels.filter((c) => {
    if (c.type !== channelType) return true;
    if (c.type === "telegram") return c.chatId !== identifier;
    if (c.type === "discord") return c.webhookUrl !== identifier;
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
  const updated = channels.map((c) => {
    if (c.type !== channelType) return c;
    if (c.type === "telegram" && c.chatId === identifier) {
      return { ...c, enabled };
    }
    if (c.type === "discord" && c.webhookUrl === identifier) {
      return { ...c, enabled };
    }
    return c;
  });
  await kv.put(`${CHANNELS_PREFIX}${userId}`, JSON.stringify(updated));
}

// ============================================
// Telegram account linking
// ============================================

const LINK_CODE_TTL = 10 * 60; // 10 minutes in seconds

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
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
): Promise<{ userId: string } | null> {
  const linkRequest = await validateTelegramLinkCode(kv, code);
  if (!linkRequest) return null;

  // Create telegram -> userId mapping
  await kv.put(`${TELEGRAM_PREFIX}${chatId}`, linkRequest.userId);

  // Add telegram channel to user's channels
  const telegramChannel: TelegramChannelConfig = {
    type: "telegram",
    chatId,
    enabled: true,
    linkedAt: new Date().toISOString(),
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
