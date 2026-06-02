import { Hono } from "hono";
import { getSystemStats } from "../services/stats.service";

const app = new Hono().basePath("/stats").get("/", async (c) => {
  const stats = await getSystemStats();
  return c.json(stats);
});

export default app;
