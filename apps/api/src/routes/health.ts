import { Hono } from "hono";

const app = new Hono().get("/", (c) => {
  return c.json({ status: "ok" });
});

export default app;
