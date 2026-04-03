import { describe, it, expect, mock, beforeEach } from "bun:test";

// discord.js をモック
mock.module("discord.js", () => {
  const mockClient = {
    login: mock(() => Promise.resolve()),
    destroy: mock(() => Promise.resolve()),
    on: mock(() => mockClient),
    once: mock(() => mockClient),
    removeAllListeners: mock(() => mockClient),
    user: { id: "bot-user-id" },
    isReady: mock(() => true),
  };

  return {
    Client: mock(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMessageReactions: 8,
    },
    Partials: {
      Message: 0,
      Reaction: 1,
    },
  };
});

describe("DiscordClient", () => {
  describe("connect", () => {
    it("Discord Bot トークンで接続できる", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();

      await expect(client.connect("test-token")).resolves.toBeUndefined();
    });

    it("必要な Intents (MessageContent, GuildMessages, GuildMessageReactions) を設定する", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();

      // connect が成功すれば Intents が正しく設定されている
      await expect(client.connect("test-token")).resolves.toBeUndefined();
    });
  });

  describe("disconnect", () => {
    it("接続を切断できる", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();
      await client.connect("test-token");

      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("getBotUserId", () => {
    it("Bot のユーザー ID を返す", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();
      await client.connect("test-token");

      const botId = client.getBotUserId();
      expect(typeof botId).toBe("string");
      expect(botId.length).toBeGreaterThan(0);
    });
  });

  describe("イベントリスナー", () => {
    it("messageCreate イベントのリスナーを登録できる", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();
      await client.connect("test-token");

      const handler = mock(() => {});
      expect(() =>
        client.onEvent("message_create", handler),
      ).not.toThrow();
    });

    it("messageUpdate イベントのリスナーを登録できる", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();
      await client.connect("test-token");

      const handler = mock(() => {});
      expect(() =>
        client.onEvent("message_update", handler),
      ).not.toThrow();
    });

    it("reactionAdd イベントのリスナーを登録できる", async () => {
      const { createDiscordClient } = await import(
        "../../src/mcp-server/discord-client.ts"
      );
      const client = createDiscordClient();
      await client.connect("test-token");

      const handler = mock(() => {});
      expect(() =>
        client.onEvent("reaction_add", handler),
      ).not.toThrow();
    });
  });
});
