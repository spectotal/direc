import { access } from "node:fs/promises";
import { resolve } from "node:path";

export async function seedAnalyzerOptions(
  repositoryRoot: string,
  pluginId: string,
  options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (pluginId !== "js-architecture-drift") {
    return options;
  }

  const boundaryRules = await resolveBoundaryRules(repositoryRoot);
  if (boundaryRules.length === 0) {
    return options;
  }

  return {
    ...options,
    boundaryRules,
  };
}

async function resolveBoundaryRules(
  repositoryRoot: string,
): Promise<Array<{ from: string; disallow: string[]; message: string }>> {
  const candidates = [
    {
      paths: ["packages/cli/direc/src/lib", "packages/cli/direc/src/commands"],
      rule: {
        from: "packages/cli/direc/src/lib",
        disallow: ["packages/cli/direc/src/commands"],
        message: "CLI utility modules must not depend on command handlers.",
      },
    },
    {
      paths: [
        "packages/adapters/openspec/src/status.ts",
        "packages/adapters/openspec/src/watch.ts",
      ],
      rule: {
        from: "packages/adapters/openspec/src/status.ts",
        disallow: ["packages/adapters/openspec/src/watch.ts"],
        message: "OpenSpec status loading must not depend on watch orchestration.",
      },
    },
    {
      paths: [
        "packages/adapters/openspec/src/events.ts",
        "packages/adapters/openspec/src/watch.ts",
      ],
      rule: {
        from: "packages/adapters/openspec/src/events.ts",
        disallow: ["packages/adapters/openspec/src/watch.ts"],
        message: "OpenSpec event normalization must not depend on watch orchestration.",
      },
    },
  ];
  const rules = await Promise.all(
    candidates.map(async (candidate) => {
      const allPresent = await Promise.all(
        candidate.paths.map((path) => pathExists(resolve(repositoryRoot, path))),
      );
      return allPresent.every(Boolean) ? candidate.rule : null;
    }),
  );

  return rules.filter(
    (
      rule,
    ): rule is {
      from: string;
      disallow: string[];
      message: string;
    } => rule !== null,
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
