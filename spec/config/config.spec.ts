import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("DISCORD_BOT_TOKEN と GEMINI_API_KEY が設定されている場合、設定オブジェクトを返す", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-discord-token";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const { loadConfig } = await import("../../src/config/index.ts");
      const config = loadConfig();

      expect(config.discordBotToken).toBe("test-discord-token");
      expect(config.geminiApiKey).toBe("test-gemini-key");
    });

    it("DISCORD_CHANNEL_ID が設定されている場合、設定に含まれる", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-discord-token";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.DISCORD_CHANNEL_ID = "123456789";

      const { loadConfig } = await import("../../src/config/index.ts");
      const config = loadConfig();

      expect(config.discordChannelId).toBe("123456789");
    });

    it("DISCORD_CHANNEL_ID が未設定の場合、undefined になる", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-discord-token";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      delete process.env.DISCORD_CHANNEL_ID;

      const { loadConfig } = await import("../../src/config/index.ts");
      const config = loadConfig();

      expect(config.discordChannelId).toBeUndefined();
    });

    it("DISCORD_BOT_TOKEN が未設定の場合、エラーを投げる", async () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const { loadConfig } = await import("../../src/config/index.ts");

      expect(() => loadConfig()).toThrow();
    });

    it("GEMINI_API_KEY が未設定の場合、エラーを投げる", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-discord-token";
      delete process.env.GEMINI_API_KEY;

      const { loadConfig } = await import("../../src/config/index.ts");

      expect(() => loadConfig()).toThrow();
    });
  });
});
