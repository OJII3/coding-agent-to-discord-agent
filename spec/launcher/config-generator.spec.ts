import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("ConfigGenerator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "config-gen-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("MCP 設定ファイル生成 (.gemini/settings.json)", () => {
    it("MCP サーバーの設定を含む settings.json を生成する", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateMcpSettings({
        mcpServerCommand: "bun",
        mcpServerArgs: ["run", "src/mcp-server/index.ts"],
      });

      const settingsPath = join(tempDir, ".gemini", "settings.json");
      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // MCP サーバーの設定が含まれていることを確認
      expect(settings).toHaveProperty("mcpServers");
      const serverConfig = Object.values(settings.mcpServers)[0] as any;
      expect(serverConfig.command).toBe("bun");
      expect(serverConfig.args).toContain("run");
      expect(serverConfig.args).toContain("src/mcp-server/index.ts");
    });
  });

  describe("システムプロンプト生成 (GEMINI.md)", () => {
    it("GEMINI.md を生成する", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateSystemPrompt();

      const promptPath = join(tempDir, "GEMINI.md");
      const content = await readFile(promptPath, "utf-8");

      expect(content.length).toBeGreaterThan(0);
    });

    it("wait_until_event の呼び出し指示が含まれる", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateSystemPrompt();

      const promptPath = join(tempDir, "GEMINI.md");
      const content = await readFile(promptPath, "utf-8");

      expect(content).toContain("wait_until_event");
    });

    it("Bot 自身のメッセージに反応しない指示が含まれる", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateSystemPrompt();

      const promptPath = join(tempDir, "GEMINI.md");
      const content = await readFile(promptPath, "utf-8");

      // Bot 自身のメッセージに反応しないことを示す文言が含まれる
      expect(content).toMatch(/[Bb]ot|自身/);
    });

    it("タイムアウト時の再呼び出し指示が含まれる", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateSystemPrompt();

      const promptPath = join(tempDir, "GEMINI.md");
      const content = await readFile(promptPath, "utf-8");

      expect(content).toMatch(/タイムアウト|timeout/i);
    });
  });

  describe("全設定ファイルの一括生成", () => {
    it("generateAll で MCP 設定とシステムプロンプトの両方を生成する", async () => {
      const { createConfigGenerator } = await import(
        "../../src/launcher/config-generator.ts"
      );
      const generator = createConfigGenerator({ outputDir: tempDir });

      await generator.generateAll({
        mcpServerCommand: "bun",
        mcpServerArgs: ["run", "src/mcp-server/index.ts"],
      });

      const settingsPath = join(tempDir, ".gemini", "settings.json");
      const promptPath = join(tempDir, "GEMINI.md");

      const settings = await readFile(settingsPath, "utf-8");
      const prompt = await readFile(promptPath, "utf-8");

      expect(settings.length).toBeGreaterThan(0);
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});
