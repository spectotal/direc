import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AutomationTransportConfig } from "@spectotal/direc-analysis-runtime";
import type { SubagentBackendResponse, SubagentRequest } from "../types.js";

export async function runSdkTransport(
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

  const payload = await (candidate as (input: SubagentRequest) => Promise<unknown> | unknown)(
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
