import {
  userChannels,
  userChannelsRelations,
  userRepos,
  userReposRelations,
} from "@release-watch/database";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const schema = {
  userRepos,
  userReposRelations,
  userChannels,
  userChannelsRelations,
};

export function db(hyperdrive: Hyperdrive) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 5,
    fetch_types: false,
  });

  return drizzle(sql, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof db>;
