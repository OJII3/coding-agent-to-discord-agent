import { loadConfig } from "../config/index.ts";
import { createConfigGenerator } from "./config-generator.ts";
import { createProcessManager } from "./process-manager.ts";

const config = loadConfig();

const configGenerator = createConfigGenerator({ outputDir: process.cwd() });

await configGenerator.generateAll({
  mcpServerCommand: "bun",
  mcpServerArgs: ["run", "src/mcp-server/index.ts"],
});

const processManager = createProcessManager({
  spawn: (cmd: string[]) => {
    const [command, ...args] = cmd;
    const proc = Bun.spawn([command!, ...args], {
      env: {
        ...process.env,
        DISCORD_BOT_TOKEN: config.discordBotToken,
        GEMINI_API_KEY: config.geminiApiKey,
        ...(config.discordChannelId
          ? { DISCORD_CHANNEL_ID: config.discordChannelId }
          : {}),
      },
      stdout: "inherit",
      stderr: "inherit",
    });
    return {
      pid: proc.pid,
      exitCode: proc.exitCode,
      exited: proc.exited,
      kill: (signal?: number) => proc.kill(signal),
    };
  },
  autoRestart: true,
});

processManager.onExit((code) => {
  console.log(`gemini-cli exited with code ${code}`);
});

await processManager.start({
  command: "gemini",
  args: ["-p", "Discord Bot として動作を開始してください。wait_until_event を呼び出してイベントを待ってください。", "--yolo"],
});

const shutdown = () => {
  processManager.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
