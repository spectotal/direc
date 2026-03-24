import { spawn } from "node:child_process";
import type { AutomationTransportConfig } from "direc-analysis-runtime";
import type { SubagentBackendResponse, SubagentRequest } from "../types.js";

export async function runCommandTransport(
  request: SubagentRequest,
  transport: Extract<AutomationTransportConfig, { kind: "command" }>,
): Promise<SubagentBackendResponse> {
  const start = Date.now();

  return new Promise((resolveCommand, reject) => {
    const child = spawn(transport.command, transport.args ?? [], {
      cwd: transport.cwd,
      env: {
        ...process.env,
        ...transport.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeout = transport.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGTERM");
          reject(
            new Error(
              `Subagent command timed out after ${transport.timeoutMs}ms: ${transport.command}`,
            ),
          );
        }, transport.timeoutMs)
      : null;

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `Subagent command exited with code ${code}.`));
        return;
      }

      resolveCommand({
        payload: JSON.parse(stdout || "{}"),
        diagnostics: {
          transportKind: "command",
          durationMs: Date.now() - start,
          exitCode: code ?? undefined,
          stderr: stderr || undefined,
        },
      });
    });

    child.stdin.write(`${JSON.stringify(request)}\n`, "utf8");
    child.stdin.end();
  });
}
