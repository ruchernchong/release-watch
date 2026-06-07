import { Hono } from "hono";
import { requestId } from "hono/request-id";

// import { type AuthEnv, jwtAuth } from "./middleware/auth";
// import discord from "./routes/channels/discord";
// import telegram from "./routes/channels/telegram";
// import dashboard from "./routes/dashboard";
import health from "./routes/health";

// import internal from "./routes/internal";

// import repos from "./routes/repos";
// import stats from "./routes/stats";

// import webhook from "./routes/webhook";

// Authenticated API routes
// const api = new Hono<AuthEnv>()
//   .use("*", jwtAuth)
//   .route("/", dashboard)
//   .route("/", repos);
// .route("/", telegram);
// .route("/", discord);

const app = new Hono()
  .use("*", requestId())
  .route("/", health)
  .route("/health", health)
  // .route("/", stats)
  // .route("/", webhook)
  // .route("/internal", internal)
  // .route("/", api)
  .onError((error, c) => {
    return c.json({ error: error.message });
  });

export type AppType = typeof app;
export { app };
export default app;
