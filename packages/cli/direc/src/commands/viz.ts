import { stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { generateViz } from "@spectotal/direc-viz";
import { exec } from "node:child_process";

type VizOptions = {
  out: string;
  open?: boolean;
};

async function findDirecRoot(startDir: string): Promise<string> {
  let current = startDir;
  while (true) {
    try {
      await stat(resolve(current, ".direc", "config.json"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new Error("Could not find .direc/ directory. Run `direc init` first.");
      }
      current = parent;
    }
  }
}

function openBrowser(filePath: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${filePath}"`
      : process.platform === "win32"
        ? `start "" "${filePath}"`
        : `xdg-open "${filePath}"`;
  exec(cmd);
}

const DEFAULT_FILENAME = "direc-report.html";

async function resolveOutPath(raw: string): Promise<string> {
  const resolved = resolve(process.cwd(), raw);

  // Explicit directory separator at the end → treat as directory
  if (raw.endsWith("/") || raw.endsWith("\\")) {
    return resolve(resolved, DEFAULT_FILENAME);
  }

  // Path already exists as a directory
  try {
    const s = await stat(resolved);
    if (s.isDirectory()) {
      return resolve(resolved, DEFAULT_FILENAME);
    }
  } catch {
    // doesn't exist yet — treat as a file path, mkdir will create parents
  }

  return resolved;
}

export async function vizCommand(options: VizOptions): Promise<void> {
  const repositoryRoot = await findDirecRoot(process.cwd());
  const outPath = await resolveOutPath(options.out);

  await generateViz(repositoryRoot, outPath);

  process.stdout.write(`Visualization written to: ${outPath}\n`);

  if (options.open) {
    openBrowser(outPath);
  }
}
