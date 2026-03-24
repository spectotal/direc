import type { QualityRoutineAdapter } from "./types.js";
import { createTestRunnerAdapter } from "./adapter-helpers.js";
import { hasNodeTool } from "./node-detection.js";
import { parseEslintOutput } from "./eslint-parser.js";
import { parsePrettierOutput, parseTypescriptDiagnostics } from "./node-parsers.js";

export function getNodeQualityAdapters(): QualityRoutineAdapter[] {
  return [
    createEslintAdapter(),
    createPrettierAdapter(),
    createTypescriptAdapter(),
    createVitestAdapter(),
    createJestAdapter(),
  ];
}

function createEslintAdapter(): QualityRoutineAdapter {
  return {
    id: "eslint",
    displayName: "ESLint",
    supportedFacets: ["js"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    detect(context) {
      if (!hasNodeTool(context, "eslint", ["eslint.config.js", "eslint.config.mjs", ".eslintrc"])) {
        return null;
      }

      return {
        adapter: "eslint",
        mode: "run",
        enabled: true,
        command: {
          command: "npm",
          args: ["exec", "--", "eslint", "--format", "json"],
        },
      };
    },
    parseRunResult(options) {
      return parseEslintOutput(options.repositoryRoot, options.execution);
    },
    parseReport(options) {
      return parseEslintOutput(options.repositoryRoot, {
        exitCode: 0,
        stdout: options.contents,
        stderr: "",
        timedOut: false,
        targetPaths: [],
        scopedToEventPaths: false,
      });
    },
  };
}

function createPrettierAdapter(): QualityRoutineAdapter {
  return {
    id: "prettier",
    displayName: "Prettier",
    supportedFacets: ["js", "css", "frontend"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    detect(context) {
      if (
        !hasNodeTool(context, "prettier", [
          ".prettierrc",
          ".prettierrc.json",
          ".prettierrc.js",
          "prettier.config.js",
        ])
      ) {
        return null;
      }

      return {
        adapter: "prettier",
        mode: "run",
        enabled: true,
        command: {
          command: "npm",
          args: ["exec", "--", "prettier", "--check"],
        },
      };
    },
    parseRunResult(options) {
      return parsePrettierOutput(options.repositoryRoot, options.execution);
    },
  };
}

function createTypescriptAdapter(): QualityRoutineAdapter {
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

function createVitestAdapter(): QualityRoutineAdapter {
  return createTestRunnerAdapter({
    id: "vitest",
    displayName: "Vitest",
    supportedFacets: ["js"],
    detect: (context) =>
      hasNodeTool(context, "vitest", ["vitest.config.ts", "vitest.config.js"])
        ? {
            adapter: "vitest",
            mode: "run",
            enabled: true,
            command: {
              command: "npm",
              args: ["exec", "--", "vitest", "--run", "--reporter=json"],
            },
          }
        : null,
  });
}

function createJestAdapter(): QualityRoutineAdapter {
  return createTestRunnerAdapter({
    id: "jest",
    displayName: "Jest",
    supportedFacets: ["js"],
    detect: (context) =>
      hasNodeTool(context, "jest", ["jest.config.js", "jest.config.ts"])
        ? {
            adapter: "jest",
            mode: "run",
            enabled: true,
            command: {
              command: "npm",
              args: ["exec", "--", "jest", "--runInBand", "--json"],
            },
          }
        : null,
  });
}
