import { appConfigSchema, type AppConfig } from "./types.ts";

export function loadConfig(): AppConfig {
  return appConfigSchema.parse({
    discordBotToken: process.env.DISCORD_BOT_TOKEN,
    geminiApiKey: process.env.GEMINI_API_KEY,
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
  });
}

export type { AppConfig };
