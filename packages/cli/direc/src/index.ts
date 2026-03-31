import { access, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createInterface } from "node:readline/promises";
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
  type SkillProviderId,
  type SkillsProviderWorkspaceConfig,
  type SkillsWorkspaceConfig,
  type WorkspaceConfig,
} from "@spectotal/direc-pipeline-manager";
import { consoleSink } from "@spectotal/direc-sink-console";
import { syncSkills, type SyncSkillsResult } from "@spectotal/direc-skills-manager";
import { gitDiffSource } from "@spectotal/direc-source-git-diff";
import { openSpecSource } from "@spectotal/direc-source-openspec";
import {
  DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  repositorySource,
} from "@spectotal/direc-source-repository";
import { boundsEvaluatorNode } from "@spectotal/direc-tool-bounds-evaluator";
import { clusterBuilderNode } from "@spectotal/direc-tool-cluster-builder";
import { jsComplexityNode } from "@spectotal/direc-tool-js-complexity";
import { graphMakerNode } from "@spectotal/direc-tool-graph-maker";
import { specDocumentsNode } from "@spectotal/direc-tool-spec-documents";
import { specConflictNode } from "@spectotal/direc-tool-spec-conflict";

const execFileAsync = promisify(execFile);
const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const DEFAULT_CODEX_SKILLS_INSTALL_TARGET = ".codex/skills";
const SUPPORTED_SKILL_PROVIDERS: SkillProviderId[] = ["codex", "claude", "antigravity"];

export interface BuildWorkspaceConfigOptions {
  now?: () => Date;
  skills?: SkillsWorkspaceConfig;
}

export interface InitCommandOptions {
  providers?: SkillProviderId[];
  installTargets?: Partial<Record<SkillProviderId, string>>;
  interactive?: boolean;
  prompt?: (question: string) => Promise<string>;
  now?: () => Date;
}

export interface InitCommandResult {
  config: WorkspaceConfig;
  context: ProjectContext;
  configPath: string;
  skills: SyncSkillsResult;
}

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
    sources: [repositorySource, gitDiffSource, openSpecSource],
    analysisNodes: [
      jsComplexityNode,
      graphMakerNode,
      clusterBuilderNode,
      boundsEvaluatorNode,
      specDocumentsNode,
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
  options: BuildWorkspaceConfigOptions = {},
): WorkspaceConfig {
  const now = options.now ?? (() => new Date());
  const facets = context.facets.map((facet) => facet.id);
  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: now().toISOString(),
    facets,
    skills: options.skills,
    sources: {},
    tools: {},
    sinks: {},
    pipelines: [],
  };

  config.sources.repository = {
    id: "repository",
    plugin: "repository",
    enabled: true,
    options: {
      excludePaths: [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS],
    },
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
    config.tools.jsComplexity = {
      id: "jsComplexity",
      kind: "builtin",
      plugin: "js-complexity",
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
    config.tools.specDocuments = {
      id: "specDocuments",
      kind: "builtin",
      plugin: "spec-documents",
      enabled: true,
    };
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

  if (config.sources.repository && config.tools.jsComplexity && config.tools.graph) {
    config.pipelines.push({
      id: "repository-quality",
      description: "Inspect repository-wide scope with facet and agnostic analysis.",
      source: "repository",
      analysis: {
        facet: ["jsComplexity", "graph"].filter((toolId) => Boolean(config.tools[toolId])),
        agnostic: ["cluster", "bounds"].filter((toolId) => Boolean(config.tools[toolId])),
      },
      feedback: {
        rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
        sinks: ["console"],
      },
    });
  }

  if (config.sources.diff) {
    config.pipelines.push({
      id: "diff-quality",
      description: "Inspect current git diff with facet and agnostic analysis.",
      source: "diff",
      analysis: {
        facet: ["jsComplexity", "graph"].filter((toolId) => Boolean(config.tools[toolId])),
        agnostic: ["cluster", "bounds"].filter((toolId) => Boolean(config.tools[toolId])),
      },
      feedback: {
        rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
        sinks: ["console"],
      },
    });
  }

  if (config.sources.openspecTasks) {
    config.pipelines.push({
      id: "openspec-task-feedback",
      description: "Evaluate completed OpenSpec tasks against facet and agnostic code analysis.",
      source: "openspecTasks",
      analysis: {
        facet: ["jsComplexity", "graph"].filter((toolId) => Boolean(config.tools[toolId])),
        agnostic: ["cluster", "bounds"].filter((toolId) => Boolean(config.tools[toolId])),
      },
      feedback: {
        rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
        sinks: ["console"],
      },
    });
  }

  if (config.sources.openspecSpecs) {
    config.pipelines.push({
      id: "openspec-spec-conflicts",
      description: "Compare OpenSpec change specs through facet and agnostic analysis.",
      source: "openspecSpecs",
      analysis: {
        facet: ["specDocuments"].filter((toolId) => Boolean(config.tools[toolId])),
        agnostic: ["specConflict"].filter((toolId) => Boolean(config.tools[toolId])),
      },
      feedback: {
        rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
        sinks: ["console"],
      },
    });
  }

  return config;
}

export async function initCommand(repositoryRoot: string): Promise<{
  config: WorkspaceConfig;
  context: ProjectContext;
  configPath: string;
  skills: SyncSkillsResult;
}>;
export async function initCommand(
  repositoryRoot: string,
  options: InitCommandOptions,
): Promise<InitCommandResult>;
export async function initCommand(
  repositoryRoot: string,
  options: InitCommandOptions = {},
): Promise<InitCommandResult> {
  const context = await detectProjectContext(repositoryRoot);
  const skillsConfig = await resolveSkillsConfig(options);
  const config = buildWorkspaceConfig(context, {
    now: options.now,
    skills: skillsConfig,
  });
  const configPath = await writeWorkspaceConfig(repositoryRoot, config);
  const skills = await syncSkills({
    repositoryRoot,
    config: {
      providers: skillsConfig.providers,
    },
    now: options.now,
  });

  return {
    config,
    context,
    configPath,
    skills,
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
  const [command, ...args] = argv;
  const repositoryRoot = process.cwd();

  switch (command) {
    case "init": {
      const initOptions = parseInitArgs(args);
      const promptSession =
        initOptions.providers === undefined && process.stdin.isTTY && process.stdout.isTTY
          ? createPromptSession()
          : undefined;
      let result: InitCommandResult;
      try {
        result = await initCommand(repositoryRoot, {
          ...initOptions,
          interactive: promptSession !== undefined,
          prompt: promptSession?.prompt,
        });
      } finally {
        promptSession?.close();
      }
      process.stdout.write(`wrote ${result.configPath}\n`);
      process.stdout.write(
        `facets: ${result.context.facets.map((facet) => facet.id).join(", ") || "none"}\n`,
      );
      process.stdout.write(
        `pipelines: ${result.config.pipelines.map((pipeline) => pipeline.id).join(", ") || "none"}\n`,
      );
      process.stdout.write(
        `skills: ${
          result.config.skills?.providers
            .map((provider) => `${provider.id}:${provider.installMode}`)
            .join(", ") || "none"
        }\n`,
      );
      return;
    }
    case "run": {
      const pipelineId = args[0];
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
      const pipelineId = args[0];
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
      process.stdout.write(
        "usage: direc init [--providers list] [--install-target provider=path]\n",
      );
      process.stdout.write("       direc run [pipeline-id]\n");
      process.stdout.write("       direc watch [pipeline-id]\n");
    }
  }
}

async function resolveSkillsConfig(options: InitCommandOptions): Promise<SkillsWorkspaceConfig> {
  const providers =
    options.providers && options.providers.length > 0
      ? uniqueProviders(options.providers)
      : options.interactive && options.prompt
        ? await promptForProviders(options.prompt)
        : null;

  if (!providers || providers.length === 0) {
    throw new Error("direc init requires --providers in non-interactive mode.");
  }

  const providerConfigs: SkillsProviderWorkspaceConfig[] = [];
  for (const provider of providers) {
    providerConfigs.push(
      options.interactive && options.prompt
        ? await promptForProviderConfig(provider, options.prompt)
        : buildProviderConfig(provider, options.installTargets ?? {}),
    );
  }

  return {
    providers: providerConfigs,
  };
}

async function promptForProviders(
  prompt: NonNullable<InitCommandOptions["prompt"]>,
): Promise<SkillProviderId[]> {
  while (true) {
    const answer = await prompt(
      `providers (comma-separated: ${SUPPORTED_SKILL_PROVIDERS.join(", ")}): `,
    );
    const providers = parseProviderList(answer);
    if (providers.length > 0) {
      return providers;
    }
  }
}

async function promptForProviderConfig(
  provider: SkillProviderId,
  prompt: NonNullable<InitCommandOptions["prompt"]>,
): Promise<SkillsProviderWorkspaceConfig> {
  if (provider === "codex") {
    const answer = await prompt(
      `install target for codex [${DEFAULT_CODEX_SKILLS_INSTALL_TARGET}]: `,
    );
    const installTarget = answer.trim() || DEFAULT_CODEX_SKILLS_INSTALL_TARGET;
    return {
      id: provider,
      bundleDir: bundleDirForProvider(provider),
      installTarget,
      installMode: "installed",
    };
  }

  const answer = await prompt(`install target for ${provider} (leave blank for bundle-only): `);
  const installTarget = answer.trim();
  return {
    id: provider,
    bundleDir: bundleDirForProvider(provider),
    installTarget: installTarget || undefined,
    installMode: installTarget ? "installed" : "bundle-only",
  };
}

function buildProviderConfig(
  provider: SkillProviderId,
  installTargets: Partial<Record<SkillProviderId, string>>,
): SkillsProviderWorkspaceConfig {
  if (provider === "codex") {
    return {
      id: provider,
      bundleDir: bundleDirForProvider(provider),
      installTarget: installTargets.codex?.trim() || DEFAULT_CODEX_SKILLS_INSTALL_TARGET,
      installMode: "installed",
    };
  }

  const installTarget = installTargets[provider]?.trim();
  return {
    id: provider,
    bundleDir: bundleDirForProvider(provider),
    installTarget: installTarget || undefined,
    installMode: installTarget ? "installed" : "bundle-only",
  };
}

function bundleDirForProvider(provider: SkillProviderId): string {
  return `.direc/skills/${provider}`;
}

function parseInitArgs(args: string[]): Pick<InitCommandOptions, "providers" | "installTargets"> {
  let providers: SkillProviderId[] | undefined;
  const installTargets: Partial<Record<SkillProviderId, string>> = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }

    const [flag, inlineValue] = argument.split("=", 2);
    switch (flag) {
      case "--providers": {
        const value = inlineValue ?? args[index + 1];
        if (inlineValue === undefined) {
          index += 1;
        }
        if (!value) {
          throw new Error("--providers requires a comma-separated value.");
        }
        providers = parseProviderList(value);
        break;
      }
      case "--install-target": {
        const value = inlineValue ?? args[index + 1];
        if (inlineValue === undefined) {
          index += 1;
        }
        if (!value) {
          throw new Error("--install-target requires provider=path.");
        }
        const separator = value.indexOf("=");
        if (separator <= 0 || separator === value.length - 1) {
          throw new Error("--install-target requires provider=path.");
        }
        const provider = normalizeProviderId(value.slice(0, separator));
        installTargets[provider] = value.slice(separator + 1);
        break;
      }
      default:
        throw new Error(`Unknown init option: ${argument}`);
    }
  }

  return {
    providers,
    installTargets,
  };
}

function parseProviderList(value: string): SkillProviderId[] {
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(normalizeProviderId);

  return uniqueProviders(parsed);
}

function normalizeProviderId(value: string): SkillProviderId {
  if (value === "codex" || value === "claude" || value === "antigravity") {
    return value;
  }

  throw new Error(`Unsupported skills provider: ${value}`);
}

function uniqueProviders(providers: SkillProviderId[]): SkillProviderId[] {
  return [...new Set(providers)];
}

function createPromptSession(): {
  prompt: (question: string) => Promise<string>;
  close: () => void;
} {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    prompt: (question: string) => rl.question(question),
    close: () => rl.close(),
  };
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
