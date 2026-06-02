import { Hono } from "hono";
import { requestId } from "hono/request-id";

// import { type AuthEnv, adminOnly, jwtAuth } from "./middleware/auth";
// import adminActivity from "./routes/admin/activity";
// import adminStats from "./routes/admin/stats";
// import adminUsers from "./routes/admin/users";
// import discord from "./routes/channels/discord";
// import telegram from "./routes/channels/telegram";
// import dashboard from "./routes/dashboard";
import health from "./routes/health";
import internal from "./routes/internal";

// import repos from "./routes/repos";
// import stats from "./routes/stats";
// import webhook from "./routes/webhook";

const app = new Hono()
  .use("*", requestId())
  .route("/health", health)
  // .route("/", stats)
  // .route("/", webhook)
  .route("/internal", internal)
  .onError((error, c) => {
    return c.json({ error: error.message });
  });

// Authenticated API routes
// const api = new Hono<AuthEnv>()
//   .use("*", jwtAuth)
//   .route("/", dashboard)
//   .route("/", repos)
//   .route("/", telegram)
//   .route("/", discord);

// Admin routes
// const admin = new Hono<AuthEnv>()
//   .basePath("/admin")
//   .use("*", jwtAuth)
//   .use("*", adminOnly)
//   .route("/", adminUsers)
//   .route("/", adminActivity)
//   .route("/", adminStats);

// .route("/", admin);

export type AppType = typeof app;
export { app };
export default app;
