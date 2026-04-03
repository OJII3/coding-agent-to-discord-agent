import type { DiscordClient } from "../discord-client.ts";

interface SendMessageParams {
  channel_id: string;
  content: string;
  reply_to?: string;
}

interface SendMessageResult {
  success: boolean;
  message_id: string;
}

export function createSendMessage(client: DiscordClient) {
  return async (params: SendMessageParams): Promise<SendMessageResult> => {
    if (!params.channel_id) {
      throw new Error("channel_id is required");
    }
    if (!params.content) {
      throw new Error("content is required");
    }

    const result = await client.sendMessage({
      channel_id: params.channel_id,
      content: params.content,
      reply_to: params.reply_to,
    });

    return {
      success: true,
      message_id: result.message_id,
    };
  };
}
