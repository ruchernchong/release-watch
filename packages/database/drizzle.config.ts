import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  casing: "snake_case",
});
