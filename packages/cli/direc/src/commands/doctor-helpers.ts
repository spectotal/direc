import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfiguredAnalysisEnvironment, readDirecConfig, resolveAnalyzers } from "direc-engine";

export type WorkspaceCheck = {
  ok: boolean;
  path: string;
  label: string;
};

export type DoctorReport = {
  repositoryRoot: string;
  checks: WorkspaceCheck[];
  config: Awaited<ReturnType<typeof readDirecConfig>>;
  environment?: Awaited<ReturnType<typeof loadConfiguredAnalysisEnvironment>>;
  resolution?: Awaited<ReturnType<typeof resolveAnalyzers>>;
};

export async function loadDoctorReport(
  repositoryRoot: string,
  extension?: string[],
): Promise<DoctorReport> {
  const checks = await collectWorkspaceChecks(repositoryRoot);
  const config = await readDirecConfig(repositoryRoot);

  if (!config) {
    return {
      repositoryRoot,
      checks,
      config,
    };
  }

  const environment = await loadConfiguredAnalysisEnvironment({
    repositoryRoot,
    config,
    cliExtensions: extension,
  });
  const resolution = await resolveAnalyzers({
    plugins: environment.analyzers,
    repositoryRoot,
    detectedFacets: environment.detectedFacets,
    config: config.analyzers,
  });

  return {
    repositoryRoot,
    checks,
    config,
    environment,
    resolution,
  };
}

async function collectWorkspaceChecks(repositoryRoot: string): Promise<WorkspaceCheck[]> {
  const configPath = resolve(repositoryRoot, ".direc/config.json");
  const defaultSpecPath = resolve(repositoryRoot, "specs/example.spec.md");

  return Promise.all([
    checkPath(configPath, "direc config"),
    checkPath(defaultSpecPath, "example spec"),
  ]);
}

async function checkPath(path: string, label: string): Promise<WorkspaceCheck> {
  try {
    await access(path);
    return { ok: true, path, label };
  } catch {
    return { ok: false, path, label };
  }
}
