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

export async function vizCommand(options: VizOptions): Promise<void> {
  const repositoryRoot = await findDirecRoot(process.cwd());
  const outPath = resolve(process.cwd(), options.out);

  await generateViz(repositoryRoot, outPath);

  process.stdout.write(`Visualization written to: ${outPath}\n`);

  if (options.open) {
    openBrowser(outPath);
  }
}
