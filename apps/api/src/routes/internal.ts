import { Hono } from "hono";
import { runReleaseCheck } from "../workflows/release-check";

const app = new Hono()
  .basePath("/internal")
  .get("/release-check", async (c) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return c.json({ success: false }, 401);
    }

    const result = await runReleaseCheck({
      triggeredAt: new Date().toISOString(),
    });
    return c.json({ success: true, result });
  });

export default app;
