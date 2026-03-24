import type { AutomationTransportConfig } from "direc-analysis-runtime";
import type { SubagentBackendResponse, SubagentRequest } from "../types.js";

export async function runHttpTransport(
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

    return {
      payload: (await response.json()) as unknown,
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
