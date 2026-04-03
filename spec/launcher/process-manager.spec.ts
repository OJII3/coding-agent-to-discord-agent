import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

describe("ProcessManager", () => {
  describe("gemini-cli の起動", () => {
    it("gemini-cli を -p フラグとヘッドレスモードで起動する", async () => {
      const mockSpawn = mock(() => ({
        pid: 12345,
        exitCode: null,
        exited: new Promise(() => {}),
        kill: mock(() => {}),
      }));

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({ spawn: mockSpawn as any });

      await pm.start({
        command: "gemini",
        args: ["-p", "初期プロンプト", "--yolo"],
      });

      expect(mockSpawn).toHaveBeenCalled();
    });

    it("起動したプロセスの PID を取得できる", async () => {
      const mockSpawn = mock(() => ({
        pid: 12345,
        exitCode: null,
        exited: new Promise(() => {}),
        kill: mock(() => {}),
      }));

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({ spawn: mockSpawn as any });

      await pm.start({
        command: "gemini",
        args: ["-p", "test"],
      });

      expect(pm.getPid()).toBe(12345);
    });
  });

  describe("プロセス監視", () => {
    it("プロセスの異常終了を検知する", async () => {
      let resolveExited: (code: number) => void;
      const exitedPromise = new Promise<number>(
        (resolve) => (resolveExited = resolve),
      );

      const mockSpawn = mock(() => ({
        pid: 12345,
        exitCode: null,
        exited: exitedPromise,
        kill: mock(() => {}),
      }));

      const onExit = mock((_code: number) => {});

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({ spawn: mockSpawn as any });
      pm.onExit(onExit);

      await pm.start({ command: "gemini", args: ["-p", "test"] });

      // プロセスが異常終了
      resolveExited!(1);
      await exitedPromise;

      // onExit コールバックが呼ばれることを期待
      // (非同期のため、少し待つ)
      await new Promise((r) => setTimeout(r, 50));
      expect(onExit).toHaveBeenCalledWith(1);
    });

    it("終了コード 53 (ターン制限超過) を検知できる", async () => {
      let resolveExited: (code: number) => void;
      const exitedPromise = new Promise<number>(
        (resolve) => (resolveExited = resolve),
      );

      const mockSpawn = mock(() => ({
        pid: 12345,
        exitCode: null,
        exited: exitedPromise,
        kill: mock(() => {}),
      }));

      const onExit = mock((_code: number) => {});

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({ spawn: mockSpawn as any });
      pm.onExit(onExit);

      await pm.start({ command: "gemini", args: ["-p", "test"] });

      resolveExited!(53);
      await exitedPromise;

      await new Promise((r) => setTimeout(r, 50));
      expect(onExit).toHaveBeenCalledWith(53);
    });
  });

  describe("自動再起動", () => {
    it("プロセス異常終了後に自動再起動する", async () => {
      let callCount = 0;
      let resolvers: Array<(code: number) => void> = [];

      const mockSpawn = mock(() => {
        const exitedPromise = new Promise<number>((resolve) => {
          resolvers.push(resolve);
        });
        callCount++;
        return {
          pid: 12345 + callCount,
          exitCode: null,
          exited: exitedPromise,
          kill: mock(() => {}),
          stdout: { getReader: () => ({ read: () => new Promise(() => {}) }) },
          stderr: { getReader: () => ({ read: () => new Promise(() => {}) }) },
        };
      });

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({
        spawn: mockSpawn as any,
        autoRestart: true,
      });

      await pm.start({ command: "gemini", args: ["-p", "test"] });
      expect(mockSpawn).toHaveBeenCalledTimes(1);

      // プロセスが異常終了
      resolvers[0](1);
      await new Promise((r) => setTimeout(r, 100));

      // 自動再起動が行われたことを確認
      expect(mockSpawn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("プロセス停止", () => {
    it("実行中のプロセスを停止できる", async () => {
      const killMock = mock(() => {});
      const mockSpawn = mock(() => ({
        pid: 12345,
        exitCode: null,
        exited: new Promise(() => {}),
        kill: killMock,
      }));

      const { createProcessManager } = await import(
        "../../src/launcher/process-manager.ts"
      );
      const pm = createProcessManager({ spawn: mockSpawn as any });

      await pm.start({ command: "gemini", args: ["-p", "test"] });
      pm.stop();

      expect(killMock).toHaveBeenCalled();
    });
  });
});
