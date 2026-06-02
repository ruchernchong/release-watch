import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AuthEnv, adminOnly, jwtAuth } from "./middleware/auth";
import adminActivity from "./routes/admin/activity";
import adminStats from "./routes/admin/stats";
import adminUsers from "./routes/admin/users";
import discord from "./routes/channels/discord";
import telegram from "./routes/channels/telegram";
import dashboard from "./routes/dashboard";
import health from "./routes/health";
import internal from "./routes/internal";
import repos from "./routes/repos";
import stats from "./routes/stats";
import webhook from "./routes/webhook";

const app = new Hono();

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8787",
  "https://shipradar.dev",
  "https://www.shipradar.dev",
];

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      if (origin.endsWith(".vercel.app")) return origin;
      return null;
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
app.route("/", internal);

// Authenticated API routes
const api = new Hono<AuthEnv>()
  .use("*", jwtAuth)
  .route("/", dashboard)
  .route("/", repos)
  .route("/", telegram)
  .route("/", discord);

// Admin routes
const admin = new Hono<AuthEnv>()
  .basePath("/admin")
  .use("*", jwtAuth)
  .use("*", adminOnly)
  .route("/", adminUsers)
  .route("/", adminActivity)
  .route("/", adminStats);

export const routes = app.route("/", api).route("/", admin);

serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});

export default app;
