import type { DiscordClient } from "../discord-client.ts";

interface GetChannelMessagesParams {
  channel_id: string;
  limit?: number;
  before?: string;
}

interface MessageData {
  message_id: string;
  author: { id: string; username: string; bot: boolean };
  content: string;
  timestamp: string;
}

interface GetChannelMessagesResult {
  messages: MessageData[];
}

export function createGetChannelMessages(client: DiscordClient) {
  return async (
    params: GetChannelMessagesParams,
  ): Promise<GetChannelMessagesResult> => {
    if (!params.channel_id) {
      throw new Error("channel_id is required");
    }

    const limit = Math.min(params.limit ?? 10, 50);

    const result = await client.getChannelMessages({
      channel_id: params.channel_id,
      limit,
      before: params.before,
    });

    return result;
  };
}
