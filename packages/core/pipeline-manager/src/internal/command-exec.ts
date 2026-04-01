import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { CommandToolConfig } from "@spectotal/direc-analysis-contracts";

export async function runCommandNode(
  config: CommandToolConfig,
  repositoryRoot: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const cwd = config.command.cwd ? resolve(repositoryRoot, config.command.cwd) : repositoryRoot;
  const child = spawn(config.command.command, config.command.args ?? [], {
    cwd,
    env: {
      ...process.env,
      ...config.command.env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  return await new Promise<unknown>((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Command node ${config.id} timed out.`));
    }, config.command.timeoutMs ?? 30_000);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr || `Command node ${config.id} exited with code ${code ?? -1}.`));
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout || "{}"));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(`Command node ${config.id} produced invalid JSON.`),
        );
      }
    });

    child.stdin.end(JSON.stringify(input));
  });
}
