import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AuthEnv, adminOnly, jwtAuth } from "./middleware/auth";
import { dbMiddleware } from "./middleware/db";
import adminActivity from "./routes/admin/activity";
import adminStats from "./routes/admin/stats";
import adminUsers from "./routes/admin/users";
import discord from "./routes/channels/discord";
import telegram from "./routes/channels/telegram";
import dashboard from "./routes/dashboard";
import health from "./routes/health";
import repos from "./routes/repos";
import stats from "./routes/stats";
import webhook from "./routes/webhook";
import type { Env } from "./types/env";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8787",
  "https://releasewatch.dev",
  "https://www.releasewatch.dev",
];

export const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      return ALLOWED_ORIGINS.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    maxAge: 86400,
  }),
);

// Public routes (no auth)
app.route("/", health);
app.route("/", stats);
app.route("/", webhook);

// Authenticated API routes
const api = new Hono<AuthEnv>()
  .use("*", jwtAuth)
  .use("*", dbMiddleware)
  .route("/", dashboard)
  .route("/", repos)
  .route("/", telegram)
  .route("/", discord);

// Admin routes
const admin = new Hono<AuthEnv>()
  .basePath("/admin")
  .use("*", jwtAuth)
  .use("*", adminOnly)
  .use("*", dbMiddleware)
  .route("/", adminUsers)
  .route("/", adminActivity)
  .route("/", adminStats);

export const routes = app.route("/", api).route("/", admin);

export type AppType = typeof routes;
