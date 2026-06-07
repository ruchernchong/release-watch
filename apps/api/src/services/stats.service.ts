import { redis } from "@shipradar/redis";

const NOTIFICATIONS_SENT_KEY = "notifications:sent";
const RELEASES_NOTIFIED_KEY = "releases:notified";

export async function incrementNotificationsSent(amount = 1): Promise<number> {
  return redis.incrby(NOTIFICATIONS_SENT_KEY, amount);
}

export async function incrementReleasesNotified(amount = 1): Promise<number> {
  return redis.incrby(RELEASES_NOTIFIED_KEY, amount);
}
