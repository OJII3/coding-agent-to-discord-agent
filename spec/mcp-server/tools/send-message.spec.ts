import { describe, it, expect, mock } from "bun:test";

describe("send_message ツール", () => {
  const createMockDiscordClient = () => ({
    sendMessage: mock(
      (params: { channel_id: string; content: string; reply_to?: string }) =>
        Promise.resolve({ message_id: "sent-msg-123" }),
    ),
  });

  describe("正常系", () => {
    it("チャンネルにメッセージを送信し、success: true と message_id を返す", async () => {
      const mockClient = createMockDiscordClient();
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      const result = await sendMessage({
        channel_id: "ch-456",
        content: "Hello, Discord!",
      });

      expect(result.success).toBe(true);
      expect(result.message_id).toBe("sent-msg-123");
    });

    it("reply_to を指定した場合、リプライとして送信される", async () => {
      const mockClient = createMockDiscordClient();
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      const result = await sendMessage({
        channel_id: "ch-456",
        content: "Reply message",
        reply_to: "original-msg-789",
      });

      expect(result.success).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        channel_id: "ch-456",
        content: "Reply message",
        reply_to: "original-msg-789",
      });
    });
  });

  describe("必須パラメータ", () => {
    it("channel_id は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      await expect(
        sendMessage({ channel_id: "", content: "test" }),
      ).rejects.toThrow();
    });

    it("content は必須", async () => {
      const mockClient = createMockDiscordClient();
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      await expect(
        sendMessage({ channel_id: "ch-456", content: "" }),
      ).rejects.toThrow();
    });
  });

  describe("出力形式", () => {
    it("レスポンスに success と message_id が含まれる", async () => {
      const mockClient = createMockDiscordClient();
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      const result = await sendMessage({
        channel_id: "ch-456",
        content: "test",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message_id");
    });
  });

  describe("エラー時", () => {
    it("Discord API エラー時に適切にエラーを返す", async () => {
      const mockClient = {
        sendMessage: mock(() =>
          Promise.reject(new Error("Discord API error")),
        ),
      };
      const { createSendMessage } = await import(
        "../../../src/mcp-server/tools/send-message.ts"
      );
      const sendMessage = createSendMessage(mockClient as any);

      await expect(
        sendMessage({ channel_id: "ch-456", content: "test" }),
      ).rejects.toThrow();
    });
  });
});
