import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModuleRoleDefinition, RoleBoundaryRule } from "direc-plugin-js-architecture-drift";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(repositoryRoot, ".direc", "config.json");

const cliRoot = "packages/cli/direc/src";
const engineRoot = "packages/core/direc-engine/src";

const cliRoles = ["cli-command-surface", "cli-output-formatting", "cli-public-api"] as const;
const engineInternalRoles = [
  "engine-config-bootstrap",
  "engine-extension-loading",
  "engine-analyzer-registry",
  "engine-quality-routines",
  "engine-runtime-assembly",
  "engine-analysis-execution",
  "engine-automation-execution",
] as const;

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
    defineRole("workflow-adapter-module", "Concrete workflow adapter modules.", [
      "packages/adapters",
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
  const activeRoles = new Set(moduleRoles.map((role) => role.role));
  const templates = [
    defineRule(
      ["cli-output-formatting"],
      ["cli-command-surface", "engine-public-api", ...engineInternalRoles],
      "CLI output helpers must stay presentation-only and must not depend on commands or engine internals.",
    ),
    defineRule(
      ["cli-command-surface"],
      [...engineInternalRoles, "workflow-adapter-module"],
      "CLI commands must stay above engine internals and workflow adapters.",
    ),
    defineRule(
      ["cli-public-api"],
      [...engineInternalRoles, "workflow-adapter-module"],
      "CLI public entrypoints must stay thin and must not reach into engine internals or adapters.",
    ),
    defineRule(
      ["engine-public-api"],
      [...cliRoles],
      "The engine public API must not depend on CLI modules.",
    ),
    defineRule(
      [...engineInternalRoles],
      [...cliRoles, "engine-public-api"],
      "Engine internals must not depend on CLI modules or on the engine barrel.",
    ),
    defineRule(
      [
        "engine-config-bootstrap",
        "engine-extension-loading",
        "engine-analyzer-registry",
        "engine-quality-routines",
      ],
      ["engine-runtime-assembly", "engine-analysis-execution", "engine-automation-execution"],
      "Lower-level engine modules must not depend on orchestration entrypoints.",
    ),
    defineRule(
      ["engine-analysis-execution", "engine-automation-execution"],
      ["engine-runtime-assembly"],
      "Execution runners must consume prepared inputs and must not assemble runtime environments.",
    ),
    defineRule(
      ["core-runtime"],
      [...cliRoles, "engine-public-api", ...engineInternalRoles, "workflow-adapter-module"],
      "Core runtimes must stay independent from CLI composition, engine orchestration, and concrete adapters.",
    ),
    defineRule(
      ["workflow-contract"],
      [...cliRoles, "engine-public-api", ...engineInternalRoles, "workflow-adapter-module"],
      "Workflow contracts must remain independent from CLI, engine orchestration, and adapters.",
    ),
    defineRule(
      ["workflow-adapter-module"],
      [...cliRoles, "engine-public-api", ...engineInternalRoles],
      "Workflow adapters must not depend on CLI modules or engine internals.",
    ),
    defineRule(
      ["workflow-public-entry"],
      ["workflow-event-shaper", "workflow-change-loader"],
      "Workflow public entrypoints must stay thin and delegate through orchestrators or shared types.",
    ),
    defineRule(
      ["workflow-event-shaper"],
      ["workflow-public-entry", "workflow-orchestrator", "workflow-change-loader"],
      "Workflow event shapers must stay leaf-level and must not orchestrate workflow loading.",
    ),
    defineRule(
      ["workflow-change-loader"],
      ["workflow-public-entry", "workflow-orchestrator", "workflow-event-shaper"],
      "Workflow change loaders must stay leaf-level and must not normalize events or orchestrate adapters.",
    ),
    defineRule(
      ["workflow-shared-types"],
      [
        "workflow-public-entry",
        "workflow-orchestrator",
        "workflow-event-shaper",
        "workflow-change-loader",
      ],
      "Workflow shared type modules must stay dependency-light.",
    ),
  ];

  return templates.flatMap((rule) => {
    const fromRoles = rule.fromRoles.filter((role) => activeRoles.has(role));
    const disallowRoles = rule.disallowRoles.filter((role) => activeRoles.has(role));

    if (fromRoles.length === 0 || disallowRoles.length === 0) {
      return [];
    }

    return [
      {
        fromRoles,
        disallowRoles,
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

function defineRule(fromRoles: string[], disallowRoles: string[], message: string) {
  return {
    fromRoles,
    disallowRoles,
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
