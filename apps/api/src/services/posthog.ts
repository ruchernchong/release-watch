import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHog(apiKey: string | undefined): PostHog | null {
  if (!apiKey) return null;

  if (!client) {
    client = new PostHog(apiKey, {
      host: "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export function captureEvent(
  posthog: PostHog | null,
  event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  },
) {
  if (!posthog) return;

  posthog.capture({
    distinctId: event.distinctId,
    event: event.event,
    properties: event.properties,
  });
}

export async function flushPostHog(posthog: PostHog | null): Promise<void> {
  if (!posthog) return;
  await posthog.flush();
}
