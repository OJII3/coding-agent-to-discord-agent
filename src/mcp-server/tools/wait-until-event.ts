import type { DiscordClient, EventType, EventData } from "../discord-client.ts";

interface WaitUntilEventParams {
  event_type?: EventType;
  channel_id?: string;
  timeout_ms?: number;
}

interface WaitUntilEventResult {
  event_type: string;
  timed_out: boolean;
  data: EventData | null;
}

export function createWaitUntilEvent(client: DiscordClient) {
  return (params: WaitUntilEventParams): Promise<WaitUntilEventResult> => {
    const eventType = params.event_type ?? "message_create";
    const timeoutMs = params.timeout_ms ?? 300000;
    const channelId = params.channel_id;
    const botUserId = client.getBotUserId();

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        clearTimeout(timer);
        client.offEvent(eventType);
      };

      client.onEvent(eventType, (data: EventData) => {
        // Skip bot's own messages
        if (data.author.id === botUserId) return;

        // Filter by channel if specified
        if (channelId && data.channel_id !== channelId) return;

        cleanup();
        resolve({
          event_type: eventType,
          timed_out: false,
          data,
        });
      });

      timer = setTimeout(() => {
        cleanup();
        resolve({
          event_type: "timeout",
          timed_out: true,
          data: null,
        });
      }, timeoutMs);
    });
  };
}
