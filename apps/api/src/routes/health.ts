import { Hono } from "hono";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>().get("/", (c) => {
  return c.json({
    name: "ShipRadar",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;
