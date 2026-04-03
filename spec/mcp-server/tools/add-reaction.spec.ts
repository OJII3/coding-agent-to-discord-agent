import { describe, it, expect, mock } from "bun:test";

describe("add_reaction ツール", () => {
  const createMockDiscordClient = () => ({
    addReaction: mock(
      (params: {
        message_id: string;
        channel_id: string;
        emoji: string;
      }) => Promise.resolve(),
    ),
  });

  describe("正常系", () => {
    it("メッセージにリアクションを追加し、success: true を返す", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      const result = await addReaction({
        message_id: "msg-123",
        channel_id: "ch-456",
        emoji: "thumbsup",
      });

      expect(result.success).toBe(true);
    });

    it("Unicode 絵文字でリアクションを追加できる", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      const result = await addReaction({
        message_id: "msg-123",
        channel_id: "ch-456",
        emoji: "\u{1F44D}",
      });

      expect(result.success).toBe(true);
      expect(mockClient.addReaction).toHaveBeenCalledWith({
        message_id: "msg-123",
        channel_id: "ch-456",
        emoji: "\u{1F44D}",
      });
    });

    it("カスタム絵文字 ID でリアクションを追加できる", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      const result = await addReaction({
        message_id: "msg-123",
        channel_id: "ch-456",
        emoji: "custom_emoji:123456789",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("必須パラメータ", () => {
    it("message_id は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      await expect(
        addReaction({ message_id: "", channel_id: "ch-456", emoji: "thumbsup" }),
      ).rejects.toThrow();
    });

    it("channel_id は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      await expect(
        addReaction({
          message_id: "msg-123",
          channel_id: "",
          emoji: "thumbsup",
        }),
      ).rejects.toThrow();
    });

    it("emoji は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      await expect(
        addReaction({ message_id: "msg-123", channel_id: "ch-456", emoji: "" }),
      ).rejects.toThrow();
    });
  });

  describe("出力形式", () => {
    it("レスポンスに success が含まれる", async () => {
      const mockClient = createMockDiscordClient();
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      const result = await addReaction({
        message_id: "msg-123",
        channel_id: "ch-456",
        emoji: "thumbsup",
      });

      expect(result).toHaveProperty("success");
    });
  });

  describe("エラー時", () => {
    it("Discord API エラー時に適切にエラーを返す", async () => {
      const mockClient = {
        addReaction: mock(() =>
          Promise.reject(new Error("Discord API error")),
        ),
      };
      const { createAddReaction } = await import(
        "../../../src/mcp-server/tools/add-reaction.ts"
      );
      const addReaction = createAddReaction(mockClient as any);

      await expect(
        addReaction({
          message_id: "msg-123",
          channel_id: "ch-456",
          emoji: "thumbsup",
        }),
      ).rejects.toThrow();
    });
  });
});
