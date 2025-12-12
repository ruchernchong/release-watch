const CHAT_PREFIX = "chat:";
const NOTIFIED_PREFIX = "notified:";

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
