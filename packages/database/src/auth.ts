import { passkey } from "@better-auth/passkey";
import {
  checkout,
  polar,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
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

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: process.env.POLAR_SERVER as "production" | "sandbox",
});

export const auth = betterAuth({
  appName: "Release Watch",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord", "github", "google"],
    },
  },
  plugins: [
    admin(),
    lastLoginMethod(),
    oAuthProxy(),
    passkey(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRODUCT_ID_PRO_MONTHLY as string,
              slug: "pro-monthly",
            },
            {
              productId: process.env.POLAR_PRODUCT_ID_PRO_ANNUAL as string,
              slug: "pro-annual",
            },
          ],
          successUrl: "/dashboard/settings?checkout=success",
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET as string,
          // onCustomerStateChanged: (payload) => {
          //   console.log(payload);
          //   return payload;
          // },
          // onOrderPaid: (payload) => {
          //   console.log(payload);
          //   return payload;
          // },
          // onPayload: (payload) => {
          //   console.log(payload);
          //   return payload;
          // },
        }),
      ],
    }),
    twoFactor(),
    jwt(),
    nextCookies(), // This must always be the last in the array
  ],
  socialProviders: {
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
