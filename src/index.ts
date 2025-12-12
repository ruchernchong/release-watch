import { Hono } from "hono";
import type { Env } from "./types/env";
import { handleSchedule } from "./handlers/schedule";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({
    name: "release-watch",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
