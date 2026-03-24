import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfiguredAnalysisEnvironment, readDirecConfig, resolveAnalyzers } from "direc-engine";

type DoctorOptions = {
  extension?: string[];
};

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const configPath = resolve(cwd, ".direc/config.json");
  const defaultSpecPath = resolve(cwd, "specs/example.spec.md");

  const checks = await Promise.all([
    checkPath(configPath, "direc config"),
    checkPath(defaultSpecPath, "example spec"),
  ]);

  process.stdout.write(`Workspace: ${cwd}\n`);

  for (const check of checks) {
    process.stdout.write(`${check.ok ? "OK" : "MISS"} ${check.label}: ${check.path}\n`);
  }

  const config = await readDirecConfig(cwd);
  if (!config) {
    process.stdout.write("MISS analyzer resolution: missing .direc/config.json\n");
    return;
  }

  const environment = await loadConfiguredAnalysisEnvironment({
    repositoryRoot: cwd,
    config,
    cliExtensions: options.extension,
  });

  process.stdout.write(
    `Facets: ${environment.detectedFacets.map((facet) => facet.id).join(", ") || "none"}\n`,
  );

  process.stdout.write(`Workflow: ${config.workflow}\n`);
  process.stdout.write(
    `Configured analyzers: ${
      Object.entries(config.analyzers)
        .filter(([, entry]) => entry.enabled !== false)
        .map(([analyzerId]) => analyzerId)
        .join(", ") || "none"
    }\n`,
  );
  const resolution = await resolveAnalyzers({
    plugins: environment.analyzers,
    repositoryRoot: cwd,
    detectedFacets: environment.detectedFacets,
    config: config.analyzers,
  });

  process.stdout.write(
    `Runnable analyzers: ${resolution.enabled.map((entry) => entry.plugin.id).join(", ") || "none"}\n`,
  );
  process.stdout.write(
    `Quality routines: ${Object.keys(config.qualityRoutines ?? {}).join(", ") || "none"}\n`,
  );
  process.stdout.write(`Extensions: ${environment.extensionSources.join(", ") || "none"}\n`);
  if (config.automation) {
    process.stdout.write(
      `Automation: ${config.automation.mode}, ${config.automation.invocation}, ${config.automation.transport.kind}\n`,
    );
  } else {
    process.stdout.write(
      "MISS automation config: re-run `direc init --force` to seed automation defaults\n",
    );
  }

  if (resolution.disabled.length > 0) {
    for (const entry of resolution.disabled) {
      process.stdout.write(
        `SKIP ${entry.pluginId}: ${entry.reasons.map((reason) => reason.message).join("; ")}\n`,
      );
    }
  }
}

async function checkPath(
  path: string,
  label: string,
): Promise<{ ok: boolean; path: string; label: string }> {
  try {
    await access(path);
    return { ok: true, path, label };
  } catch {
    return { ok: false, path, label };
  }
}
