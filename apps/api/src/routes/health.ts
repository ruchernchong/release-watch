import { Hono } from "hono";

const app = new Hono().get("/", (c) => {
  return c.json({
    name: "ShipRadar",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;
