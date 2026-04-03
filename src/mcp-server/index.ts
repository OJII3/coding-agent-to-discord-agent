import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "../config/index.ts";
import { createDiscordClient } from "./discord-client.ts";
import { createWaitUntilEvent } from "./tools/wait-until-event.ts";
import { createSendMessage } from "./tools/send-message.ts";
import { createGetChannelMessages } from "./tools/get-channel-messages.ts";
import { createAddReaction } from "./tools/add-reaction.ts";

const config = loadConfig();
const discordClient = createDiscordClient();

const server = new McpServer({
  name: "discord-agent-mcp-server",
  version: "0.1.0",
});

const waitUntilEvent = createWaitUntilEvent(discordClient);
const sendMessage = createSendMessage(discordClient);
const getChannelMessages = createGetChannelMessages(discordClient);
const addReaction = createAddReaction(discordClient);

server.tool(
  "wait_until_event",
  "Wait for a Discord event (message, reaction, etc.)",
  {
    event_type: z
      .enum(["message_create", "message_update", "reaction_add"])
      .optional(),
    channel_id: z.string().optional(),
    timeout_ms: z.number().optional(),
  },
  async (params) => {
    const result = await waitUntilEvent(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);

server.tool(
  "send_message",
  "Send a message to a Discord channel",
  {
    channel_id: z.string(),
    content: z.string(),
    reply_to: z.string().optional(),
  },
  async (params) => {
    const result = await sendMessage(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);

server.tool(
  "get_channel_messages",
  "Get recent messages from a Discord channel",
  {
    channel_id: z.string(),
    limit: z.number().optional(),
    before: z.string().optional(),
  },
  async (params) => {
    const result = await getChannelMessages(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);

server.tool(
  "add_reaction",
  "Add a reaction to a Discord message",
  {
    message_id: z.string(),
    channel_id: z.string(),
    emoji: z.string(),
  },
  async (params) => {
    const result = await addReaction(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);

async function main() {
  await discordClient.connect(config.discordBotToken);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await discordClient.disconnect();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});
