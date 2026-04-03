import type { DiscordClient } from "../discord-client.ts";

interface AddReactionParams {
  message_id: string;
  channel_id: string;
  emoji: string;
}

interface AddReactionResult {
  success: boolean;
}

export function createAddReaction(client: DiscordClient) {
  return async (params: AddReactionParams): Promise<AddReactionResult> => {
    if (!params.message_id) {
      throw new Error("message_id is required");
    }
    if (!params.channel_id) {
      throw new Error("channel_id is required");
    }
    if (!params.emoji) {
      throw new Error("emoji is required");
    }

    await client.addReaction({
      message_id: params.message_id,
      channel_id: params.channel_id,
      emoji: params.emoji,
    });

    return { success: true };
  };
}
