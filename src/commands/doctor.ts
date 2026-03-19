import { access } from "node:fs/promises";
import { resolve } from "node:path";

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  const configPath = resolve(cwd, "direc.config.json");
  const defaultSpecPath = resolve(cwd, "specs/example.spec.md");

  const checks = await Promise.all([
    checkPath(configPath, "direc config"),
    checkPath(defaultSpecPath, "example spec"),
  ]);

  process.stdout.write(`Workspace: ${cwd}\n`);

  for (const check of checks) {
    process.stdout.write(`${check.ok ? "OK" : "MISS"} ${check.label}: ${check.path}\n`);
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
