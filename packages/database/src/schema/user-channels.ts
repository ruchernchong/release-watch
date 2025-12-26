import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { users } from "./auth";

// Channel type enum
export const channelTypeSchema = z.enum(["telegram", "discord"]);
export type ChannelType = z.infer<typeof channelTypeSchema>;

// Config schemas per channel type
export const telegramConfigSchema = z.object({
  chatId: z.string().min(1),
});
export type TelegramChannelConfig = z.infer<typeof telegramConfigSchema>;

export const discordConfigSchema = z.object({
  webhookUrl: z.url(),
});
export type DiscordChannelConfig = z.infer<typeof discordConfigSchema>;

// Discriminated union for config validation
export const channelConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("telegram"), config: telegramConfigSchema }),
  z.object({ type: z.literal("discord"), config: discordConfigSchema }),
]);

export type ChannelConfigType = TelegramChannelConfig | DiscordChannelConfig;

export const userChannels = pgTable(
  "user_channels",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    config: jsonb().$type<ChannelConfigType>().notNull(),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index().on(table.userId)],
);

export const userChannelsRelations = relations(userChannels, ({ one }) => ({
  user: one(users, {
    fields: [userChannels.userId],
    references: [users.id],
  }),
}));
