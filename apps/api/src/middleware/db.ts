import { createMiddleware } from "hono/factory";
import { db } from "../db";
import type { AuthEnv } from "./auth";

export const dbMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  c.set("db", db(c.env.HYPERDRIVE));
  await next();
});
