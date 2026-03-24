import { Hook } from "import-in-the-middle";
import { tracer } from "./tracer.js";
import type {
  AnalyzerPlugin,
  AnalyzerRunContext,
  AnalyzerSnapshot,
  RuntimeExecutionResult,
} from "direc-analysis-runtime";

type ProcessWorkflowEventOptions = {
  plugins: AnalyzerPlugin[];
  event: {
    type: string;
    change?: { id: string };
    source: string;
    pathScopes?: string[];
  };
  repositoryRoot: string;
  [key: string]: unknown;
};

type RuntimeExports = {
  processWorkflowEvent: (opts: ProcessWorkflowEventOptions) => Promise<RuntimeExecutionResult>;
  [key: string]: unknown;
};

function wrapPlugin(plugin: AnalyzerPlugin): AnalyzerPlugin {
  return {
    ...plugin,
    async run(context: AnalyzerRunContext): Promise<AnalyzerSnapshot> {
      return tracer.withSpan(
        `plugin:${plugin.id}`,
        {
          id: plugin.id,
          displayName: plugin.displayName,
          pathScopes: context.event.pathScopes?.length ?? 0,
          hasPreviousSnapshot: context.previousSnapshot !== null,
        },
        async (span) => {
          const result = await plugin.run(context);
          span.attrs["findings"] = result.findings.length;
          span.attrs["filesAnalyzed"] = result.metrics?.["filesAnalyzed"];
          span.attrs["maxCyclomatic"] = result.metrics?.["maxCyclomatic"];
          return result;
        },
      );
    },
  };
}

export function registerHooks(): void {
  new Hook(["direc-analysis-runtime"], (exports) => {
    const runtimeExports = exports as unknown as RuntimeExports;
    const origProcessWorkflowEvent = runtimeExports["processWorkflowEvent"];

    runtimeExports["processWorkflowEvent"] = async (options: ProcessWorkflowEventOptions) => {
      return tracer.withSpan(
        "direc/run",
        {
          eventType: options.event.type,
          changeId: options.event.change?.id ?? "(none)",
          source: options.event.source,
          repositoryRoot: options.repositoryRoot,
        },
        async (span) => {
          const wrappedPlugins = options.plugins.map(wrapPlugin);
          const result = await origProcessWorkflowEvent({
            ...options,
            plugins: wrappedPlugins,
          });

          span.attrs["enabled"] = result.resolution.enabled.map((r) => r.plugin.id);
          span.attrs["disabled"] = result.resolution.disabled.map((d) => ({
            id: d.pluginId,
            reasons: d.reasons.map((r) => r.code),
          }));
          span.attrs["successRuns"] = result.runs.filter((r) => r.status === "success").length;
          span.attrs["failedRuns"] = result.runs.filter((r) => r.status === "failed").length;
          span.attrs["totalFindings"] = result.runs.reduce(
            (n, r) => n + (r.snapshot?.findings.length ?? 0),
            0,
          );

          return result;
        },
      );
    };
  });
}
