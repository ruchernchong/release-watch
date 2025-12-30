import { Hono } from "hono";
import { getSystemStats } from "../services/stats.service";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>()
  .basePath("/stats")
  .get("/", async (c) => {
    const stats = await getSystemStats(c.env);
    return c.json(stats);
  });

export default app;
