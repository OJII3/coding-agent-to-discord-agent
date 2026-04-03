import {
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
  type MessageReaction,
  type PartialMessage,
  type PartialMessageReaction,
  type User,
  type PartialUser,
  type TextChannel,
} from "discord.js";

export type EventType = "message_create" | "message_update" | "reaction_add";

export type EventData = {
  message_id: string;
  channel_id: string;
  guild_id: string;
  author: { id: string; username: string; bot: boolean };
  content: string;
  timestamp: string;
  emoji?: string;
};

type EventHandler = (data: EventData) => void;

const discordEventMap: Record<string, string> = {
  message_create: "messageCreate",
  message_update: "messageUpdate",
  reaction_add: "messageReactionAdd",
};

export interface DiscordClient {
  connect(token: string): Promise<void>;
  disconnect(): Promise<void>;
  getBotUserId(): string;
  onEvent(type: EventType, handler: EventHandler): void;
  offEvent(type: EventType): void;
  sendMessage(params: {
    channel_id: string;
    content: string;
    reply_to?: string;
  }): Promise<{ message_id: string }>;
  getChannelMessages(params: {
    channel_id: string;
    limit?: number;
    before?: string;
  }): Promise<{
    messages: Array<{
      message_id: string;
      author: { id: string; username: string; bot: boolean };
      content: string;
      timestamp: string;
    }>;
  }>;
  addReaction(params: {
    message_id: string;
    channel_id: string;
    emoji: string;
  }): Promise<void>;
}

export function createDiscordClient(): DiscordClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Reaction],
  });

  const handlers = new Map<string, EventHandler>();
  const registeredListeners = new Map<string, (...args: unknown[]) => void>();

  function messageToEventData(message: Message | PartialMessage): EventData {
    return {
      message_id: message.id,
      channel_id: message.channelId,
      guild_id: message.guildId ?? "",
      author: {
        id: message.author?.id ?? "",
        username: message.author?.username ?? "",
        bot: message.author?.bot ?? false,
      },
      content: message.content ?? "",
      timestamp: message.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  return {
    async connect(token: string) {
      await client.login(token);
    },

    async disconnect() {
      await client.destroy();
    },

    getBotUserId() {
      return client.user?.id ?? "";
    },

    onEvent(type: EventType, handler: EventHandler) {
      // Remove existing listener for this event type to prevent accumulation
      const discordEvent = discordEventMap[type];
      if (!discordEvent) return;

      const existingListener = registeredListeners.get(type);
      if (existingListener) {
        client.removeListener(discordEvent, existingListener);
      }

      handlers.set(type, handler);

      let listener: (...args: unknown[]) => void;

      if (type === "message_create" || type === "message_update") {
        listener = (message: unknown) => {
          const h = handlers.get(type);
          if (h) h(messageToEventData(message as Message | PartialMessage));
        };
      } else {
        listener = (
          reaction: unknown,
          user: unknown,
        ) => {
          const h = handlers.get(type);
          if (h) {
            const r = reaction as MessageReaction | PartialMessageReaction;
            const u = user as User | PartialUser;
            h({
              message_id: r.message.id,
              channel_id: r.message.channelId,
              guild_id: r.message.guildId ?? "",
              author: {
                id: u.id,
                username: (u as User).username ?? "",
                bot: u.bot ?? false,
              },
              content: "",
              timestamp: new Date().toISOString(),
              emoji: r.emoji.name ?? r.emoji.id ?? "",
            });
          }
        };
      }

      registeredListeners.set(type, listener);
      client.on(discordEvent, listener);
    },

    offEvent(type: EventType) {
      handlers.delete(type);
      const discordEvent = discordEventMap[type];
      if (discordEvent) {
        const listener = registeredListeners.get(type);
        if (listener) {
          client.removeListener(discordEvent, listener);
          registeredListeners.delete(type);
        }
      }
    },

    async sendMessage(params) {
      const channel = (await client.channels.fetch(
        params.channel_id,
      )) as TextChannel;
      const options: { content: string; reply?: { messageReference: string } } =
        { content: params.content };
      if (params.reply_to) {
        options.reply = { messageReference: params.reply_to };
      }
      const sent = await channel.send(options);
      return { message_id: sent.id };
    },

    async getChannelMessages(params) {
      const channel = (await client.channels.fetch(
        params.channel_id,
      )) as TextChannel;
      const options: { limit: number; before?: string } = {
        limit: params.limit ?? 10,
      };
      if (params.before) options.before = params.before;
      const messages = await channel.messages.fetch(options);
      return {
        messages: [...messages.values()].map((m) => ({
          message_id: m.id,
          author: {
            id: m.author.id,
            username: m.author.username,
            bot: m.author.bot,
          },
          content: m.content,
          timestamp: m.createdAt.toISOString(),
        })),
      };
    },

    async addReaction(params) {
      const channel = (await client.channels.fetch(
        params.channel_id,
      )) as TextChannel;
      const message = await channel.messages.fetch(params.message_id);
      await message.react(params.emoji);
    },
  };
}
