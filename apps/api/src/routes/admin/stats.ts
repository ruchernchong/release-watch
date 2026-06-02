import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import { getSystemStats } from "../../services/stats.service";

const app = new Hono<AuthEnv>().basePath("/stats").get("/", async (c) => {
  const stats = await getSystemStats();
  return c.json(stats);
});

export default app;
