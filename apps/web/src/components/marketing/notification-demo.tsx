"use client";

import { Avatar, Card, Chip } from "@heroui/react";
import { Bell, Github, MessageCircle, Webhook } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const releases = [
  {
    repo: "vercel/next.js",
    version: "v15.4.0",
    summary: "Turbopack builds are now stable with faster cold starts.",
    channel: "Telegram",
    icon: MessageCircle,
  },
  {
    repo: "facebook/react",
    version: "v19.1.0",
    summary: "Adds the Activity API and clearer hydration error messages.",
    channel: "Discord",
    icon: Bell,
  },
  {
    repo: "honojs/hono",
    version: "v4.6.0",
    summary: "Introduces RPC streaming and improved Bun runtime support.",
    channel: "Webhook",
    icon: Webhook,
  },
  {
    repo: "drizzle-team/drizzle-orm",
    version: "v0.36.0",
    summary: "Relational queries v2 land alongside a new caching layer.",
    channel: "Telegram",
    icon: MessageCircle,
  },
];

const VISIBLE_COUNT = 3;

type FeedItem = (typeof releases)[number] & { id: number };

function initialFeed(): FeedItem[] {
  return releases.slice(0, VISIBLE_COUNT).map((release, index) => ({
    ...release,
    id: index,
  }));
}

export function NotificationDemo() {
  const shouldReduceMotion = useReducedMotion();
  const [items, setItems] = useState<FeedItem[]>(initialFeed);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    let cursor = VISIBLE_COUNT;
    const interval = setInterval(() => {
      setItems((previousItems) => {
        const nextRelease = releases[cursor % releases.length];
        const nextItem: FeedItem = { ...nextRelease, id: cursor };
        cursor += 1;
        return [nextItem, ...previousItems].slice(0, VISIBLE_COUNT);
      });
    }, 2600);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  return (
    <Card variant="secondary" className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>Live release feed</Card.Title>
        <Card.Description>
          AI summaries delivered the moment a repo ships.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex gap-3"
            >
              <Avatar className="size-9 shrink-0">
                <Avatar.Fallback>
                  <Github className="size-4" />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground text-sm">
                    {item.repo}
                  </span>
                  <Chip color="success" variant="soft" size="sm">
                    {item.version}
                  </Chip>
                </div>
                <p className="text-muted text-xs">{item.summary}</p>
                <Chip
                  color="accent"
                  variant="soft"
                  size="sm"
                  className="mt-1 w-fit"
                >
                  <item.icon className="size-3" />
                  <Chip.Label>{item.channel}</Chip.Label>
                </Chip>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </Card.Content>
    </Card>
  );
}
