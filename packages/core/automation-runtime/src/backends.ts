import { spawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AutomationTransportConfig } from "direc-analysis-runtime";
import type { SubagentBackend, SubagentBackendResponse, SubagentRequest } from "./types.js";

export function createSubagentBackend(
  repositoryRoot: string,
  transport: AutomationTransportConfig,
): SubagentBackend {
  switch (transport.kind) {
    case "command":
      return {
        run: (request) => runCommandTransport(request, transport),
      };
    case "http":
      return {
        run: (request) => runHttpTransport(request, transport),
      };
    case "sdk":
      return {
        run: (request) => runSdkTransport(repositoryRoot, request, transport),
      };
  }
}

async function runCommandTransport(
  request: SubagentRequest,
  transport: Extract<AutomationTransportConfig, { kind: "command" }>,
): Promise<SubagentBackendResponse> {
  const start = Date.now();

  return new Promise((resolvePromise, reject) => {
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
    let exitCode: number | null = null;

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
      exitCode = code;
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `Subagent command exited with code ${code}.`));
        return;
      }

      resolvePromise({
        payload: JSON.parse(stdout || "{}"),
        diagnostics: {
          transportKind: "command",
          durationMs: Date.now() - start,
          exitCode: exitCode ?? undefined,
          stderr: stderr || undefined,
        },
      });
    });

    child.stdin.write(`${JSON.stringify(request)}\n`, "utf8");
    child.stdin.end();
  });
}

async function runHttpTransport(
  request: SubagentRequest,
  transport: Extract<AutomationTransportConfig, { kind: "http" }>,
): Promise<SubagentBackendResponse> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = transport.timeoutMs
    ? setTimeout(() => controller.abort(), transport.timeoutMs)
    : null;

  try {
    const response = await fetch(transport.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...transport.headers,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const payload = (await response.json()) as unknown;

    return {
      payload,
      diagnostics: {
        transportKind: "http",
        durationMs: Date.now() - start,
        statusCode: response.status,
      },
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function runSdkTransport(
  repositoryRoot: string,
  request: SubagentRequest,
  transport: Extract<AutomationTransportConfig, { kind: "sdk" }>,
): Promise<SubagentBackendResponse> {
  const start = Date.now();
  const modulePath = isAbsolute(transport.modulePath)
    ? transport.modulePath
    : resolve(repositoryRoot, transport.modulePath);
  const imported = (await import(pathToFileURL(modulePath).href)) as Record<string, unknown>;
  const exportName = transport.exportName ?? "runSubagent";
  const candidate = imported[exportName];

  if (typeof candidate !== "function") {
    throw new Error(`Subagent SDK export "${exportName}" is not a function.`);
  }

  const payload = await (candidate as (request: SubagentRequest) => Promise<unknown> | unknown)(
    request,
  );

  return {
    payload,
    diagnostics: {
      transportKind: "sdk",
      durationMs: Date.now() - start,
    },
  };
}
