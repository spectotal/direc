import type { QualityRoutineAdapter } from "./types.js";
import { parseTypescriptDiagnostics } from "./node-parsers.js";

export function createTypescriptAdapter(): QualityRoutineAdapter {
  return {
    id: "typescript",
    displayName: "TypeScript",
    supportedFacets: ["js"],
    supportsScopedPaths: false,
    detect(context) {
      const tsconfigPath = context.scan.tsconfigPaths[0];

      if (!tsconfigPath) {
        return null;
      }

      return {
        adapter: "typescript",
        mode: "run",
        enabled: true,
        command: {
          command: "npm",
          args: ["exec", "--", "tsc", "--noEmit", "--pretty", "false", "-p", tsconfigPath],
        },
      };
    },
    parseRunResult(options) {
      const findings = parseTypescriptDiagnostics(options.repositoryRoot, options.execution);

      return {
        findings,
        metrics: {
          exitCode: options.execution.exitCode,
          findingCount: findings.length,
        },
        rawOutput: {
          stdout: options.execution.stdout,
          stderr: options.execution.stderr,
        },
      };
    },
  };
}
