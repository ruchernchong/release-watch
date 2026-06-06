import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  jwt,
  lastLoginMethod,
  oAuthProxy,
  twoFactor,
} from "better-auth/plugins";
import { db } from "./client";
import * as schema from "./schema";

export const auth = betterAuth({
  appName: "Release Watch",
  baseURL: {
    allowedHosts: [
      "shipradar.dev",
      "www.shipradar.dev",
      "*.vercel.app",
      "shipradar.localhost",
      "*.shipradar.localhost",
    ],
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  trustedOrigins: ["https://shipradar-web-*.vercel.app"],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord", "github", "google"],
    },
  },
  plugins: [
    admin(),
    lastLoginMethod(),
    oAuthProxy({ productionURL: "https://shipradar.dev" }),
    passkey(),
    twoFactor(),
    jwt(),
    nextCookies(), // This must always be the last in the array
  ],
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      scope: ["identify", "guilds"],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});
