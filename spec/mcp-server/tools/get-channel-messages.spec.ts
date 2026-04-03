import { describe, it, expect, mock } from "bun:test";

describe("get_channel_messages ツール", () => {
  const createMockDiscordClient = () => ({
    getChannelMessages: mock(
      (params: { channel_id: string; limit?: number; before?: string }) =>
        Promise.resolve({
          messages: [
            {
              message_id: "msg-1",
              author: { id: "user-1", username: "user1", bot: false },
              content: "Message 1",
              timestamp: "2025-01-01T00:00:00.000Z",
            },
            {
              message_id: "msg-2",
              author: { id: "user-2", username: "user2", bot: false },
              content: "Message 2",
              timestamp: "2025-01-01T00:01:00.000Z",
            },
          ],
        }),
    ),
  });

  describe("正常系", () => {
    it("チャンネルのメッセージ履歴を取得できる", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      const result = await getChannelMessages({
        channel_id: "ch-456",
      });

      expect(result.messages).toBeArray();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("各メッセージに message_id, author, content, timestamp が含まれる", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      const result = await getChannelMessages({
        channel_id: "ch-456",
      });

      const message = result.messages[0];
      expect(message).toHaveProperty("message_id");
      expect(message).toHaveProperty("author");
      expect(message.author).toHaveProperty("id");
      expect(message.author).toHaveProperty("username");
      expect(message.author).toHaveProperty("bot");
      expect(message).toHaveProperty("content");
      expect(message).toHaveProperty("timestamp");
    });
  });

  describe("limit パラメータ", () => {
    it("limit を指定した場合、その件数分取得する", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      await getChannelMessages({
        channel_id: "ch-456",
        limit: 5,
      });

      expect(mockClient.getChannelMessages).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
      );
    });

    it("limit を省略した場合、デフォルト 10 件を取得する", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      await getChannelMessages({
        channel_id: "ch-456",
      });

      expect(mockClient.getChannelMessages).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });

    it("limit が 50 を超える場合、50 に制限される", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      await getChannelMessages({
        channel_id: "ch-456",
        limit: 100,
      });

      expect(mockClient.getChannelMessages).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  describe("before パラメータ", () => {
    it("before を指定した場合、そのメッセージ ID より前のメッセージを取得する", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      await getChannelMessages({
        channel_id: "ch-456",
        before: "msg-100",
      });

      expect(mockClient.getChannelMessages).toHaveBeenCalledWith(
        expect.objectContaining({ before: "msg-100" }),
      );
    });
  });

  describe("必須パラメータ", () => {
    it("channel_id は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createGetChannelMessages } = await import(
        "../../../src/mcp-server/tools/get-channel-messages.ts"
      );
      const getChannelMessages = createGetChannelMessages(mockClient as any);

      await expect(
        getChannelMessages({ channel_id: "" }),
      ).rejects.toThrow();
    });
  });
});
