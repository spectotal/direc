import { access, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extname, join, resolve } from "node:path";
import type {
  FeedbackNoticePayload,
  FeedbackVerdictPayload,
  ProjectContext,
  ProjectFacet,
} from "@spectotal/direc-artifact-contracts";
import type { FeedbackRule } from "@spectotal/direc-feedback-contracts";
import {
  readWorkspaceConfig,
  runPipeline,
  watchPipeline,
  writeWorkspaceConfig,
  type PipelineRegistry,
  type WorkspaceConfig,
} from "@spectotal/direc-pipeline-manager";
import { consoleSink } from "@spectotal/direc-sink-console";
import { gitDiffSource } from "@spectotal/direc-source-git-diff";
import { openSpecSource } from "@spectotal/direc-source-openspec";
import { boundsEvaluatorNode } from "@spectotal/direc-tool-bounds-evaluator";
import { clusterBuilderNode } from "@spectotal/direc-tool-cluster-builder";
import { complexityNode } from "@spectotal/direc-tool-complexity";
import { graphMakerNode } from "@spectotal/direc-tool-graph-maker";
import { specConflictNode } from "@spectotal/direc-tool-spec-conflict";

const execFileAsync = promisify(execFile);
const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

export const analysisThresholdRule: FeedbackRule<{ blockOnError?: boolean }> = {
  id: "analysis-thresholds",
  displayName: "Analysis Thresholds",
  defaultSelector: {
    anyOf: ["metric.complexity", "evaluation.bounds-distance", "evaluation.spec-conflict"],
  },
  async run(context) {
    let errorCount = 0;
    let warningCount = 0;

    for (const artifact of context.inputArtifacts) {
      const payload = artifact.payload as {
        errorCount?: number;
        warningCount?: number;
        conflictCount?: number;
      };
      errorCount += payload.errorCount ?? 0;
      warningCount += payload.warningCount ?? payload.conflictCount ?? 0;
    }

    return [
      {
        type: "feedback.notice",
        scope: {
          kind: "feedback",
        },
        payload: {
          severity: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "info",
          summary: `Analysis summary: ${errorCount} error(s), ${warningCount} warning(s).`,
          counts: {
            errorCount,
            warningCount,
          },
        } satisfies FeedbackNoticePayload,
      },
      {
        type: "feedback.verdict",
        scope: {
          kind: "feedback",
        },
        payload: {
          verdict: errorCount > 0 && (context.options.blockOnError ?? true) ? "block" : "proceed",
          summary:
            errorCount > 0 ? "Blocking due to analysis errors." : "No blocking findings detected.",
          counts: {
            errorCount,
            warningCount,
          },
        } satisfies FeedbackVerdictPayload,
      },
    ];
  },
};

export function createBuiltinRegistry(): PipelineRegistry {
  return {
    sources: [gitDiffSource, openSpecSource],
    analysisNodes: [
      complexityNode,
      graphMakerNode,
      clusterBuilderNode,
      boundsEvaluatorNode,
      specConflictNode,
    ],
    feedbackRules: [analysisThresholdRule],
    sinks: [consoleSink],
  };
}

export async function detectProjectContext(repositoryRoot: string): Promise<ProjectContext> {
  const facets = new Map<string, ProjectFacet>();
  const sourceFiles: string[] = [];
  let hasOpenSpec = false;

  await walkRepository(resolve(repositoryRoot), async (filePath, entryName) => {
    const extension = extname(entryName);

    if (entryName === "package.json" || entryName === "tsconfig.json") {
      appendFacet(facets, "js", filePath);
    }
    if (entryName === "pyproject.toml" || extension === ".py") {
      appendFacet(facets, "python", filePath);
    }

    if (entryName === "openspec" && filePath.endsWith("/openspec")) {
      hasOpenSpec = true;
      appendFacet(facets, "openspec", filePath);
    }
    if (extension === ".css") {
      appendFacet(facets, "css", filePath);
    }
    if (entryName === "tailwind.config.js" || entryName === "tailwind.config.ts") {
      appendFacet(facets, "tailwind", filePath);
    }
    if (JS_EXTENSIONS.has(extension)) {
      sourceFiles.push(filePath);
    }
  });

  const hasGit = await detectGitRepository(repositoryRoot);

  return {
    repositoryRoot: resolve(repositoryRoot),
    facets: [...facets.values()].sort((left, right) => left.id.localeCompare(right.id)),
    sourceFiles: [...new Set(sourceFiles)].sort(),
    hasGit,
    hasOpenSpec,
  };
}

export function buildWorkspaceConfig(
  context: ProjectContext,
  now: () => Date = () => new Date(),
): WorkspaceConfig {
  const facets = context.facets.map((facet) => facet.id);
  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: now().toISOString(),
    facets,
    sources: {},
    tools: {},
    sinks: {},
    pipelines: [],
  };

  if (context.hasGit) {
    config.sources.diff = {
      id: "diff",
      plugin: "git-diff",
      enabled: true,
    };
  }

  if (context.hasOpenSpec) {
    config.sources.openspecTasks = {
      id: "openspecTasks",
      plugin: "openspec",
      enabled: true,
      options: {
        mode: "tasks",
      },
    };
    config.sources.openspecSpecs = {
      id: "openspecSpecs",
      plugin: "openspec",
      enabled: true,
      options: {
        mode: "spec-change",
      },
    };
  }

  if (facets.includes("js")) {
    config.tools.complexity = {
      id: "complexity",
      kind: "builtin",
      plugin: "complexity",
      enabled: true,
      options: {
        warningThreshold: 10,
        errorThreshold: 20,
      },
    };
    config.tools.graph = {
      id: "graph",
      kind: "builtin",
      plugin: "graph-maker",
      enabled: true,
    };
    config.tools.cluster = {
      id: "cluster",
      kind: "builtin",
      plugin: "cluster-builder",
      enabled: true,
    };
    config.tools.bounds = {
      id: "bounds",
      kind: "builtin",
      plugin: "bounds-evaluator",
      enabled: true,
    };
  }

  if (context.hasOpenSpec) {
    config.tools.specConflict = {
      id: "specConflict",
      kind: "builtin",
      plugin: "spec-conflict",
      enabled: true,
    };
  }

  config.sinks.console = {
    id: "console",
    plugin: "console",
    enabled: true,
  };

  if (config.sources.diff) {
    config.pipelines.push({
      id: "diff-quality",
      description: "Inspect current git diff and derive architecture feedback.",
      source: "diff",
      tools: ["complexity", "graph", "cluster", "bounds"].filter((toolId) =>
        Boolean(config.tools[toolId]),
      ),
      rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
      sinks: ["console"],
    });
  }

  if (config.sources.openspecTasks) {
    config.pipelines.push({
      id: "openspec-task-feedback",
      description: "Evaluate completed OpenSpec tasks against the current codebase.",
      source: "openspecTasks",
      tools: ["complexity", "graph", "cluster", "bounds"].filter((toolId) =>
        Boolean(config.tools[toolId]),
      ),
      rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
      sinks: ["console"],
    });
  }

  if (config.sources.openspecSpecs) {
    config.pipelines.push({
      id: "openspec-spec-conflicts",
      description: "Compare change spec artifacts against stable OpenSpec specs.",
      source: "openspecSpecs",
      tools: ["specConflict"].filter((toolId) => Boolean(config.tools[toolId])),
      rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
      sinks: ["console"],
    });
  }

  return config;
}

export async function initCommand(repositoryRoot: string): Promise<{
  config: WorkspaceConfig;
  context: ProjectContext;
  configPath: string;
}> {
  const context = await detectProjectContext(repositoryRoot);
  const config = buildWorkspaceConfig(context);
  const configPath = await writeWorkspaceConfig(repositoryRoot, config);

  return {
    config,
    context,
    configPath,
  };
}

export async function runCommand(
  repositoryRoot: string,
  pipelineId?: string,
): Promise<Awaited<ReturnType<typeof runPipeline>>[]> {
  const config = await readWorkspaceConfig(repositoryRoot);
  const context = await detectProjectContext(repositoryRoot);
  const registry = createBuiltinRegistry();
  const selectedPipelines = pipelineId
    ? [pipelineId]
    : config.pipelines.map((pipeline) => pipeline.id);
  const results = [];

  for (const selectedPipelineId of selectedPipelines) {
    results.push(
      await runPipeline({
        repositoryRoot,
        config,
        registry,
        projectContext: context,
        pipelineId: selectedPipelineId,
      }),
    );
  }

  return results;
}

export async function watchCommand(
  repositoryRoot: string,
  pipelineId?: string,
): Promise<{ close: () => void }> {
  const config = await readWorkspaceConfig(repositoryRoot);
  const context = await detectProjectContext(repositoryRoot);
  const registry = createBuiltinRegistry();
  const selectedPipelines = pipelineId
    ? [pipelineId]
    : config.pipelines.map((pipeline) => pipeline.id);
  const handles = await Promise.all(
    selectedPipelines.map((selectedPipelineId) =>
      watchPipeline({
        repositoryRoot,
        config,
        registry,
        projectContext: context,
        pipelineId: selectedPipelineId,
        onResult(result) {
          const notices = result.artifacts.filter(
            (artifact) => artifact.type === "feedback.notice",
          );
          const verdicts = result.artifacts.filter(
            (artifact) => artifact.type === "feedback.verdict",
          );
          process.stdout.write(
            `pipeline ${result.manifest.pipelineId}: ${result.artifacts.length} artifact(s), ${notices.length} notice(s), ${verdicts.length} verdict(s)\n`,
          );
        },
      }),
    ),
  );

  return {
    close: () => {
      for (const handle of handles) {
        handle.close();
      }
    },
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const [command, pipelineId] = argv;
  const repositoryRoot = process.cwd();

  switch (command) {
    case "init": {
      const result = await initCommand(repositoryRoot);
      process.stdout.write(`wrote ${result.configPath}\n`);
      process.stdout.write(
        `facets: ${result.context.facets.map((facet) => facet.id).join(", ") || "none"}\n`,
      );
      process.stdout.write(
        `pipelines: ${result.config.pipelines.map((pipeline) => pipeline.id).join(", ") || "none"}\n`,
      );
      return;
    }
    case "run": {
      const results = await runCommand(repositoryRoot, pipelineId);
      for (const result of results) {
        const noticeCount = result.artifacts.filter(
          (artifact) => artifact.type === "feedback.notice",
        ).length;
        const verdictCount = result.artifacts.filter(
          (artifact) => artifact.type === "feedback.verdict",
        ).length;
        process.stdout.write(
          `${result.manifest.pipelineId}: ${result.artifacts.length} artifact(s), ${noticeCount} notice(s), ${verdictCount} verdict(s)\n`,
        );
      }
      return;
    }
    case "watch": {
      const handle = await watchCommand(repositoryRoot, pipelineId);
      process.stdout.write("watching pipelines, press Ctrl+C to stop\n");
      await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
          handle.close();
          resolve();
        });
      });
      return;
    }
    default: {
      process.stdout.write("usage: direc <init|run|watch> [pipeline-id]\n");
    }
  }
}

async function walkRepository(
  currentPath: string,
  onFile: (filePath: string, entryName: string) => Promise<void>,
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === ".direc" ||
      entry.name === "coverage"
    ) {
      continue;
    }

    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await onFile(entryPath, entry.name);
      await walkRepository(entryPath, onFile);
      continue;
    }

    await onFile(entryPath, entry.name);
  }
}

function appendFacet(map: Map<string, ProjectFacet>, id: string, evidencePath: string): void {
  const existing = map.get(id);
  if (existing) {
    existing.evidence.push(evidencePath);
    return;
  }

  map.set(id, {
    id,
    evidence: [evidencePath],
  });
}

async function detectGitRepository(repositoryRoot: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], {
      cwd: repositoryRoot,
    });
    return true;
  } catch {
    return false;
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
