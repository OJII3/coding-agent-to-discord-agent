import { z } from "zod";

export const appConfigSchema = z.object({
  discordBotToken: z.string().min(1),
  geminiApiKey: z.string().min(1),
  discordChannelId: z.string().optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
