import type { QualityRoutineAdapter } from "./types.js";
import { createTestRunnerAdapter } from "./adapter-helpers.js";
import { hasPythonTool } from "./python-detection.js";
import {
  parseBlackOutput,
  parseMypyOutput,
  parseRuffFormatOutput,
  parseRuffOutput,
} from "./python-parsers.js";

export function getPythonQualityAdapters(): QualityRoutineAdapter[] {
  return [
    createRuffAdapter(),
    createRuffFormatAdapter(),
    createBlackAdapter(),
    createMypyAdapter(),
    createPytestAdapter(),
  ];
}

function createRuffAdapter(): QualityRoutineAdapter {
  return {
    id: "ruff",
    displayName: "Ruff",
    supportedFacets: ["python"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    async detect(context) {
      if (!(await hasPythonTool(context, "ruff"))) {
        return null;
      }

      return {
        adapter: "ruff",
        mode: "run",
        enabled: true,
        command: {
          command: "python",
          args: ["-m", "ruff", "check", "--output-format", "json"],
        },
      };
    },
    parseRunResult(options) {
      return parseRuffOutput(options.repositoryRoot, options.execution);
    },
  };
}

function createRuffFormatAdapter(): QualityRoutineAdapter {
  return {
    id: "ruff-format",
    displayName: "Ruff Format",
    supportedFacets: ["python"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    async detect(context) {
      if (!(await hasPythonTool(context, "ruff-format"))) {
        return null;
      }

      return {
        adapter: "ruff-format",
        mode: "run",
        enabled: true,
        command: {
          command: "python",
          args: ["-m", "ruff", "format", "--check"],
        },
      };
    },
    parseRunResult(options) {
      return parseRuffFormatOutput(options.repositoryRoot, options.execution);
    },
  };
}

function createBlackAdapter(): QualityRoutineAdapter {
  return {
    id: "black",
    displayName: "Black",
    supportedFacets: ["python"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    async detect(context) {
      if (!(await hasPythonTool(context, "black"))) {
        return null;
      }

      return {
        adapter: "black",
        mode: "run",
        enabled: true,
        command: {
          command: "python",
          args: ["-m", "black", "--check", "--diff"],
        },
      };
    },
    parseRunResult(options) {
      return parseBlackOutput(options.repositoryRoot, options.execution);
    },
  };
}

function createMypyAdapter(): QualityRoutineAdapter {
  return {
    id: "mypy",
    displayName: "Mypy",
    supportedFacets: ["python"],
    supportsScopedPaths: true,
    defaultTargetPath: ".",
    async detect(context) {
      if (!(await hasPythonTool(context, "mypy"))) {
        return null;
      }

      return {
        adapter: "mypy",
        mode: "run",
        enabled: true,
        command: {
          command: "python",
          args: ["-m", "mypy", "--show-error-codes"],
        },
      };
    },
    parseRunResult(options) {
      return parseMypyOutput(options.repositoryRoot, options.execution);
    },
  };
}

function createPytestAdapter(): QualityRoutineAdapter {
  return createTestRunnerAdapter({
    id: "pytest",
    displayName: "Pytest",
    supportedFacets: ["python"],
    detect: async (context) =>
      (await hasPythonTool(context, "pytest"))
        ? {
            adapter: "pytest",
            mode: "run",
            enabled: true,
            command: {
              command: "python",
              args: ["-m", "pytest", "-q"],
            },
          }
        : null,
  });
}
