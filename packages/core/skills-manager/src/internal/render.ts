import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveBundledPartialsDirectory } from "./catalog.js";

const PARTIAL_INCLUDE_PATTERN = /\{\{\s*>\s*([a-z0-9-]+)\s*\}\}/gi;
const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_-]+)\s*\}\}/gi;

export async function loadPartials(): Promise<Map<string, string>> {
  const partialsRoot = await resolveBundledPartialsDirectory();
  const partials = new Map<string, string>();
  const entries = await readdir(partialsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    partials.set(
      entry.name.replace(/\.md$/u, ""),
      await readFile(join(partialsRoot, entry.name), "utf8"),
    );
  }

  return partials;
}

export function renderTemplate(
  content: string,
  partials: Map<string, string>,
  variables: Record<string, string>,
): string {
  return content
    .replace(PARTIAL_INCLUDE_PATTERN, (_, name: string) => {
      const partial = partials.get(name);
      if (partial === undefined) {
        throw new Error(`Unknown skill partial: ${name}`);
      }
      return partial;
    })
    .replace(VARIABLE_PATTERN, (match, name: string) => variables[name] ?? match);
}
