import { parseInitArgs } from "../init-args.js";
import { createPromptSession } from "../skills-config.js";
import type { InitCommandResult } from "../types.js";
import { initCommand, writeInitSummary } from "./init-command.js";
import { formatPipelineSummary, runCommand, watchCommand } from "./pipeline-command.js";

const COMMAND_HANDLERS = {
  init: runInitMain,
  run: runPipelineMain,
  watch: runWatchMain,
} satisfies Record<string, (repositoryRoot: string, args: string[]) => Promise<void>>;

type CommandName = keyof typeof COMMAND_HANDLERS;

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const [command, ...args] = argv;
  const repositoryRoot = process.cwd();
  const handler = command ? COMMAND_HANDLERS[command as CommandName] : undefined;

  if (!handler) {
    writeUsage();
    return;
  }

  await handler(repositoryRoot, args);
}

async function runInitMain(repositoryRoot: string, args: string[]): Promise<void> {
  const initOptions = parseInitArgs(args);
  const promptSession =
    initOptions.agents === undefined && process.stdin.isTTY && process.stdout.isTTY
      ? createPromptSession()
      : undefined;
  let result: InitCommandResult;

  try {
    result = await initCommand(repositoryRoot, {
      ...initOptions,
      promptSession,
    });
  } finally {
    promptSession?.close();
  }

  writeInitSummary(result);
}

async function runPipelineMain(repositoryRoot: string, args: string[]): Promise<void> {
  const results = await runCommand(repositoryRoot, args[0]);

  for (const result of results) {
    process.stdout.write(formatPipelineSummary(result));
  }
}

async function runWatchMain(repositoryRoot: string, args: string[]): Promise<void> {
  const handle = await watchCommand(repositoryRoot, args[0]);
  process.stdout.write("watching pipelines, press Ctrl+C to stop\n");
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      handle.close();
      resolve();
    });
  });
}

function writeUsage(): void {
  process.stdout.write("usage: direc init [--agent agent]\n");
  process.stdout.write("       direc run [pipeline-id]\n");
  process.stdout.write("       direc watch [pipeline-id]\n");
}
