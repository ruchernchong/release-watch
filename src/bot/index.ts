import { Bot } from "grammy";
import type { Env } from "../types/env";

export function createBot(env: Env): Bot {
  return new Bot(env.TELEGRAM_BOT_TOKEN);
}
