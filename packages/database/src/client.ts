import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL as string);

export const db = drizzle({
  client: sql,
  schema,
  casing: "snake_case",
});
