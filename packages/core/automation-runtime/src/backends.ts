import type { AutomationTransportConfig } from "direc-analysis-runtime";
import { runCommandTransport } from "./backends/command.js";
import { runHttpTransport } from "./backends/http.js";
import { runSdkTransport } from "./backends/sdk.js";
import type { SubagentBackend } from "./types.js";

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
