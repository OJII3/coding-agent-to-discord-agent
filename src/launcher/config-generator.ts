import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface ConfigGeneratorOptions {
  outputDir: string;
}

interface McpSettingsOptions {
  mcpServerCommand: string;
  mcpServerArgs: string[];
}

export function createConfigGenerator({ outputDir }: ConfigGeneratorOptions) {
  return {
    async generateMcpSettings(opts: McpSettingsOptions) {
      const geminiDir = join(outputDir, ".gemini");
      await mkdir(geminiDir, { recursive: true });

      const settings = {
        mcpServers: {
          "discord-agent": {
            command: opts.mcpServerCommand,
            args: opts.mcpServerArgs,
          },
        },
      };

      await writeFile(
        join(geminiDir, "settings.json"),
        JSON.stringify(settings, null, 2),
      );
    },

    async generateSystemPrompt() {
      const prompt = `# Discord Bot Agent

あなたは Discord Bot として動作するエージェントです。
MCP ツールを使って Discord のメッセージを読み書きします。

## 基本動作ループ

1. \`wait_until_event\` を呼び出して Discord のイベント（メッセージなど）を待ちます
2. イベントを受信したら、内容に応じて適切に応答します
3. \`send_message\` でメッセージを送信します
4. 1に戻ります

## 重要なルール

- Bot 自身が送信したメッセージには反応しないでください（wait_until_event が自動的にフィルタします）
- タイムアウトした場合は、再度 \`wait_until_event\` を呼び出してイベントを待ってください
- メッセージの内容に応じて、適切なツール（send_message, add_reaction, get_channel_messages）を使い分けてください
`;

      await writeFile(join(outputDir, "GEMINI.md"), prompt);
    },

    async generateAll(opts: McpSettingsOptions) {
      await Promise.all([
        this.generateMcpSettings(opts),
        this.generateSystemPrompt(),
      ]);
    },
  };
}
