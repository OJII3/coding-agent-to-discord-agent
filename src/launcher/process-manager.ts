type SpawnFn = (cmd: string[], opts?: object) => {
  pid: number;
  exitCode: number | null;
  exited: Promise<number>;
  kill: (signal?: number) => void;
  stdout: ReadableStream;
  stderr: ReadableStream;
};

interface ProcessManagerOptions {
  spawn: SpawnFn;
  autoRestart?: boolean;
}

interface StartOptions {
  command: string;
  args: string[];
}

export function createProcessManager({
  spawn,
  autoRestart = false,
}: ProcessManagerOptions) {
  let currentProcess: ReturnType<SpawnFn> | null = null;
  let exitCallbacks: Array<(code: number) => void> = [];
  let stopped = false;
  let lastStartOptions: StartOptions | null = null;

  function watchProcess(proc: ReturnType<SpawnFn>) {
    proc.exited.then((code) => {
      for (const cb of exitCallbacks) {
        cb(code);
      }

      if (autoRestart && !stopped && code !== 0 && lastStartOptions) {
        const opts = lastStartOptions;
        currentProcess = spawn([opts.command, ...opts.args]);
        watchProcess(currentProcess);
      }
    });
  }

  return {
    async start(opts: StartOptions) {
      lastStartOptions = opts;
      stopped = false;
      currentProcess = spawn([opts.command, ...opts.args]);
      watchProcess(currentProcess);
    },

    stop() {
      stopped = true;
      currentProcess?.kill();
    },

    getPid(): number | null {
      return currentProcess?.pid ?? null;
    },

    onExit(callback: (code: number) => void) {
      exitCallbacks.push(callback);
    },
  };
}
