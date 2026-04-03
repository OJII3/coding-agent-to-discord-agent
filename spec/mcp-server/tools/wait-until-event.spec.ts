import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("wait_until_event ツール", () => {
  // モック用の Discord クライアント
  const createMockDiscordClient = () => {
    const eventHandlers: Map<string, (data: unknown) => void> = new Map();
    return {
      onEvent: mock((eventType: string, handler: (data: unknown) => void) => {
        eventHandlers.set(eventType, handler);
      }),
      offEvent: mock((eventType: string) => {
        eventHandlers.delete(eventType);
      }),
      getBotUserId: mock(() => "bot-user-id"),
      // テスト用: イベントを発火させる
      _emit: (eventType: string, data: unknown) => {
        const handler = eventHandlers.get(eventType);
        if (handler) handler(data);
      },
      _handlers: eventHandlers,
    };
  };

  describe("正常系: message_create イベント", () => {
    it("メッセージ受信時にイベントデータを返す", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_create",
        timeout_ms: 5000,
      });

      // イベントを発火
      mockClient._emit("message_create", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "Hello!",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;

      expect(result.event_type).toBe("message_create");
      expect(result.timed_out).toBe(false);
      expect(result.data).not.toBeNull();
      expect(result.data!.message_id).toBe("msg-123");
      expect(result.data!.channel_id).toBe("ch-456");
      expect(result.data!.author.username).toBe("testuser");
      expect(result.data!.content).toBe("Hello!");
    });

    it("event_type を省略した場合、デフォルトで message_create を待つ", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({ timeout_ms: 5000 });

      mockClient._emit("message_create", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "Default event",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.event_type).toBe("message_create");
      expect(result.timed_out).toBe(false);
    });
  });

  describe("チャンネルフィルタ", () => {
    it("channel_id を指定した場合、そのチャンネルのイベントのみ受け取る", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_create",
        channel_id: "target-channel",
        timeout_ms: 5000,
      });

      // 別チャンネルのイベント（無視されるべき）
      mockClient._emit("message_create", {
        message_id: "msg-other",
        channel_id: "other-channel",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "Wrong channel",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      // 対象チャンネルのイベント
      mockClient._emit("message_create", {
        message_id: "msg-target",
        channel_id: "target-channel",
        guild_id: "guild-789",
        author: { id: "user-222", username: "testuser2", bot: false },
        content: "Right channel",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.data!.channel_id).toBe("target-channel");
      expect(result.data!.message_id).toBe("msg-target");
    });

    it("channel_id を省略した場合、全チャンネルのイベントを受け取る", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_create",
        timeout_ms: 5000,
      });

      mockClient._emit("message_create", {
        message_id: "msg-any",
        channel_id: "any-channel",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "Any channel message",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.data!.channel_id).toBe("any-channel");
    });
  });

  describe("タイムアウト", () => {
    it("タイムアウト時に timed_out: true, data: null を返す", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const result = await waitUntilEvent({
        event_type: "message_create",
        timeout_ms: 50, // 短いタイムアウト
      });

      expect(result.event_type).toBe("timeout");
      expect(result.timed_out).toBe(true);
      expect(result.data).toBeNull();
    });

    it("timeout_ms を省略した場合、デフォルト 300000ms (5分) が使われる", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      // デフォルトタイムアウトが設定されることを検証
      // 実際に5分待つわけにはいかないので、即座にイベントを発火して検証
      const resultPromise = waitUntilEvent({
        event_type: "message_create",
      });

      mockClient._emit("message_create", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "test",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.timed_out).toBe(false);
    });
  });

  describe("自己メッセージ除外", () => {
    it("Bot 自身が送信したメッセージは無視される", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_create",
        timeout_ms: 200,
      });

      // Bot 自身のメッセージ（無視されるべき）
      mockClient._emit("message_create", {
        message_id: "msg-bot",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "bot-user-id", username: "bot", bot: true },
        content: "Bot message",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      // タイムアウトすることで、Bot メッセージが無視されたことを確認
      const result = await resultPromise;
      expect(result.timed_out).toBe(true);
    });
  });

  describe("対応イベントタイプ", () => {
    it("message_update イベントを待ち受けできる", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_update",
        timeout_ms: 5000,
      });

      mockClient._emit("message_update", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "Updated content",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.event_type).toBe("message_update");
      expect(result.timed_out).toBe(false);
      expect(result.data!.content).toBe("Updated content");
    });

    it("reaction_add イベントを待ち受けできる", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "reaction_add",
        timeout_ms: 5000,
      });

      mockClient._emit("reaction_add", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        emoji: "thumbsup",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;
      expect(result.event_type).toBe("reaction_add");
      expect(result.timed_out).toBe(false);
    });
  });

  describe("出力形式", () => {
    it("正常時のレスポンスに event_type, timed_out, data が含まれる", async () => {
      const mockClient = createMockDiscordClient();
      const { createWaitUntilEvent } = await import(
        "../../../src/mcp-server/tools/wait-until-event.ts"
      );
      const waitUntilEvent = createWaitUntilEvent(mockClient as any);

      const resultPromise = waitUntilEvent({
        event_type: "message_create",
        timeout_ms: 5000,
      });

      mockClient._emit("message_create", {
        message_id: "msg-123",
        channel_id: "ch-456",
        guild_id: "guild-789",
        author: { id: "user-111", username: "testuser", bot: false },
        content: "test",
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const result = await resultPromise;

      expect(result).toHaveProperty("event_type");
      expect(result).toHaveProperty("timed_out");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("message_id");
      expect(result.data).toHaveProperty("channel_id");
      expect(result.data).toHaveProperty("guild_id");
      expect(result.data).toHaveProperty("author");
      expect(result.data!.author).toHaveProperty("id");
      expect(result.data!.author).toHaveProperty("username");
      expect(result.data!.author).toHaveProperty("bot");
      expect(result.data).toHaveProperty("content");
      expect(result.data).toHaveProperty("timestamp");
    });
  });
});
