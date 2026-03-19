import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

type RunOptions = {
  dryRun?: boolean;
};

export async function runCommand(
  specPath: string,
  options: RunOptions,
): Promise<void> {
  const absolutePath = resolve(process.cwd(), specPath);
  await access(absolutePath);

  const spec = await readFile(absolutePath, "utf8");
  const title = findFirstHeading(spec) ?? absolutePath;

  if (options.dryRun) {
    process.stdout.write(`[dry-run] would execute workflow for "${title}"\n`);
    process.stdout.write(`[dry-run] source: ${absolutePath}\n`);
    return;
  }

  process.stdout.write(`Loaded spec: ${title}\n`);
  process.stdout.write(`Source: ${absolutePath}\n`);
  process.stdout.write("Next step: wire your analyzer, planner, and executor here.\n");
}

function findFirstHeading(spec: string): string | null {
  const match = spec.match(/^#\s+(.+)$/m);
  return match?.[1] ?? null;
}
