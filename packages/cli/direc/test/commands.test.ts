import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { WORKFLOW_IDS } from "@spectotal/direc-analysis-runtime";
import { doctorCommand } from "../src/commands/doctor.js";
import { initCommand } from "../src/commands/init.js";

test("initCommand writes js analyzer identifiers", { concurrency: false }, async () => {
  const repositoryRoot = await createFixtureRepository();
  const legacyStatePath = join(repositoryRoot, ".direc", "state.json");
  await mkdir(join(repositoryRoot, ".direc"), { recursive: true });
  await writeFile(legacyStatePath, '{"legacy":true}\n');
  const { output } = await captureStdout(() =>
    withWorkingDirectory(repositoryRoot, () => initCommand({})),
  );
  const config = JSON.parse(
    await readFile(join(repositoryRoot, ".direc", "config.json"), "utf8"),
  ) as {
    facets: string[];
    workflow: string;
    qualityRoutines?: Record<string, unknown>;
    analyzers: Record<
      string,
      { enabled: boolean; options?: { moduleRoles?: unknown[]; roleBoundaryRules?: unknown[] } }
    >;
    automation: {
      mode: string;
      invocation: string;
      transport: {
        kind: string;
      };
      triggers: {
        snapshotEvents: boolean;
      };
    };
  };

  assert.match(output, /Detected facets: js/);
  assert.match(output, /Workflow: direc/);
  assert.match(output, /Quality routines: typescript/);
  assert.match(output, /Automation: advisory, hybrid, command/);
  assert.deepEqual(config.facets, ["js"]);
  assert.equal(config.workflow, WORKFLOW_IDS.DIREC);
  assert.deepEqual(Object.keys(config.qualityRoutines ?? {}), ["typescript"]);
  assert.deepEqual(Object.keys(config.analyzers).sort(), [
    "js-architecture-drift",
    "js-complexity",
    "routine:typescript",
  ]);
  assert.deepEqual(config.analyzers["js-architecture-drift"]?.options?.moduleRoles, []);
  assert.deepEqual(config.analyzers["js-architecture-drift"]?.options?.roleBoundaryRules, []);
  assert.equal(config.automation.mode, "advisory");
  assert.equal(config.automation.invocation, "hybrid");
  assert.equal(config.automation.transport.kind, "command");
  assert.equal(config.automation.triggers.snapshotEvents, true);
  assert.equal(await readFile(legacyStatePath, "utf8"), '{"legacy":true}\n');
});

test("doctorCommand reports configured js analyzers", { concurrency: false }, async () => {
  const repositoryRoot = await createFixtureRepository();
  await mkdir(join(repositoryRoot, ".direc"), { recursive: true });
  await mkdir(join(repositoryRoot, "specs"), { recursive: true });
  await writeFile(join(repositoryRoot, "specs", "example.spec.md"), "# Example Spec\n");
  await writeFile(
    join(repositoryRoot, ".direc", "config.json"),
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        facets: ["js"],
        workflow: WORKFLOW_IDS.OPENSPEC,
        analyzers: {
          "js-complexity": {
            enabled: true,
          },
          "js-architecture-drift": {
            enabled: true,
          },
        },
        automation: {
          enabled: true,
          mode: "advisory",
          invocation: "hybrid",
          failurePolicy: "continue",
          transport: {
            kind: "command",
            command: process.execPath,
            args: ["./fake-subagent.js"],
          },
          triggers: {
            snapshotEvents: true,
            workItemTransitions: true,
            artifactTransitions: false,
            changeCompleted: true,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(join(repositoryRoot, "specs", "example.spec.md"), "# Example Spec\n");

  const { output } = await captureStdout(() =>
    withWorkingDirectory(repositoryRoot, () => doctorCommand()),
  );
  const config = JSON.parse(
    await readFile(join(repositoryRoot, ".direc", "config.json"), "utf8"),
  ) as {
    analyzers: Record<string, unknown>;
    facets: string[];
  };

  assert.match(output, /Facets: js/);
  assert.match(output, /Workflow: openspec/);
  assert.match(
    output,
    /Configured analyzers: js-complexity, js-architecture-drift|Configured analyzers: js-architecture-drift, js-complexity/,
  );
  assert.match(output, /Runnable analyzers: /);
  assert.match(output, /Quality routines: none/);
  assert.match(output, /Automation: advisory, hybrid, command/);
  assert.deepEqual(config.facets, ["js"]);
  assert.deepEqual(Object.keys(config.analyzers).sort(), [
    "js-architecture-drift",
    "js-complexity",
  ]);
});

async function createFixtureRepository(): Promise<string> {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-"));

  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture-repo",
        private: true,
        type: "module",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(repositoryRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const demo = 1;\n");

  return repositoryRoot;
}

async function withWorkingDirectory<T>(directory: string, run: () => Promise<T>): Promise<T> {
  const previousDirectory = process.cwd();
  process.chdir(directory);

  try {
    return await run();
  } finally {
    process.chdir(previousDirectory);
  }
}

async function captureStdout<T>(run: () => Promise<T>): Promise<{ output: string; result: T }> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write;

  process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    const callback = args.find(
      (value): value is (error?: Error | null) => void => typeof value === "function",
    );
    callback?.();
    return true;
  }) as typeof process.stdout.write;

  try {
    const result = await run();
    return {
      output: chunks.join(""),
      result,
    };
  } finally {
    process.stdout.write = originalWrite;
  }
}
