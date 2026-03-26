import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ModuleRoleDefinition {
  role: string;
  description: string;
  match: string[];
}

export interface RoleBoundaryRule {
  sourceRole: string;
  onlyDependOnRoles: string[];
  message?: string;
}

export interface ComplexityThresholds {
  warningThreshold: number;
  errorThreshold: number;
}

export interface VizConfig {
  moduleRoles: ModuleRoleDefinition[];
  roleBoundaryRules: RoleBoundaryRule[];
  complexityThresholds: ComplexityThresholds;
}

export async function readVizConfig(repositoryRoot: string): Promise<VizConfig> {
  const configPath = resolve(repositoryRoot, ".direc", "config.json");
  let raw: Record<string, unknown>;

  try {
    const content = await readFile(configPath, "utf-8");
    raw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Could not read .direc/config.json at ${configPath}. Run \`direc init\` first.`,
    );
  }

  const analyzers = (raw.analyzers ?? {}) as Record<string, { options?: Record<string, unknown> }>;
  const driftOptions = analyzers["js-architecture-drift"]?.options ?? {};
  const complexityOptions = analyzers["js-complexity"]?.options ?? {};

  return {
    moduleRoles: Array.isArray(driftOptions.moduleRoles)
      ? (driftOptions.moduleRoles as ModuleRoleDefinition[])
      : [],
    roleBoundaryRules: Array.isArray(driftOptions.roleBoundaryRules)
      ? (driftOptions.roleBoundaryRules as RoleBoundaryRule[])
      : [],
    complexityThresholds: {
      warningThreshold:
        typeof complexityOptions.warningThreshold === "number"
          ? complexityOptions.warningThreshold
          : 20,
      errorThreshold:
        typeof complexityOptions.errorThreshold === "number"
          ? complexityOptions.errorThreshold
          : 35,
    },
  };
}
