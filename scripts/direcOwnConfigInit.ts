import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModuleRoleDefinition, RoleBoundaryRule } from "direc-plugin-js-architecture-drift";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(repositoryRoot, ".direc", "config.json");

const cliRoot = "packages/cli/direc/src";
const engineRoot = "packages/core/direc-engine/src";

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    analyzers?: Record<string, { enabled?: boolean; options?: Record<string, unknown> }>;
  };
  const moduleRoles = await createDirecOwnModuleRoles();
  const roleBoundaryRules = createDirecOwnRoleBoundaryRules(moduleRoles);
  const analyzers = config.analyzers ?? {};
  const architectureDrift = analyzers["js-architecture-drift"] ?? {};

  analyzers["js-architecture-drift"] = {
    enabled: architectureDrift.enabled ?? true,
    options: {
      ...(architectureDrift.options ?? {}),
      moduleRoles,
      roleBoundaryRules,
    },
  };

  config.analyzers = analyzers;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`Updated ${configPath} with Direc-specific architecture boundaries.\n`);
}

async function createDirecOwnModuleRoles(): Promise<ModuleRoleDefinition[]> {
  const roleSpecs = [
    defineRole("cli-command-surface", "CLI command registration and command handlers.", [
      at(cliRoot, "cli.ts"),
      at(cliRoot, "main.ts"),
      at(cliRoot, "run-cli.ts"),
      at(cliRoot, "commands"),
    ]),
    defineRole("cli-output-formatting", "CLI-only output formatters and presentation helpers.", [
      at(cliRoot, "lib"),
    ]),
    defineRole("cli-public-api", "Public CLI package entrypoint.", [at(cliRoot, "index.ts")]),
    defineRole("engine-public-api", "Public engine package entrypoint.", [
      at(engineRoot, "index.ts"),
    ]),
    defineRole("engine-config-bootstrap", "Bootstrap helpers for config, files, and templates.", [
      at(engineRoot, "config.ts"),
      at(engineRoot, "fs.ts"),
      at(engineRoot, "templates.ts"),
    ]),
    defineRole("engine-extension-loading", "Extension contracts and loader logic.", [
      at(engineRoot, "extension-types.ts"),
      at(engineRoot, "extensions.ts"),
      at(engineRoot, "extensions-helpers.ts"),
    ]),
    defineRole("engine-analyzer-registry", "Analyzer registration and composition.", [
      at(engineRoot, "analyzers.ts"),
    ]),
    defineRole("engine-quality-routines", "Quality-routine detection, adapters, and analyzers.", [
      at(engineRoot, "quality-routines.ts"),
      at(engineRoot, "quality-routines"),
    ]),
    defineRole(
      "engine-runtime-assembly",
      "Runtime environment assembly and workflow registry resolution.",
      [at(engineRoot, "runtime-environment.ts"), at(engineRoot, "registry")],
    ),
    defineRole("engine-analysis-execution", "Analysis execution orchestration.", [
      at(engineRoot, "analysis-runner.ts"),
    ]),
    defineRole("engine-automation-execution", "Automation execution orchestration.", [
      at(engineRoot, "automation-runner.ts"),
    ]),
    defineRole(
      "core-runtime",
      "Core runtime modules that stay independent from CLI and engine composition.",
      ["packages/core/analysis-runtime/src", "packages/core/automation-runtime/src"],
    ),
    defineRole("workflow-contract", "Workflow contracts shared by runtimes and adapters.", [
      "packages/core/workflow-runtime/src",
    ]),
    defineRole("workflow-public-entry", "Public adapter entrypoints that should stay thin.", [
      "packages/adapters/direc/src/index.ts",
      "packages/adapters/openspec/src/index.ts",
    ]),
    defineRole("workflow-orchestrator", "Adapter modules that coordinate workflow behavior.", [
      "packages/adapters/direc/src/adapter.ts",
      "packages/adapters/openspec/src/adapter.ts",
      "packages/adapters/openspec/src/watch.ts",
    ]),
    defineRole("workflow-event-shaper", "Workflow event and transition normalization helpers.", [
      "packages/adapters/direc/src/events.ts",
      "packages/adapters/openspec/src/events.ts",
      "packages/adapters/openspec/src/event-transitions.ts",
      "packages/adapters/openspec/src/status-revision.ts",
    ]),
    defineRole("workflow-change-loader", "Leaf modules that load change state.", [
      "packages/adapters/direc/src/git.ts",
      "packages/adapters/openspec/src/status.ts",
    ]),
    defineRole("workflow-support", "Internal adapter helpers that support loaders or watchers.", [
      "packages/adapters/direc/src/analysis-events.ts",
      "packages/adapters/direc/src/watch-events.ts",
      "packages/adapters/openspec/src/status-io.ts",
      "packages/adapters/openspec/src/status-json.ts",
      "packages/adapters/openspec/src/status-snapshot.ts",
      "packages/adapters/openspec/src/status-tasks.ts",
    ]),
    defineRole("workflow-shared-types", "Adapter-local shared type modules.", [
      "packages/adapters/direc/src/types.ts",
      "packages/adapters/openspec/src/types.ts",
    ]),
  ] satisfies Array<{
    role: string;
    description: string;
    match: string[];
  }>;

  const roles = await Promise.all(
    roleSpecs.map(async (role) => {
      const match = await filterExistingPaths(role.match);
      return match.length > 0 ? { ...role, match } : null;
    }),
  );

  return roles.filter((role): role is ModuleRoleDefinition => role !== null);
}

function createDirecOwnRoleBoundaryRules(moduleRoles: ModuleRoleDefinition[]): RoleBoundaryRule[] {
  const activeRoleSet = new Set(moduleRoles.map((role) => role.role));
  const templates = [
    defineAllowRule(
      "cli-output-formatting",
      ["cli-output-formatting"],
      "CLI output helpers must stay presentation-only.",
    ),
    defineAllowRule(
      "cli-command-surface",
      ["cli-command-surface", "cli-output-formatting"],
      "CLI commands may depend only on command handlers and CLI presentation helpers.",
    ),
    defineAllowRule(
      "cli-public-api",
      ["cli-command-surface"],
      "CLI public entrypoints must stay thin and delegate into command handlers.",
    ),
    defineAllowRule(
      "engine-public-api",
      [
        "engine-config-bootstrap",
        "engine-extension-loading",
        "engine-analyzer-registry",
        "engine-quality-routines",
        "engine-runtime-assembly",
        "engine-analysis-execution",
        "engine-automation-execution",
      ],
      "The engine public API may compose engine internals, but must not reach into CLI or adapter layers.",
    ),
    defineAllowRule(
      "engine-config-bootstrap",
      ["engine-config-bootstrap"],
      "Engine bootstrap helpers must stay self-contained.",
    ),
    defineAllowRule(
      "engine-extension-loading",
      ["engine-extension-loading", "engine-quality-routines"],
      "Extension loading may depend only on extension-loading helpers and quality-routine contracts.",
    ),
    defineAllowRule(
      "engine-analyzer-registry",
      ["engine-quality-routines"],
      "Analyzer registry modules may depend only on quality-routine composition.",
    ),
    defineAllowRule(
      "engine-quality-routines",
      ["engine-quality-routines"],
      "Quality-routine modules may depend only on quality-routine helpers.",
    ),
    defineAllowRule(
      "engine-runtime-assembly",
      [
        "engine-analyzer-registry",
        "engine-extension-loading",
        "engine-quality-routines",
        "engine-runtime-assembly",
      ],
      "Runtime assembly may depend only on registry, extension-loading, and quality-routine layers.",
    ),
    defineAllowRule(
      "engine-analysis-execution",
      ["engine-analysis-execution"],
      "Analysis execution must stay isolated from runtime assembly details.",
    ),
    defineAllowRule(
      "engine-automation-execution",
      ["engine-analysis-execution", "engine-automation-execution"],
      "Automation execution may build on analysis execution, but not on broader engine orchestration.",
    ),
    defineAllowRule(
      "core-runtime",
      ["core-runtime"],
      "Core runtime modules must remain self-contained.",
    ),
    defineAllowRule(
      "workflow-contract",
      ["workflow-contract"],
      "Workflow contracts must remain independent from adapters and higher orchestration layers.",
    ),
    defineAllowRule(
      "workflow-public-entry",
      ["workflow-orchestrator", "workflow-shared-types"],
      "Workflow public entrypoints must stay thin and delegate through orchestrators or shared types.",
    ),
    defineAllowRule(
      "workflow-orchestrator",
      [
        "workflow-orchestrator",
        "workflow-support",
        "workflow-event-shaper",
        "workflow-change-loader",
        "workflow-shared-types",
      ],
      "Workflow orchestrators may depend only on local helpers, event shaping, loaders, and shared types.",
    ),
    defineAllowRule(
      "workflow-event-shaper",
      ["workflow-event-shaper", "workflow-shared-types"],
      "Workflow event shapers may depend only on shared types or peer event-shaping helpers.",
    ),
    defineAllowRule(
      "workflow-change-loader",
      ["workflow-change-loader", "workflow-support", "workflow-shared-types"],
      "Workflow change loaders may depend only on loader helpers and shared types.",
    ),
    defineAllowRule(
      "workflow-support",
      ["workflow-support", "workflow-event-shaper", "workflow-shared-types"],
      "Workflow support helpers may depend only on other support helpers, event shaping, and shared types.",
    ),
    defineAllowRule(
      "workflow-shared-types",
      ["workflow-contract"],
      "Workflow shared type modules may only depend on workflow contract types.",
    ),
  ];

  return templates.flatMap((rule) => {
    if (!activeRoleSet.has(rule.sourceRole)) {
      return [];
    }

    const onlyDependOnRoles = rule.onlyDependOnRoles.filter((role) => activeRoleSet.has(role));

    if (onlyDependOnRoles.length === 0) {
      return [];
    }

    return [
      {
        sourceRole: rule.sourceRole,
        onlyDependOnRoles,
        message: rule.message,
      },
    ];
  });
}

function defineRole(role: string, description: string, match: string[]) {
  return {
    role,
    description,
    match,
  };
}

function defineAllowRule(sourceRole: string, onlyDependOnRoles: string[], message: string) {
  return {
    sourceRole,
    onlyDependOnRoles,
    message,
  };
}

function at(root: string, path: string): string {
  return `${root}/${path}`;
}

async function filterExistingPaths(paths: string[]): Promise<string[]> {
  const existing = await Promise.all(
    paths.map(async (path) => ((await pathExists(path)) ? path : null)),
  );
  return existing.filter((path): path is string => path !== null);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(resolve(repositoryRoot, path));
    return true;
  } catch {
    return false;
  }
}
