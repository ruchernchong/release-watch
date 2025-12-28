import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const userRepos = pgTable(
  "user_repos",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repoName: text().notNull(),
    lastNotifiedTag: text(),
    paused: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index().on(table.userId),
    uniqueIndex().on(table.userId, table.repoName),
  ],
);

export const userReposRelations = relations(userRepos, ({ one }) => ({
  user: one(users, {
    fields: [userRepos.userId],
    references: [users.id],
  }),
}));
